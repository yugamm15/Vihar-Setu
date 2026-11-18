/**
 * Safety Advisory Agent (Deterministic, strictly advisory)
 * NEVER overrides, delays, or blocks SOS, Start Gate, or Deviation Tiers.
 * Monitors battery, network, GPS accuracy, and hold activity.
 */
export const SafetyAgent = {
  analyze({
    deviationTier = 0,
    deviationDistanceMeters = 0,
    batteryPercentage = 100,
    isCharging = false,
    networkStatus = 'ONLINE',
    gpsAccuracyMeters = 5,
    holdActive = false,
    holdDurationMinutes = 0,
  }) {
    const findings = [];

    // FACT: Safety telemetry status
    findings.push({
      type: 'FACT',
      code: 'SAFETY_SYSTEMS',
      detail: `Battery: ${batteryPercentage}%${isCharging ? ' (Charging)' : ''} · Network: ${networkStatus} · GPS Accuracy: ±${Math.round(gpsAccuracyMeters)}m.`,
    });

    // Battery checks
    if (batteryPercentage <= 10 && !isCharging) {
      findings.push({
        type: 'RECOMMENDATION',
        code: 'SAFETY_BATTERY_CRITICAL',
        detail: 'Battery critically low (≤10%). Connect power bank immediately to prevent tracking shutdown.',
      });
    } else if (batteryPercentage <= 20 && !isCharging) {
      findings.push({
        type: 'RECOMMENDATION',
        code: 'SAFETY_BATTERY_LOW',
        detail: 'Battery low (≤20%). Limit screen usage and prepare portable charger.',
      });
    }

    // Network connectivity
    if (networkStatus !== 'ONLINE') {
      findings.push({
        type: 'PREDICTION',
        code: 'SAFETY_OFFLINE_NOTICE',
        detail: 'Device is offline. All telemetry is securely queued locally and will auto-sync when connection restores.',
      });
    }

    // GPS Signal Quality
    if (gpsAccuracyMeters > 30) {
      findings.push({
        type: 'RECOMMENDATION',
        code: 'SAFETY_GPS_WEAK',
        detail: 'GPS accuracy is degraded due to high-rise structures or overpasses. Keep phone away from metallic objects.',
      });
    }

    // Route Deviation Advisory
    if (deviationTier === 1) {
      findings.push({
        type: 'RECOMMENDATION',
        code: 'SAFETY_DEV_TIER1',
        detail: `Slight deviation (${deviationDistanceMeters}m). Please return towards the highlighted route path.`,
      });
    } else if (deviationTier === 2) {
      findings.push({
        type: 'RECOMMENDATION',
        code: 'SAFETY_DEV_TIER2',
        detail: `Significant deviation (${deviationDistanceMeters}m). Admin alert triggered. Rejoin planned route or tap 'I Changed Route'.`,
      });
    }

    // Hold Activity
    if (holdActive && holdDurationMinutes > 20) {
      findings.push({
        type: 'RECOMMENDATION',
        code: 'SAFETY_HOLD_LONG',
        detail: `Vihar on hold for ${holdDurationMinutes} mins. If continuing, remember to tap 'Resume Vihar'.`,
      });
    }

    return findings;
  },
};
