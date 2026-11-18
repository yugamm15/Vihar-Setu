import { Vibration, Platform } from 'react-native';
import Tts from 'react-native-tts';

/**
 * Trilingual Voice Alert Messages (Gujarati, Hindi, English)
 */
export const VOICE_PROMPTS = {
  VIHAR_STARTED: {
    gu: 'વિહાર સેવા શરૂ થઈ છે. સુરક્ષા ટ્રેકિંગ સક્રિય છે.',
    hi: 'विहार सेवा प्रारंभ हो गई है। लाइव सुरक्षा ट्रैकिंग सक्रिय है।',
    en: 'Vihar started. Live safety tracking is active.',
  },
  ROUTE_DEVIATION_TIER1: {
    gu: 'તમે વિહાર રૂટથી થોડા દૂર ગયા છો. કૃપા કરી નિર્ધારિત રૂટ પર પાછા ફરો.',
    hi: 'आप निर्धारित विहार मार्ग से विचलित हो रहे हैं। कृपया तय मार्ग पर लौटें।',
    en: 'You have moved away from your Vihar route. Please return to the planned route.',
  },
  ROUTE_DEVIATION_TIER2: {
    gu: 'ચેતવણી! નોંધપાત્ર માર્ગ વિચલન! એડમિનને જાણ કરવામાં આવી છે.',
    hi: 'सावधान! महत्वपूर्ण मार्ग विचलन! एडमिन को सूचित कर दिया गया है।',
    en: 'Warning! Significant route deviation. Admin alert has been dispatched.',
  },
  EMERGENCY_TRIGGERED: {
    gu: 'સુરક્ષા એલર્ટ! સુરત કંટ્રોલ રૂમ અને ૧૧૨ ને જાણ કરવામાં આવી છે.',
    hi: 'सुरक्षा अलर्ट! आपातकालीन सहायता अनुरोध भेज दिया गया है।',
    en: 'Critical emergency SOS broadcast! Help has been dispatched.',
  },
  HOLD_STARTED: {
    gu: 'વિહાર અલ્પવિરામ પર મૂકવામાં આવ્યો છે.',
    hi: 'વિહાર अल्पવિશ્રામ પર રખા ગયા હૈ.',
    en: 'Vihar placed on temporary hold.',
  },
  HOLD_RESUMED: {
    gu: 'વિહાર સેવા પુનઃ શરૂ થઈ છે.',
    hi: 'વિહાર યાત્રા પુનઃ પ્રારંભ હો ગઈ હૈ.',
    en: 'Vihar resumed safely.',
  },
  SAFETY_CHECK: {
    gu: 'શું તમે સુરક્ષિત છો? કૃપા કરીને સ્ક્રીન પર પુષ્ટિ કરો.',
    hi: 'क्या आप सुरक्षित हैं? कृपया पुष्टि करें।',
    en: 'Are you safe? Please confirm on screen.',
  },
  HANDOVER_COMPLETE: {
    gu: 'વિહાર દાયિત્વ સફળતાપૂર્વક ટ્રાન્સફર થયું છે.',
    hi: 'વિહાર દાયિત્વ સફળતાપૂર્વક સ્થાનાંતરિત કર દિયા ગયા હૈ.',
    en: 'Vihar duty successfully handed over to verified volunteer.',
  },
};

class VoiceAlertService {
  constructor() {
    this.currentLanguage = 'gu'; // default Gujarati
    this.soundEnabled = true;
    this.ttsInitialized = false;

    this._initTts();
  }

  _initTts() {
    try {
      Tts.getInitStatus().then(() => {
        this.ttsInitialized = true;
        Tts.setDefaultRate(0.5);
        Tts.setDefaultPitch(1.0);
      }).catch(() => {
        this.ttsInitialized = false;
      });
    } catch {
      this.ttsInitialized = false;
    }
  }

  setLanguage(lang) {
    if (['gu', 'hi', 'en'].includes(lang)) {
      this.currentLanguage = lang;
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = Boolean(enabled);
  }

  /**
   * Speak or play an alert prompt
   */
  announce(promptKey, overrideLang = null) {
    if (!this.soundEnabled) return;

    const lang = overrideLang || this.currentLanguage;
    const promptGroup = VOICE_PROMPTS[promptKey];
    if (!promptGroup) return;

    const message = promptGroup[lang] || promptGroup.en || promptGroup.gu;

    // Vibration pattern based on severity
    if (promptKey === 'EMERGENCY_TRIGGERED' || promptKey === 'ROUTE_DEVIATION_TIER2') {
      Vibration.vibrate([0, 500, 200, 500]);
    } else if (promptKey === 'ROUTE_DEVIATION_TIER1') {
      Vibration.vibrate([0, 300, 150, 300]);
    } else {
      Vibration.vibrate(200);
    }

    // TTS announcement
    try {
      const langCode = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-US';
      Tts.setDefaultLanguage(langCode)
        .then(() => Tts.speak(message))
        .catch(() => {
          Tts.speak(message);
        });
    } catch (e) {
      console.warn('[VoiceAlert] TTS playback error:', e?.message);
    }
  }
}

export const voiceAlertService = new VoiceAlertService();
