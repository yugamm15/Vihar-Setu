import { supabase } from '../../../core/config/supabase';
import { calculateDistanceMeters } from './routeDeviationEngine';
import { offlineSyncService } from './offlineSyncService';

/**
 * Stationary Watchdog Service (Phase 19)
 * Detects prolonged stationary state (> 5 mins with < 15m movement) during active Vihar.
 * Prompts Sevak with "Are you safe?" Heartbeat verification.
 * Auto-escalates if unacknowledged within 90 seconds.
 * Bypasses alert if a planned Hold is active.
 */
class StationaryWatchdogService {
  constructor() {
    this.anchorPosition = null;
    this.anchorTimestamp = null;
    this.isAlertTriggered = false;
    this.escalated = false;
    this.listeners = new Set();
  }

  /**
   * Evaluate movement displacement
   * @param {object} coords - { latitude, longitude }
   * @param {object} vihar - active vihar
   * @param {boolean} isHoldActive - whether a hold is currently active
   */
  evaluateMovement(coords, vihar, isHoldActive = false) {
    if (!coords || !vihar) return;

    // If hold is active, reset stationary timer
    if (isHoldActive) {
      this.reset();
      return;
    }

    const now = Date.now();

    if (!this.anchorPosition || !this.anchorTimestamp) {
      this.anchorPosition = coords;
      this.anchorTimestamp = now;
      return;
    }

    const dist = calculateDistanceMeters(
      this.anchorPosition.latitude,
      this.anchorPosition.longitude,
      coords.latitude,
      coords.longitude
    );

    // If moved > 15m, user is actively moving -> reset anchor
    if (dist >= 15) {
      this.anchorPosition = coords;
      this.anchorTimestamp = now;
      if (this.isAlertTriggered) {
        this.isAlertTriggered = false;
        this._notifyListeners({ type: 'DISARMED', reason: 'Movement resumed' });
      }
      return;
    }

    // Still within 15m: check elapsed time
    const elapsedMinutes = (now - this.anchorTimestamp) / (1000 * 60);

    // If stationary for > 5 minutes and alert not yet triggered
    if (elapsedMinutes >= 5 && !this.isAlertTriggered) {
      this.isAlertTriggered = true;
      this._notifyListeners({
        type: 'TRIGGER_SAFETY_CHECK',
        elapsedMinutes: Math.round(elapsedMinutes),
        coords,
      });
    }
  }

  /**
   * Handle user answering "I am Safe"
   */
  async acknowledgeSafe(userId, viharId, notes = 'Sevak confirmed safe') {
    this.isAlertTriggered = false;
    this.anchorTimestamp = Date.now();
    this.escalated = false;

    try {
      const payload = {
        user_id: userId,
        vihar_id: viharId,
        status: 'CONFIRMED_SAFE',
        response_time_seconds: 15,
        notes,
        created_at: new Date().toISOString(),
      };

      if (offlineSyncService.isOnline) {
        await supabase.from('safety_checks').insert(payload);
      } else {
        await offlineSyncService.enqueue('ROUTE_EVENT', {
          vihar_id: viharId,
          event_type: 'SAFETY_CHECK_CONFIRMED',
          message: notes,
        });
      }
    } catch (e) {
      console.warn('[StationaryWatchdog] Safe acknowledgement sync notice:', e);
    }

    this._notifyListeners({ type: 'ACKNOWLEDGED_SAFE' });
  }

  /**
   * Escalate to Admin when 90-second countdown expires without response
   */
  async escalateStationaryAlarm(vihar, coords) {
    if (this.escalated) return;
    this.escalated = true;

    try {
      const payload = {
        vihar_id: vihar.id,
        event_type: 'STATIONARY_UNRESPONSIVE',
        severity: 'CRITICAL',
        message: `STATIONARY ALERT: Sevak unresponsive for > 5 mins at (${coords?.latitude?.toFixed(4) || 'N/A'}, ${coords?.longitude?.toFixed(4) || 'N/A'}). No active hold registered.`,
        latitude: coords?.latitude || vihar.source_lat,
        longitude: coords?.longitude || vihar.source_lng,
        metadata: {
          vihar_id: vihar.id,
          reason: 'Stationary without active hold & unanswered heartbeat',
        },
      };

      if (offlineSyncService.isOnline) {
        await supabase.from('route_events').insert(payload);

        await supabase
          .from('vihars')
          .update({ safety_status: 'WARNING', updated_at: new Date().toISOString() })
          .eq('id', vihar.id);
      } else {
        await offlineSyncService.enqueue('ROUTE_EVENT', payload);
      }
    } catch (err) {
      console.warn('[StationaryWatchdog] Escalation warning:', err);
    }

    this._notifyListeners({ type: 'ESCALATED_TO_ADMIN' });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(event) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.warn('[StationaryWatchdog] Callback warning:', err);
      }
    });
  }

  reset() {
    this.anchorPosition = null;
    this.anchorTimestamp = Date.now();
    this.isAlertTriggered = false;
    this.escalated = false;
  }
}

export const stationaryWatchdogService = new StationaryWatchdogService();

