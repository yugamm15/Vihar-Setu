/**
 * Jinaarya Vihar Setu — Multi-Agent AI Advisory Architecture (Phases 33, 34 & 35)
 *
 * MANDATORY SAFETY GOVERNANCE RULE:
 * This AI subsystem is strictly ADVISORY and ASSISTIVE.
 * It NEVER intercepts, delays, alters, or overrides deterministic safety logic
 * (112 police dialing, SOS broadcast, deviation alarms, battery alerts).
 */

class ViharAiAdvisorService {
  /**
   * Agent 1: Vihar Companion & Rest Advisor (For Sevaks)
   * Analyzes elapsed distance and time to suggest timely Jain Upashray rest stops
   */
  getCompanionAdvice({ distanceKm = 0, elapsedMins = 0, currentHold = null }) {
    if (currentHold) {
      return {
        title: 'Resting in Peace',
        tip: 'Ensure Sadhvijis are hydrated and refreshed before resuming the next leg of the Vihar.',
        category: 'REST',
      };
    }

    if (distanceKm >= 4.0 || elapsedMins >= 60) {
      return {
        title: 'Recommended Upashray Rest',
        tip: 'You have covered over 4 km of continuous accompaniment. A brief 10-minute rest or Gochari stop at the next Upashray is recommended.',
        category: 'REST_RECOMMENDED',
      };
    }

    if (elapsedMins >= 30 && distanceKm < 1.5) {
      return {
        title: 'Gentle Pace Observed',
        tip: 'Walking cadence is serene. Stay mindful of oncoming morning traffic on major corridors.',
        category: 'SAFETY_NOTICE',
      };
    }

    return {
      title: 'Vihar Accompaniment Active',
      tip: 'Maintaining optimal safe pace. Keep phone charged and within reach.',
      category: 'NORMAL',
    };
  }

  /**
   * Agent 2: Route Safety Sentinel (Anomaly & Hazard Advisor)
   * Evaluates early morning road risks (low visibility, high speed traffic)
   */
  evaluateRouteSafety({ currentHour = new Date().getHours(), weather = 'CLEAR' }) {
    const isEarlyMorning = currentHour >= 4 && currentHour < 7;
    const isLateEvening = currentHour >= 18 && currentHour < 21;

    if (isEarlyMorning) {
      return {
        riskLevel: 'MODERATE_VISIBILITY',
        caution: 'Pre-dawn walking: Please ensure safety reflective vests or flashlights are visible to early commuters.',
        recommendedActions: ['Keep group together', 'Walk facing oncoming traffic where sidewalk is unavailable'],
      };
    }

    if (isLateEvening) {
      return {
        riskLevel: 'LOW_LIGHT',
        caution: 'Dusk accompaniment: Stay on well-lit main corridors. Avoid unlit inner bypasses.',
        recommendedActions: ['Maintain active companion contact', 'Enable strobe light if approaching dark stretches'],
      };
    }

    return {
      riskLevel: 'SAFE',
      caution: 'Daylight visibility optimal. Ensure sun protection and hydration for Sadhvijis.',
      recommendedActions: ['Regular hydration checks'],
    };
  }

  /**
   * Agent 3: Admin Operations Coordinator (For Surat Control Room)
   * Synthesizes fleet status and identifies Vihars eligible for duty handovers
   */
  getAdminFleetInsights(activeVihars = []) {
    const total = activeVihars.length;
    const onHold = activeVihars.filter((v) => v.status === 'HOLD').length;
    const longAccompaniments = activeVihars.filter(
      (v) => (Number(v.total_distance_km) || 0) >= 6.0
    ).length;

    let summary = `Managing ${total} active Vihar corridor(s) in Surat.`;
    if (onHold > 0) {
      summary += ` ${onHold} unit(s) currently taking rest/Upashray Darshan.`;
    }
    if (longAccompaniments > 0) {
      summary += ` ${longAccompaniments} Sevika(s) approaching 6km fatigue threshold; prepare regional handover support.`;
    }

    return {
      totalVihars: total,
      onHoldCount: onHold,
      fatigueAttentionCount: longAccompaniments,
      operationalBrief: summary,
    };
  }
}

export const viharAiAdvisorService = new ViharAiAdvisorService();

