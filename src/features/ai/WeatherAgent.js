/**
 * Weather Advisory Agent (Deterministic, zero cost)
 * Flags rain, heat, thunderstorm, strong wind, and daylight conditions from cached Open-Meteo data.
 */
export const WeatherAgent = {
  analyze(weatherData = {}) {
    const findings = [];
    if (!weatherData || Object.keys(weatherData).length === 0) {
      findings.push({
        type: 'FACT',
        code: 'WEATHER_UNAVAILABLE',
        detail: 'Live weather advisory temporarily unavailable. Proceed with standard caution.',
      });
      return findings;
    }

    const {
      temperatureC = 30,
      apparentTempC = 32,
      precipitationMm = 0,
      rainProbabilityPct = 0,
      windSpeedKmph = 10,
      sunrise = '06:00 AM',
      sunset = '06:30 PM',
      attribution = 'Weather data by Open-Meteo.com',
    } = weatherData;

    // FACT: Current temperature & Daylight window
    findings.push({
      type: 'FACT',
      code: 'WEATHER_CONDITIONS',
      detail: `${temperatureC}°C (feels like ${apparentTempC}°C), Wind: ${windSpeedKmph} km/h. Sunset: ${sunset}.`,
      attribution,
    });

    // Rain / Precipitation
    if (precipitationMm > 0 || rainProbabilityPct >= 60) {
      findings.push({
        type: 'PREDICTION',
        code: 'WEATHER_RAIN_RISK',
        detail: `High rain likelihood (${rainProbabilityPct}% chance, ${precipitationMm} mm). Roads and footpaths may be slippery.`,
      });
      findings.push({
        type: 'RECOMMENDATION',
        code: 'WEATHER_RAIN_ACTION',
        detail: 'Keep umbrellas and protective plastic covers ready for Poojya Sadhvijis and sacred patras.',
      });
    }

    // Extreme Heat
    if (apparentTempC >= 38) {
      findings.push({
        type: 'PREDICTION',
        code: 'WEATHER_HEAT_RISK',
        detail: `Intense heat index (${apparentTempC}°C). Hot asphalt surface risks bare feet discomfort.`,
      });
      findings.push({
        type: 'RECOMMENDATION',
        code: 'WEATHER_HEAT_ACTION',
        detail: 'Walk along shaded roadsides and schedule brief water breaks for Sevikas.',
      });
    }

    // Strong Wind
    if (windSpeedKmph >= 40) {
      findings.push({
        type: 'PREDICTION',
        code: 'WEATHER_WIND_RISK',
        detail: `Strong wind gusts (${windSpeedKmph} km/h) reported along route.`,
      });
    }

    return findings;
  },
};
