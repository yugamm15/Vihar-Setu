import { distanceToPolyline, decodePolyline } from '../../../core/geo/geoUtils';
import { voiceAlertService } from '../../../core/services/voiceAlertService';
import { supabase } from '../../../core/config/supabase';

export const DEVIATION_TIERS = {
  ON_TRACK: 0,
  TIER_1: 1, // > 100m
  TIER_2: 2, // > 500m
  TIER_3: 3, // > 1000m (1 km)
};

class RouteDeviationEngine {
  constructor() {
    this.currentTier = DEVIATION_TIERS.ON_TRACK;
    this.currentDeviationMeters = 0;
    this.maxDeviationMeters = 0;
    this.deviationStartTime = null;
    this.sustainedTier = DEVIATION_TIERS.ON_TRACK;
    this.tierCandidateTime = null;
    this.currentRouteEventId = null;

    // Thresholds (configurable via system_settings)
    this.tier1Meters = 100;
    this.tier2Meters = 500;
    this.tier3Meters = 1000;
    this.sustainSeconds = 15;
    this.returnMarginMeters = 60;
    this.accuracyLimitMeters = 50;

    this.polylinePoints = []; // GeoJSON [lng, lat]
    this.listeners = new Set();
  }

  /**
   * Set active route geometry for distance checking
   */
  setRoute(encodedPolyline) {
    if (!encodedPolyline) return;
    this.polylinePoints = decodePolyline(encodedPolyline);
  }

  /**
   * Reset deviation engine state
   */
  reset() {
    this.currentTier = DEVIATION_TIERS.ON_TRACK;
    this.currentDeviationMeters = 0;
    this.maxDeviationMeters = 0;
    this.deviationStartTime = null;
    this.sustainedTier = DEVIATION_TIERS.ON_TRACK;
    this.tierCandidateTime = null;
    this.currentRouteEventId = null;
    this._notifyListeners();
  }

  /**
   * Evaluate a live GPS coordinate against the planned polyline
   * @param {object} coords - { latitude, longitude, accuracy }
   * @param {string} viharId
   * @param {boolean} isHoldActive
   */
  async evaluateLocation(coords, viharId, isHoldActive = false) {
    if (!coords || this.polylinePoints.length < 2) return this.currentTier;

    // Accuracy guard: Ignore noisy GPS fixes worse than 50m
    if (coords.accuracy && coords.accuracy > this.accuracyLimitMeters) {
      return this.currentTier;
    }

    // Bypass check if an authorized Hold is active
    if (isHoldActive) {
      return this.currentTier;
    }

    // Compute shortest perpendicular distance to route polyline
    const distMeters = distanceToPolyline(
      { latitude: coords.latitude, longitude: coords.longitude },
      this.polylinePoints
    );

    this.currentDeviationMeters = distMeters;
    if (distMeters > this.maxDeviationMeters) {
      this.maxDeviationMeters = distMeters;
    }

    const now = Date.now();

    // 1. Check Return Hysteresis (Distance dropped below 60m)
    if (distMeters < this.returnMarginMeters && this.currentTier > DEVIATION_TIERS.ON_TRACK) {
      await this._handleReturnToRoute(viharId, coords);
      return this.currentTier;
    }

    // 2. Determine Candidate Tier
    let candidateTier = DEVIATION_TIERS.ON_TRACK;
    if (distMeters >= this.tier3Meters) {
      candidateTier = DEVIATION_TIERS.TIER_3;
    } else if (distMeters >= this.tier2Meters) {
      candidateTier = DEVIATION_TIERS.TIER_2;
    } else if (distMeters >= this.tier1Meters) {
      candidateTier = DEVIATION_TIERS.TIER_1;
    }

    // 3. 15-Second Sustain Guard
    if (candidateTier > this.currentTier) {
      if (!this.tierCandidateTime || candidateTier !== this.sustainedTier) {
        this.sustainedTier = candidateTier;
        this.tierCandidateTime = now;
      } else {
        const sustainedDurationSec = (now - this.tierCandidateTime) / 1000;
        if (sustainedDurationSec >= this.sustainSeconds) {
          // Tier confirmed after 15 seconds continuous sustain!
          await this._triggerTierEscalation(candidateTier, viharId, coords);
        }
      }
    } else {
      this.tierCandidateTime = null;
    }

    this._notifyListeners();
    return this.currentTier;
  }

