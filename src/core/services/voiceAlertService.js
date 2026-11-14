import { Vibration, Platform } from 'react-native';

/**
 * Trilingual Voice Alert Messages (Gujarati, Hindi, English)
 */
export const VOICE_PROMPTS = {
  VIHAR_STARTED: {
    gu: 'વિહાર સેવા શરૂ થઈ છે. સુરક્ષા ટ્રેકિંગ સક્રિય છે.',
    hi: 'विहार सेवा प्रारंभ हो गई है। लाइव सुरक्षा ट्रैकिंग सक्रिय है।',
    en: 'Vihar started. Live safety tracking is active.',
  },
  ROUTE_DEVIATION: {
    gu: 'ધ્યાન આપો! તમે નિર્ધારિત માર્ગથી વિચલિત થઈ રહ્યા છો.',
    hi: 'सावधान! आप निर्धारित विहार मार्ग से विचलित हो रहे हैं।',
    en: 'Warning! Route deviation detected from planned path.',
  },
  HOLD_STARTED: {
    gu: 'વિહાર અલ્પવિરામ પર મૂકવામાં આવ્યો છે.',
    hi: 'विहार अल्पविश्राम पर रखा गया है।',
    en: 'Vihar placed on temporary hold.',
  },
  HOLD_RESUMED: {
    gu: 'વિહાર સેવા પુનઃ શરૂ થઈ છે.',
    hi: 'विहार यात्रा पुनः प्रारंभ हो गई है।',
    en: 'Vihar resumed safely.',
  },
  EMERGENCY_TRIGGERED: {
    gu: 'સુરક્ષા એલર્ટ! સુરત કંટ્રોલ રૂમ અને ૧૧૨ ને જાણ કરવામાં આવી છે.',
    hi: 'सुरक्षा अलर्ट! आपातकालीन सहायता अनुरोध भेज दिया गया है।',
    en: 'Critical emergency SOS broadcast! Help has been dispatched.',
  },
  SAFETY_CHECK: {
    gu: 'શું તમે સુરક્ષિત છો? કૃપા કરીને સ્ક્રીન પર પુષ્ટિ કરો.',
    hi: 'क्या आप सुरक्षित हैं? कृपया पुष्टि करें।',
    en: 'Are you safe? Please confirm on screen.',
  },
  HANDOVER_COMPLETE: {
    gu: 'વિહાર દાયિત્વ સફળતાપૂર્વક ટ્રાન્સફર થયું છે.',
    hi: 'विहार दायित्व सफलतापूर्वक स्थानांतरित कर दिया गया है।',
    en: 'Vihar duty successfully handed over to verified volunteer.',
  },
};

class VoiceAlertService {
  constructor() {
    this.currentLanguage = 'gu'; // default Gujarati
    this.soundEnabled = true;
    this.speechSynthesisAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
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
   * @param {string} promptKey - key from VOICE_PROMPTS
   * @param {string} overrideLang - optional language override
   */
  announce(promptKey, overrideLang = null) {
    if (!this.soundEnabled) return;

    const lang = overrideLang || this.currentLanguage;
    const promptGroup = VOICE_PROMPTS[promptKey];
    if (!promptGroup) return;

    const message = promptGroup[lang] || promptGroup.en || promptGroup.gu;

    // Haptic vibration feedback accompanying the alert
    if (promptKey === 'EMERGENCY_TRIGGERED' || promptKey === 'ROUTE_DEVIATION') {
      Vibration.vibrate([0, 400, 150, 400]);
    } else {
      Vibration.vibrate(200);
    }

    // Web / Headless Speech Synthesis fallback if available
    try {
      if (this.speechSynthesisAvailable && window.speechSynthesis) {
        const utterance = new window.SpeechSynthesisUtterance(message);
        utterance.lang = lang === 'gu' ? 'gu-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95; // Clear spiritual cadence
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Non-fatal if platform TTS engine is not linked
    }
  }
}

export const voiceAlertService = new VoiceAlertService();

