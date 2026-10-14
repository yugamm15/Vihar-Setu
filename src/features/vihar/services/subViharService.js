import { supabase } from '../../../core/config/supabase';

/**
 * Sub-Vihar & Handover Service (Phase 13)
 * Manages parent Main Vihar segmentation into Sub-Vihars, participant assignment,
 * and seamless volunteer duty transfers without ending the parent Vihar journey.
 */
export const subViharService = {
  /**
   * Fetch all Sub-Vihars for a Main Vihar
   */
  async getSubVihars(viharId) {
    try {
      if (!viharId) return { data: [], error: null };

      const { data, error } = await supabase
        .from('vihar_subsessions')
        .select('*, vihar_participants(*, profiles(full_name, phone, area))')
        .eq('vihar_id', viharId)
        .order('sub_vihar_number', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[SubViharService] getSubVihars error:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Fetch currently ACTIVE Sub-Vihar for a Main Vihar
   */
  async getActiveSubVihar(viharId) {
    try {
      if (!viharId) return { data: null, error: null };

      const { data, error } = await supabase
        .from('vihar_subsessions')
        .select('*, vihar_participants(*, profiles(full_name, phone, area))')
        .eq('vihar_id', viharId)
        .eq('status', 'ACTIVE')
        .order('sub_vihar_number', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return { data: data || null, error: null };
    } catch (e) {
      console.warn('[SubViharService] getActiveSubVihar error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Fetch Available Verified Sevaks for Handover Assignment
   */
  async getAvailableSevaksForHandover(currentUserId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, area, avatar_url')
        .eq('status', 'ACTIVE')
        .neq('id', currentUserId)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[SubViharService] getAvailableSevaks error:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Execute Vihar Handover (Transfer to Next Sevak / Sub-Vihar)
   * The parent Main Vihar remains ACTIVE.
   */
  async executeHandover({
    viharId,
    currentSubViharId,
    currentSubViharNumber = 1,
    handedOverByUserId,
    nextSevakUserId = null,
    nextSevakName,
    handoverLocationName = 'Roadside Transfer Point, Surat',
    handoverLat = 21.1959,
    handoverLng = 72.7933,
    notes = 'Sacred Vihar seva responsibility handed over to accompanying Sevika.',
  }) {
    try {
      if (!viharId || !handedOverByUserId) {
        throw new Error('Vihar ID and Handing Over Sevak ID are required.');
      }

      // 1. Mark Current Sub-Vihar as TRANSFERRED / COMPLETED
      if (currentSubViharId) {
        await supabase
          .from('vihar_subsessions')
          .update({
            status: 'TRANSFERRED',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentSubViharId);

        // Update participant left_at
        await supabase
          .from('vihar_participants')
          .update({
            is_current_responsible: false,
            left_at: new Date().toISOString(),
          })
          .eq('sub_vihar_id', currentSubViharId);
      }

      // 2. Create Next Sub-Vihar (e.g. Sub-Vihar #2)
      const nextNumber = currentSubViharNumber + 1;
      const { data: newSubVihar, error: subErr } = await supabase
        .from('vihar_subsessions')
        .insert({
          vihar_id: viharId,
          sub_vihar_number: nextNumber,
          title: `Sub-Vihar ${nextNumber}: Continuing with ${nextSevakName}`,
          source_name: handoverLocationName,
          source_lat: handoverLat,
          source_lng: handoverLng,
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
          notes: notes,
        })
        .select()
        .single();

      if (subErr) throw subErr;

      // 3. Register Next Participant
      if (nextSevakUserId && newSubVihar?.id) {
        await supabase.from('vihar_participants').insert({
          vihar_id: viharId,
          sub_vihar_id: newSubVihar.id,
          user_id: nextSevakUserId,
          role: 'LEAD_SEVAK',
          is_current_responsible: true,
          joined_at: new Date().toISOString(),
        });
      }

      // 4. Log Handover Record in public.vihar_handover
      const { data: handoverRecord, error: handoverErr } = await supabase
        .from('vihar_handover')
        .insert({
          vihar_id: viharId,
          from_sub_vihar_id: currentSubViharId || null,
          to_sub_vihar_id: newSubVihar?.id || null,
          handed_over_by: handedOverByUserId,
          handed_over_to: nextSevakUserId || null,
          next_sevak_name: nextSevakName,
          handover_location_name: handoverLocationName,
          handover_lat: handoverLat,
          handover_lng: handoverLng,
          handover_time: new Date().toISOString(),
          notes: notes,
          status: 'COMPLETED',
        })
        .select()
        .single();

      if (handoverErr) throw handoverErr;

      // 5. Log Event in route_events for live tracking timeline
      await supabase.from('route_events').insert({
        vihar_id: viharId,
        event_type: 'ROUTE_RECOVERED',
        severity: 'INFO',
        message: `VIHAR HANDOVER: Transferred duty to ${nextSevakName} at ${handoverLocationName}. Sub-Vihar #${nextNumber} active.`,
        latitude: handoverLat,
        longitude: handoverLng,
      });

      return {
        success: true,
        newSubVihar,
        handoverRecord,
        error: null,
      };
    } catch (e) {
      console.warn('[SubViharService] executeHandover error:', e);
      return { success: false, newSubVihar: null, error: e };
    }
  },

  /**
   * Fetch Handover History for a Vihar
   */
  async getHandoverHistory(viharId) {
    try {
      const { data, error } = await supabase
        .from('vihar_handover')
        .select('*, handed_over_by_profile:handed_over_by(full_name, phone), handed_over_to_profile:handed_over_to(full_name, phone)')
        .eq('vihar_id', viharId)
        .order('handover_time', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[SubViharService] getHandoverHistory error:', e);
      return { data: [], error: e };
    }
  },
};
