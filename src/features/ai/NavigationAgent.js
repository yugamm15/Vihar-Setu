/**
 * Navigation Advisory Agent (Deterministic, zero cost)
 * Evaluates walking pace, ETA vs expected arrival, sunset timing, and route progress.
 */
export const NavigationAgent = {
  analyze({
    routeProgressMeters = 0,
    totalDistanceMeters = 0,
    currentSpeedKmph = 0,
    expectedArrivalTime = null,
    sunsetTime = null,
    walkingSpeedFallbackKmph = 4.5,
  }) {
    const findings = [];
    const remainingMeters = Math.max(0, totalDistanceMeters - routeProgressMeters);
    const effectiveSpeedKmph = currentSpeedKmph > 1.0 ? currentSpeedKmph : walkingSpeedFallbackKmph;
    const remainingHours = remainingMeters / (effectiveSpeedKmph * 1000);
    const etaMs = Date.now() + remainingHours * 3600 * 1000;
    const etaDate = new Date(etaMs);

    // FACT: Distance and Current Speed
    findings.push({
      type: 'FACT',
      code: 'NAV_PROGRESS',
      detail: `${(routeProgressMeters / 1000).toFixed(1)} km completed, ${(remainingMeters / 1000).toFixed(1)} km remaining at ${effectiveSpeedKmph.toFixed(1)} km/h.`,
    });

    // PREDICTION: Estimated Time of Arrival
    const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    findings.push({
      type: 'PREDICTION',
      code: 'NAV_ETA',
      detail: `Projected arrival at destination is ${etaString}.`,
      etaDate,
    });

    // Check Expected Arrival Target
    if (expectedArrivalTime) {
      const targetDate = new Date(expectedArrivalTime);
      if (etaDate.getTime() > targetDate.getTime()) {
        const delayMins = Math.round((etaDate.getTime() - targetDate.getTime()) / 60000);
        findings.push({
          type: 'RECOMMENDATION',
          code: 'NAV_BEHIND_SCHEDULE',
          detail: `Running approximately ${delayMins} min behind scheduled arrival. Maintain a steady pace without rushing.`,
        });
      } else {
        findings.push({
          type: 'FACT',
          code: 'NAV_ON_SCHEDULE',
          detail: 'On track to arrive before scheduled time.',
        });
      }
    }

    // Check Sunset Timing (Jain safety guideline: complete Vihar before sunset)
    if (sunsetTime) {
      const todayStr = new Date().toISOString().split('T')[0];
      const sunsetDate = new Date(`${todayStr} ${sunsetTime}`);
      if (!isNaN(sunsetDate.getTime()) && etaDate.getTime() > sunsetDate.getTime()) {
        findings.push({
          type: 'RECOMMENDATION',
          code: 'NAV_SUNSET_WARNING',
          detail: `Arrival may occur after sunset (${sunsetTime}). Ensure reflective safety jackets are worn and plan an intermediate upashray rest if necessary.`,
        });
      }
    }

    return findings;
  },
};
