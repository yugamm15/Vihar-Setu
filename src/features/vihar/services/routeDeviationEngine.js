import { supabase } from '../../../core/config/supabase';
import { offlineSyncService } from './offlineSyncService';
import { voiceAlertService } from '../../../core/services/voiceAlertService';

/**
 * Route Deviation States per PART B Master Bible (Section B12)
 */
export const DEVIATION_STATUS = {
  ON_TRACK: 'ON_TRACK',
  TIER_1_LOCAL_WARNING: 'TIER_1_LOCAL_WARNING', // > 100m sustained
  TIER_2_ADMIN_ALARM: 'TIER_2_ADMIN_ALARM',     // > 500m
  TIER_3_CRITICAL_EMERGENCY: 'TIER_3_CRITICAL_EMERGENCY', // > 1000m (1 km)
  HOLD_BYPASS: 'HOLD_BYPASS', // Hold is active, deviation check paused
};

/**
 * Haversine formula to compute great-circle distance between two points in meters
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate cross-track distance (perpendicular distance in meters)
 * from point P to line segment AB.
 */
export const calculatePerpendicularDistance = (pLat, pLon, aLat, aLon, bLat, bLon) => {
  const lineDist = calculateDistanceMeters(aLat, aLon, bLat, bLon);
  if (lineDist === 0) return calculateDistanceMeters(pLat, pLon, aLat, aLon);

  // Vector AB and AP projected in approximate planar coordinates
  const x = (bLon - aLon) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  const y = bLat - aLat;
  const px = (pLon - aLon) * Math.cos(((aLat + pLat) / 2) * (Math.PI / 180));
  const py = pLat - aLat;

  const t = Math.max(0, Math.min(1, (px * x + py * y) / (x * x + y * y)));
  const projLat = aLat + t * (bLat - aLat);
  const projLon = aLon + t * (bLon - aLon);

  return calculateDistanceMeters(pLat, pLon, projLat, projLon);
};

class RouteDeviationEngine {
  constructor() {
    this.status = DEVIATION_STATUS.ON_TRACK;
    this.currentDeviationMeters = 0;
    this.deviationStartTime = null;
    this.tier2Escalated = false;
    this.tier3Escalated = false;
    this.listeners = new Set();
  }

  /**
   * Evaluate live coordinate against planned route/waypoints
   * @param {object} coords - { latitude, longitude }
   * @param {object} vihar - Vihar object with source_lat, source_lng, dest_lat, dest_lng
   * @param {boolean} isHoldActive - whether a temporary hold is in effect
   */
  evaluateLocation(coords, vihar, isHoldActive = false) {
    if (!coords || !vihar) return this.status;

    // If a hold is active (e.g. resting at Upashray), bypass deviation alerts
    if (isHoldActive) {
      this.status = DEVIATION_STATUS.HOLD_BYPASS;
      this.currentDeviationMeters = 0;
      this.deviationStartTime = null;
      this.tier2Escalated = false;
      this.tier3Escalated = false;
      this._notifyListeners();
      return this.status;
    }

    const oLat = vihar.source_lat || 21.1959;
    const oLon = vihar.source_lng || 72.7933;
    const dLat = vihar.dest_lat || 21.1442;
    const dLon = vihar.dest_lng || 72.7758;

    // Calculate cross-track deviation distance
    const distMeters = calculatePerpendicularDistance(
      coords.latitude,
      coords.longitude,
      oLat,
      oLon,
      dLat,
      dLon
    );

    this.currentDeviationMeters = Math.round(distMeters);
    const now = Date.now();

    // Hysteresis Return Margin (returns within 60m of planned route clears alerts)
    if (distMeters <= 60) {
      if (this.status !== DEVIATION_STATUS.ON_TRACK && this.deviationStartTime) {
        this._recordReturnToRoute(vihar.id, coords);
      }
      this.status = DEVIATION_STATUS.ON_TRACK;
      this.deviationStartTime = null;
      this.tier2Escalated = false;
      this.tier3Escalated = false;
    } else if (distMeters > 1000) {
      // TIER 3: CRITICAL EMERGENCY (> 1000m / 1 km)
      this.status = DEVIATION_STATUS.TIER_3_CRITICAL_EMERGENCY;
      if (!this.tier3Escalated) {
        this.tier3Escalated = true;
        this._triggerTier3CriticalEmergency(vihar.id, coords, distMeters);
      }
    } else if (distMeters > 500) {
      // TIER 2: LOUD ALARM & ADMIN PUSH ALERT (> 500m)
      this.status = DEVIATION_STATUS.TIER_2_ADMIN_ALARM;
      if (!this.tier2Escalated) {
        this.tier2Escalated = true;
        this._triggerTier2AdminEscalation(vihar.id, coords, distMeters);
      }
    } else if (distMeters > 100) {
      // TIER 1: GENTLE LOCAL ALERT (> 100m sustained)
      if (!this.deviationStartTime) {
        this.deviationStartTime = now;
      }
      this.status = DEVIATION_STATUS.TIER_1_LOCAL_WARNING;
      voiceAlertService.speakDeviationAlert(distMeters);
    }

    this._notifyListeners();
    return this.status;
  }

