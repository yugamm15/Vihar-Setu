import { Linking, Platform } from 'react-native';
import { supabase } from '../../../core/config/supabase';
import { offlineSyncService } from './offlineSyncService';

/**
 * Police Emergency Service (Phase 21)
 * Manages 1-Touch Direct Calling to 112 (Police Dispatch) and 181 (Abhayam Women Helpline)
 * with mandatory telemetry and audit logging in Supabase.
 */
class PoliceEmergencyService {
  /**
   * Dial emergency number with logging
   */
  async dialEmergencyNumber(number, { userId, viharId, latitude, longitude, batteryPercentage, notes = '' }) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const telUrl = `tel:${cleanNumber}`;

    // 1. Log event immediately into route_events and notifications
    try {
      const now = new Date().toISOString();
      const message = `EMERGENCY CALL: Dialed ${cleanNumber} (${cleanNumber === '112' ? 'Police Dispatch' : 'Women Helpline'}) at (${latitude?.toFixed?.(4) || 'N/A'}, ${longitude?.toFixed?.(4) || 'N/A'})`;

      if (viharId) {
        const routePayload = {
          vihar_id: viharId,
          event_type: 'POLICE_CALL',
          severity: 'CRITICAL',
          message,
          latitude: latitude || null,
          longitude: longitude || null,
          metadata: {
            dialed_number: cleanNumber,
            battery: batteryPercentage || null,
            caller_user_id: userId,
            notes,
          },
        };

        if (offlineSyncService.isOnline) {
          await supabase.from('route_events').insert(routePayload);
        } else {
          await offlineSyncService.enqueue('ROUTE_EVENT', routePayload);
        }
      }

      // 2. Broadcast high-priority notification to Admins
      if (userId && offlineSyncService.isOnline) {
        await supabase.from('notifications').insert({
          user_id: userId,
          vihar_id: viharId || null,
          title: `CRITICAL: 1-Touch ${cleanNumber} Dialed`,
          body: `Emergency call to ${cleanNumber} initiated by volunteer. Live location coordinates recorded.`,
          type: 'POLICE_CALL',
          severity: 'CRITICAL',
          metadata: {
            number: cleanNumber,
            latitude,
            longitude,
            timestamp: now,
          },
        });
      }
    } catch (logErr) {
      console.warn('[PoliceEmergencyService] Logging warning:', logErr);
    }

    // 3. Launch native dialer intent
    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
        return { success: true };
      } else {
        return { success: false, error: 'Dialer not supported on this device.' };
      }
    } catch (dialErr) {
      console.warn('[PoliceEmergencyService] Native call intent warning:', dialErr);
      return { success: false, error: dialErr.message };
    }
  }

  /**
   * 1-Touch Police Call (112)
   */
  async callPolice112(context) {
    return this.dialEmergencyNumber('112', context);
  }

  /**
   * 1-Touch Abhayam Women Helpline (181)
   */
  async callWomenHelpline181(context) {
    return this.dialEmergencyNumber('181', context);
  }
}

export const policeEmergencyService = new PoliceEmergencyService();

