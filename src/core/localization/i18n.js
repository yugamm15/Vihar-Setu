import en from './en.json';
import gu from './gu.json';
import hi from './hi.json';
import { storage } from '../storage/asyncStorage';

const translations = { en, gu, hi };
let currentLanguage = 'gu'; // Default Gujarati as primary Jain seva language

export const setAppLanguage = async (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    await storage.setItem('app_language', lang);
  }
};

export const getAppLanguage = () => currentLanguage;

export const loadStoredLanguage = async () => {
  const saved = await storage.getItem('app_language');
  if (saved && translations[saved]) {
    currentLanguage = saved;
  }
  return currentLanguage;
};

export const t = (keyPath, params = {}) => {
  const keys = keyPath.split('.');
  let result = translations[currentLanguage];

  for (const k of keys) {
    if (result && result[k] !== undefined) {
      result = result[k];
    } else {
      // Fallback to English if key missing in selected language
      let fallback = translations.en;
      for (const fk of keys) {
        fallback = fallback ? fallback[fk] : undefined;
      }
      result = fallback || keyPath;
      break;
    }
  }

  if (typeof result === 'string') {
    let formatted = result;
    Object.keys(params).forEach((paramKey) => {
      formatted = formatted.replace(new RegExp(`{{${paramKey}}}`, 'g'), params[paramKey]);
    });
    return formatted;
  }

  return result;
};
