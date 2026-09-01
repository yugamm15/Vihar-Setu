import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async setItem(key, value) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
    } catch (e) {
      console.error(`[Storage] Error setting ${key}:`, e);
    }
  },

  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (e) {
      console.error(`[Storage] Error getting ${key}:`, e);
      return null;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`[Storage] Error removing ${key}:`, e);
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('[Storage] Error clearing storage:', e);
    }
  }
};
