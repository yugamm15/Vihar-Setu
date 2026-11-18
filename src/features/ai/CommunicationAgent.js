import { getAppLanguage } from '../../core/localization/i18n';

/**
 * Communication Advisory Agent (Zero cost, deterministic localization)
 * Translates advisory findings into concise messages for Sevika and Admins.
 */
export const CommunicationAgent = {
  formatForSevika(findings, lang = null) {
    const currentLang = lang || getAppLanguage() || 'gu';

    return findings.map((f) => {
      let localizedDetail = f.detail;

      // Gujarati overrides for key alerts
      if (currentLang === 'gu') {
        if (f.code === 'WEATHER_RAIN_RISK') {
          localizedDetail = 'વરસાદની શક્યતા છે. રસ્તાઓ લપસણા હોઈ શકે છે.';
        } else if (f.code === 'WEATHER_RAIN_ACTION') {
          localizedDetail = 'પૂજ્ય સાધ્વીજી ભગવંતો અને પાત્રો માટે છત્રી અને કવર તૈયાર રાખો.';
        } else if (f.code === 'WEATHER_HEAT_RISK') {
          localizedDetail = 'ગરમી વધારે છે. છાંયડાવાળા રસ્તે ચાલવાનો આગ્રહ રાખો.';
        } else if (f.code === 'SAFETY_BATTERY_LOW') {
          localizedDetail = 'બેટરી ઓછી છે (૨૦% નીચે). પાવર બેંક કનેક્ટ કરો.';
        } else if (f.code === 'SAFETY_DEV_TIER1') {
          localizedDetail = 'તમે વિહાર રૂટથી થોડા દૂર ગયા છો. કૃપા કરી નિર્ધારિત રૂટ પર પાછા ફરો.';
        } else if (f.code === 'NAV_BEHIND_SCHEDULE') {
          localizedDetail = 'નિર્ધારિત સમય કરતાં થોડો વિલંબ જણાય છે. શાંતિપૂર્વક વિહાર ચાલુ રાખો.';
        }
      } else if (currentLang === 'hi') {
        if (f.code === 'WEATHER_RAIN_RISK') {
          localizedDetail = 'बारिश की संभावना है। रास्ते फिसलन भरे हो सकते हैं।';
        } else if (f.code === 'WEATHER_RAIN_ACTION') {
          localizedDetail = 'पूज्य साध्वीजी भगवंतों और पात्रों के लिए छाता व सुरक्षा कवर तैयार रखें।';
        } else if (f.code === 'SAFETY_BATTERY_LOW') {
          localizedDetail = 'बैटरी कम है (२०% से कम)। कृपया पावर बैंक कनेक्ट करें।';
        } else if (f.code === 'SAFETY_DEV_TIER1') {
          localizedDetail = 'आप विहार मार्ग से थोड़ा विचलित हुए हैं। कृपया तय मार्ग पर लौटें।';
        }
      }

      return {
        type: f.type,
        code: f.code,
        text: localizedDetail,
        attribution: f.attribution,
      };
    });
  },
};
