import { Linking, Platform } from 'react-native';

class SmsFallbackService {
  /**
   * Dispatch Emergency SMS Fallback with Google Maps coordinates link
   * @param {string} phoneNumber - Emergency Contact or Admin phone
   * @param {object} coords - { latitude, longitude }
   * @param {string} sevakName - Volunteer name
   * @param {string} viharName - Vihar destination
   */
  async sendEmergencySmsFallback({
    phoneNumber = '9876543211',
    coords = { latitude: 21.1959, longitude: 72.7933 },
    sevakName = 'Vihar Sevika',
    viharName = 'Upashray Vihar',
  }) {
    const lat = coords?.latitude || 21.1959;
    const lng = coords?.longitude || 72.7933;
    const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    
    const message = `EMERGENCY ALERT: ${sevakName} triggered SOS during Vihar to ${viharName}. Last known GPS: ${mapsUrl} (Sent via Vihar Setu SMS Fallback)`;

    const cleanPhone = (phoneNumber || '9876543211').replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(message);

    const separator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = `sms:${cleanPhone}${separator}body=${encodedBody}`;

    try {
      const supported = await Linking.canOpenURL(smsUrl);
      if (supported) {
        await Linking.openURL(smsUrl);
        return { success: true, method: 'DIRECT_INTENT' };
      } else {
        // Fallback generic SMS scheme
        await Linking.openURL(`sms:${cleanPhone}`);
        return { success: true, method: 'GENERIC_INTENT' };
      }
    } catch (e) {
      console.warn('[SmsFallbackService] Failed to launch SMS fallback:', e);
      return { success: false, error: e.message };
    }
  }
}

export const smsFallbackService = new SmsFallbackService();

