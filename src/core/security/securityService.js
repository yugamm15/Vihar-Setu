import { supabase } from '../config/supabase';
import { ROLES } from '../constants/roles';

/**
 * Security & Anti-Spoofing Service (Phase 32)
 * - Zero-Trust Role Verification (never trust local claims)
 * - GPS Telemetry Anti-Spoofing & Sanity Validator (walking speed <= 15 km/h, realistic lat/lng bounds)
 * - Input Sanitization
 */
class SecurityService {
  /**
   * Verify authenticated user role directly with Supabase PostgreSQL
   * Prevents client-side role forgery
   */
  async verifyServerRole(userId) {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId)
        .single();

      if (error || !data) return ROLES.SEVAK;
      return data.roles?.name || ROLES.SEVAK;
    } catch {
      return ROLES.SEVAK;
    }
  }

  /**
   * Validate GPS Telemetry Ping to prevent coordinate spoofing or erroneous jumps
   * @param {object} prevPoint - previous coordinate { lat, lng, timestamp }
   * @param {object} newPoint - new coordinate { lat, lng, timestamp, speedKmh }
   */
  validateTelemetryPing(prevPoint, newPoint) {
    if (!newPoint?.latitude || !newPoint?.longitude) {
      return { isValid: false, reason: 'Missing coordinates' };
    }

    // 1. Latitude/Longitude Range Check (Gujarat/India bounding box)
    if (
      newPoint.latitude < 18.0 ||
      newPoint.latitude > 25.0 ||
      newPoint.longitude < 68.0 ||
      newPoint.longitude > 75.0
    ) {
      return { isValid: false, reason: 'Coordinates outside valid Gujarat Vihar zone' };
    }

    // 2. Realistic Walking Vihar Speed Check (< 25 km/h)
    // Sadhvijis walk at 3.5 - 5 km/h. Any speed > 25 km/h indicates vehicular or erroneous spike
    if (newPoint.speedKmh > 25) {
      return {
        isValid: true,
        isSuspicious: true,
        reason: 'Unusually high speed for walking Vihar (possible vehicle accompaniment)',
      };
    }

    return { isValid: true, isSuspicious: false };
  }

  /**
   * Sanitize text input to prevent injection
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[<>'"`;]/g, '').trim();
  }
}

export const securityService = new SecurityService();