  /**
   * Log Return to Route Event
   */
  async _recordReturnToRoute(viharId, coords) {
    try {
      await offlineSyncService.queueRouteEvent({
        vihar_id: viharId,
        type: 'RETURN_TO_ROUTE',
        tier: 0,
        distance_meters: this.currentDeviationMeters,
        coords,
      });
    } catch (e) {
      console.warn('[RouteDeviationEngine] Error logging return to route:', e);
    }
  }

  /**
   * Trigger Tier 2 Admin Escalation (> 500m)
   */
  async _triggerTier2AdminEscalation(viharId, coords, deviationMeters) {
    try {
      voiceAlertService.speakDeviationAlert(deviationMeters);

      await offlineSyncService.queueRouteEvent({
        vihar_id: viharId,
        type: 'TIER_2_ADMIN_ALERT',
        tier: 2,
        distance_meters: Math.round(deviationMeters),
        coords,
      });

      await supabase.from('notifications').insert({
        user_id: null,
        type: 'DEVIATION_TIER_2',
        title: 'Route Deviation Alert (>500m)',
        body: `Sevak unit has deviated by ~${Math.round(deviationMeters)}m on Vihar route.`,
        data: { vihar_id: viharId, coords, deviation_meters: deviationMeters },
        priority: 'HIGH',
      });
    } catch (e) {
      console.warn('[RouteDeviationEngine] Error in Tier 2 escalation:', e);
    }
  }

  /**
   * Trigger Tier 3 Critical Emergency (> 1000m)
   */
  async _triggerTier3CriticalEmergency(viharId, coords, deviationMeters) {
    try {
      voiceAlertService.speakEmergencyTriggered();

      await offlineSyncService.queueRouteEvent({
        vihar_id: viharId,
        type: 'TIER_3_CRITICAL_EMERGENCY',
        tier: 3,
        distance_meters: Math.round(deviationMeters),
        coords,
      });

      // Insert Emergency Record
      await supabase.from('emergencies').insert({
        vihar_id: viharId,
        trigger_type: 'TIER_3_DEVIATION',
        latitude: coords.latitude,
        longitude: coords.longitude,
        status: 'ESCALATING',
        resolution_notes: `Automatic Tier 3 Emergency triggered: Departure of ${Math.round(deviationMeters)}m from planned route.`,
      });
    } catch (e) {
      console.warn('[RouteDeviationEngine] Error in Tier 3 emergency:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset() {
    this.status = DEVIATION_STATUS.ON_TRACK;
    this.currentDeviationMeters = 0;
    this.deviationStartTime = null;
    this.tier2Escalated = false;
    this.tier3Escalated = false;
    this._notifyListeners();
  }

  _notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn({
          status: this.status,
          currentDeviationMeters: this.currentDeviationMeters,
          tier2Escalated: this.tier2Escalated,
          tier3Escalated: this.tier3Escalated,
        });
      } catch (e) {
        console.error('[RouteDeviationEngine] Listener error:', e);
      }
    });
  }

  getStatus() {
    return {
      status: this.status,
      currentDeviationMeters: this.currentDeviationMeters,
      tier2Escalated: this.tier2Escalated,
      tier3Escalated: this.tier3Escalated,
    };
  }
}

export const routeDeviationEngine = new RouteDeviationEngine();