  /**
   * Handle escalation to Tier 1, 2, or 3
   */
  async _triggerTierEscalation(tier, viharId, coords) {
    this.currentTier = tier;
    this.tierCandidateTime = null;

    if (!this.deviationStartTime) {
      this.deviationStartTime = new Date();
    }

    if (tier === DEVIATION_TIERS.TIER_1) {
      // TIER 1: Gentle Alert (Voice + Vibration + Event)
      voiceAlertService.announce('ROUTE_DEVIATION_TIER1');
      try {
        const { data } = await supabase.rpc('record_route_event', {
          p_vihar_id: viharId,
          p_event_type: 'DEVIATION_START',
          p_severity: 'WARNING',
          p_message: `Route deviation Level 1: ${this.currentDeviationMeters}m from planned path.`,
          p_latitude: coords.latitude,
          p_longitude: coords.longitude,
          p_metadata: { distance_m: this.currentDeviationMeters, tier: 1 },
        });
        this.currentRouteEventId = data;
      } catch (e) {
        console.warn('[DeviationEngine] Record Tier 1 event failed:', e);
      }
    } else if (tier === DEVIATION_TIERS.TIER_2) {
      // TIER 2: Loud Alarm + Strong Voice + Admin Alert
      voiceAlertService.announce('ROUTE_DEVIATION_TIER2');
      try {
        await supabase.rpc('record_route_event', {
          p_vihar_id: viharId,
          p_event_type: 'DEVIATION_START',
          p_severity: 'WARNING',
          p_message: `Route deviation Level 2 (High): ${this.currentDeviationMeters}m from planned path.`,
          p_latitude: coords.latitude,
          p_longitude: coords.longitude,
          p_metadata: { distance_m: this.currentDeviationMeters, tier: 2 },
        });
      } catch (e) {
        console.warn('[DeviationEngine] Record Tier 2 event failed:', e);
      }
    } else if (tier === DEVIATION_TIERS.TIER_3) {
      // TIER 3: Critical Emergency (1 km deviation)
      voiceAlertService.announce('EMERGENCY_TRIGGERED');
      try {
        await supabase.rpc('create_emergency', {
          p_vihar_id: viharId,
          p_trigger_type: 'ROUTE_DEVIATION_1KM',
          p_latitude: coords.latitude,
          p_longitude: coords.longitude,
          p_battery_percentage: 100,
        });
      } catch (e) {
        console.warn('[DeviationEngine] Create Tier 3 emergency failed:', e);
      }
    }

    this._notifyListeners();
  }

  /**
   * Handle safe return to route (< 60m)
   */
  async _handleReturnToRoute(viharId, coords) {
    const prevTier = this.currentTier;
    this.currentTier = DEVIATION_TIERS.ON_TRACK;
    this.tierCandidateTime = null;

    if (this.deviationStartTime && prevTier < DEVIATION_TIERS.TIER_3) {
      const durationSeconds = Math.round((Date.now() - this.deviationStartTime.getTime()) / 1000);
      try {
        await supabase.rpc('record_route_event', {
          p_vihar_id: viharId,
          p_event_type: 'DEVIATION_END',
          p_severity: 'INFO',
          p_message: `Returned to route safely. Deviation resolved (max ${this.maxDeviationMeters}m, duration ${durationSeconds}s).`,
          p_latitude: coords.latitude,
          p_longitude: coords.longitude,
          p_metadata: {
            max_distance_m: this.maxDeviationMeters,
            duration_seconds: durationSeconds,
          },
        });
      } catch (e) {
        console.warn('[DeviationEngine] Close deviation event failed:', e);
      }
    }

    this.deviationStartTime = null;
    this.maxDeviationMeters = 0;
    this._notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners() {
    const snapshot = {
      tier: this.currentTier,
      distanceMeters: this.currentDeviationMeters,
      maxDistanceMeters: this.maxDeviationMeters,
      sustainedTier: this.sustainedTier,
    };
    this.listeners.forEach((fn) => fn(snapshot));
  }
}

export const routeDeviationEngine = new RouteDeviationEngine();
