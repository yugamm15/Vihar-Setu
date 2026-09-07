import { supabase } from '../../../core/config/supabase';

/**
 * Vihar Service Layer
 * Direct interface with Supabase PostgreSQL `public.vihars` and `public.route_events`
 */
export const viharService = {
  /**
   * Create a new Vihar (either Immediate ACTIVE or Future PLANNED)
   */
  async createVihar(userId, payload) {
    try {
      const record = {
        user_id: userId,
        title: payload.title || `Vihar to ${payload.dest_name || 'Destination'}`,
        source_name: payload.source_name,
        source_lat: payload.source_lat || 21.1959,
        source_lng: payload.source_lng || 72.7933,
        dest_name: payload.dest_name,
        dest_lat: payload.dest_lat || 21.1442,
        dest_lng: payload.dest_lng || 72.7758,
        total_distance_km: payload.total_distance_km || 4.5,
        estimated_duration_mins: payload.estimated_duration_mins || 65,
        status: payload.status || 'PLANNED', // 'PLANNED' | 'ACTIVE'
        safety_status: 'SAFE',
        started_at: payload.status === 'ACTIVE' ? new Date().toISOString() : null,
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('vihars')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.warn('[ViharService] createVihar error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Fetch Active Vihar for a Sevak
   */
  async getActiveVihar(userId) {
    try {
      const { data, error } = await supabase
        .from('vihars')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.warn('[ViharService] getActiveVihar error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Fetch Scheduled / Upcoming Vihars for a Sevak
   */
  async getScheduledVihars(userId) {
    try {
      const { data, error } = await supabase
        .from('vihars')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'PLANNED')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[ViharService] getScheduledVihars error:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Transition a Scheduled Vihar to ACTIVE
   */
  async startScheduledVihar(viharId) {
    try {
      const { data, error } = await supabase
        .from('vihars')
        .update({
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', viharId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.warn('[ViharService] startScheduledVihar error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Complete Active Vihar
   */
  async completeVihar(viharId, completionData = {}) {
    try {
      const { data, error } = await supabase
        .from('vihars')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          total_distance_km: completionData.total_distance_km || 4.8,
          updated_at: new Date().toISOString(),
        })
        .eq('id', viharId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.warn('[ViharService] completeVihar error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Cancel Scheduled Vihar
   */
  async cancelScheduledVihar(viharId) {
    try {
      const { error } = await supabase
        .from('vihars')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', viharId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.warn('[ViharService] cancelScheduledVihar error:', e);
      return { success: false, error: e };
    }
  },
};
