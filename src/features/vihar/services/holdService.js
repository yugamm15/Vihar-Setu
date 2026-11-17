import { supabase } from '../../../core/config/supabase';
import { offlineSyncService } from './offlineSyncService';

/**
 * Predefined Jain Vihar Hold Reasons
 */
export const HOLD_REASONS = [
  { id: 'REST', label: 'Rest Stop (विश्राम / થાક)', icon: 'pause', description: 'Brief physical rest for Sadhvijis or Sevika' },
  { id: 'TEMPLE_VISIT', label: 'Upashray / Derasar Darshan (दर्शन)', icon: 'home', description: 'Visiting Derasar or Upashray en route' },
  { id: 'WATER_BREAK', label: 'Water Break (जलपान / પાણી)', icon: 'droplet', description: 'Hydration and refreshment pause' },
  { id: 'WAITING', label: 'Waiting for Sadhviji (प्रतीक्षा)', icon: 'clock', description: 'Waiting for accompanying group or lead' },
  { id: 'MEDICAL', label: 'Medical Attention (चिकित्सा / સારવાર)', icon: 'heart', description: 'First aid, bandage or foot care' },
  { id: 'MEAL', label: 'Gochari / Meal (गोचरी / ભોજન)', icon: 'coffee', description: 'Scheduled Gochari break' },
  { id: 'MEETING', label: 'Local Sangha Meeting (मिलन)', icon: 'users', description: 'Greeting local Sangha representatives' },
  { id: 'OTHER', label: 'Other Permitted Reason (अन्य)', icon: 'more', description: 'Other situational requirement' },
];

class HoldService {
  /**
   * Start a Hold on an active Vihar
   */
  async startHold({
    viharId,
    subViharId = null,
    userId,
    reason,
    locationName = 'En Route',
    latitude = null,
    longitude = null,
    notes = '',
  }) {
    try {
      const now = new Date().toISOString();
      const holdPayload = {
        vihar_id: viharId,
        sub_vihar_id: subViharId,
        user_id: userId,
        reason,
        location_name: locationName,
        latitude,
        longitude,
        hold_start: now,
        status: 'ACTIVE',
        notes,
      };

      let holdRecord = null;

      if (offlineSyncService.isOnline) {
        const { data: existingHold, error: existingHoldError } = await supabase
          .from('vihar_holds')
          .select('*')
          .eq('vihar_id', viharId)
          .eq('status', 'ACTIVE')
          .maybeSingle();

        if (existingHoldError) throw existingHoldError;

        if (existingHold) {
          const { error: statusError } = await supabase
            .from('vihars')
            .update({
              safety_status: 'HOLD',
              updated_at: now,
            })
            .eq('id', viharId);

          if (statusError) throw statusError;
          return { data: existingHold, error: null };
        }

        const { data, error } = await supabase
          .from('vihar_holds')
          .insert(holdPayload)
          .select()
          .single();

        if (error) throw error;
        holdRecord = data;

        // Update vihar safety_status to HOLD
        const { error: statusError } = await supabase
          .from('vihars')
          .update({
            safety_status: 'HOLD',
            updated_at: now,
          })
          .eq('id', viharId);
        if (statusError) {
          await supabase.from('vihar_holds').delete().eq('id', data.id);
          throw statusError;
        }

        // Record in route_events
        const { error: eventError } = await supabase.from('route_events').insert({
          vihar_id: viharId,
          event_type: 'HOLD_STARTED',
          severity: 'INFO',
          message: `Vihar placed on Hold: ${reason} at ${locationName}`,
          latitude,
          longitude,
          metadata: { hold_id: data.id, reason, notes },
        });
        if (eventError) {
          console.warn(
            '[HoldService] Hold state persisted, but the audit event could not be recorded:',
            eventError
          );
        }
      } else {
        // Enqueue offline
        holdRecord = { ...holdPayload, id: `offline_hold_${Date.now()}` };
        await offlineSyncService.enqueue('HOLD_EVENT', { action: 'INSERT', data: holdPayload });
      }

      return { data: holdRecord, error: null };
    } catch (e) {
      console.warn('[HoldService] startHold error:', e);
      return { data: null, error: e };
    }
  }

  /**
   * Resume Vihar and close the active Hold
   */
  async resumeVihar({ holdId, viharId, holdStartTime }) {
    try {
      const now = new Date();
      const start = holdStartTime ? new Date(holdStartTime) : now;
      const durationMinutes = Math.max(1, Math.round((now.getTime() - start.getTime()) / (1000 * 60)));

      const updatePayload = {
        status: 'COMPLETED',
        hold_end: now.toISOString(),
        duration_minutes: durationMinutes,
      };

      if (offlineSyncService.isOnline) {
        if (holdId && !holdId.startsWith('offline_')) {
          const { error: holdError } = await supabase
            .from('vihar_holds')
            .update(updatePayload)
            .eq('id', holdId);
          if (holdError) throw holdError;
        }

        // Restore Vihar safety status to SAFE
        const { error: statusError } = await supabase
          .from('vihars')
          .update({
            safety_status: 'SAFE',
            updated_at: now.toISOString(),
          })
          .eq('id', viharId);
        if (statusError) throw statusError;

        // Log resume event
        const { error: eventError } = await supabase.from('route_events').insert({
          vihar_id: viharId,
          event_type: 'HOLD_ENDED',
          severity: 'INFO',
          message: `Vihar resumed from Hold (Duration: ${durationMinutes} mins)`,
          metadata: { hold_id: holdId, duration_minutes: durationMinutes },
        });
        if (eventError) {
          console.warn(
            '[HoldService] Resume state persisted, but the audit event could not be recorded:',
            eventError
          );
        }
      } else {
        await offlineSyncService.enqueue('HOLD_EVENT', {
          action: 'UPDATE',
          id: holdId,
          data: updatePayload,
        });
      }

      return { success: true, durationMinutes, error: null };
    } catch (e) {
      console.warn('[HoldService] resumeVihar error:', e);
      return { success: false, error: e };
    }
  }

  /**
   * Get Active Hold for a Vihar
   */
  async getActiveHold(viharId) {
    try {
      if (!viharId) return { data: null };

      const { data, error } = await supabase
        .from('vihar_holds')
        .select('*')
        .eq('vihar_id', viharId)
        .eq('status', 'ACTIVE')
        .order('hold_start', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.warn('[HoldService] getActiveHold error:', e);
      return { data: null, error: e };
    }
  }

  /**
   * Check if Hold exceeds 45-min maximum safety threshold (Section B10)
   */
  checkHoldTimeout(holdStartTime, maxMinutes = 45) {
    if (!holdStartTime) return { isExceeded: false, elapsedMinutes: 0 };
    const now = new Date();
    const start = new Date(holdStartTime);
    const elapsedMinutes = Math.max(0, Math.round((now.getTime() - start.getTime()) / (1000 * 60)));
    return {
      isExceeded: elapsedMinutes >= maxMinutes,
      elapsedMinutes,
      remainingMinutes: Math.max(0, maxMinutes - elapsedMinutes),
    };
  }
}

export const holdService = new HoldService();

