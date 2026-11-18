import { NavigationAgent } from './NavigationAgent';
import { WeatherAgent } from './WeatherAgent';
import { SafetyAgent } from './SafetyAgent';
import { CommunicationAgent } from './CommunicationAgent';

/**
 * AI Orchestrator (Zero budget, deterministic, advisory)
 * Merges multi-agent insights into a unified Vihar Briefing.
 * Safety Guarantee: Advisory only; cannot override, delay or block SOS, Start Gate, or deviation tiers.
 */
export const AiOrchestrator = {
  generateBriefing({
    navContext = {},
    weatherData = {},
    safetyContext = {},
    language = null,
  }) {
    try {
      const navFindings = NavigationAgent.analyze(navContext);
      const weatherFindings = WeatherAgent.analyze(weatherData);
      const safetyFindings = SafetyAgent.analyze(safetyContext);

      const allFindings = [...navFindings, ...weatherFindings, ...safetyFindings];
      const localized = CommunicationAgent.formatForSevika(allFindings, language);

      // Group into categories
      const facts = localized.filter((item) => item.type === 'FACT');
      const predictions = localized.filter((item) => item.type === 'PREDICTION');
      const recommendations = localized.filter((item) => item.type === 'RECOMMENDATION');

      return {
        isAvailable: true,
        items: localized,
        facts,
        predictions,
        recommendations,
        generatedAt: new Date().toISOString(),
        weatherAttribution: weatherData?.attribution || 'Weather data by Open-Meteo.com',
      };
    } catch (e) {
      console.warn('[AiOrchestrator] Briefing generation fallback:', e?.message);
      return {
        isAvailable: false,
        items: [
          {
            type: 'FACT',
            code: 'BRIEFING_UNAVAILABLE',
            text: 'Briefing currently unavailable. Proceed with standard seva guidelines.',
          },
        ],
        facts: [],
        predictions: [],
        recommendations: [],
        generatedAt: new Date().toISOString(),
      };
    }
  },
};
