import { supabase } from '../../../core/config/supabase';

/**
 * Cache for reverse geocoded place names
 * Key: "${lat.toFixed(3)},${lng.toFixed(3)}"
 * Value: { name: string, timestamp: number }
 * TTL: 10 minutes (600,000 ms)
 */
const geocodeCache = new Map();
const GEOCODE_TTL_MS = 10 * 60 * 1000;

export const adminLiveService = {
  /**
   * Fetch Initial Snapshot of all active Vihars in caller's assigned area
   * @param {string|null} areaId Optional area ID (Super Admin only)
   */
  async fetchLiveSnapshot(areaId = null) {
    try {
      const { data, error } = await supabase.rpc('admin_live_snapshot', {
        p_area_id: areaId || null,
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[AdminLiveService] fetchLiveSnapshot error:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Subscribe to Realtime channel for vihar_live_state filtered by area_id (or all areas for Super Admin)
   * @param {string|null} areaId Administrator area ID
   * @param {Function} onUpdate Callback when live state changes
   * @returns {Function} Unsubscribe cleanup function
   */
  subscribeToAreaLiveState(areaId, onUpdate) {
    const channelName = `admin_live_area_${areaId || 'all'}_${Math.random().toString(36).substring(2, 7)}`;
    let throttleTimeout = null;
    let pendingUpdates = [];

    const flushUpdates = () => {
      if (pendingUpdates.length > 0 && onUpdate) {
        onUpdate([...pendingUpdates]);
        pendingUpdates = [];
      }
      throttleTimeout = null;
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vihar_live_state',
          ...(areaId ? { filter: `area_id=eq.${areaId}` } : {}),
        },
        (payload) => {
          pendingUpdates.push(payload);
          // Throttle map and list updates to at most once per second
          if (!throttleTimeout) {
            throttleTimeout = setTimeout(flushUpdates, 1000);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[AdminLiveService] Subscribed to area live state channel:', channelName);
        }
      });

    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      supabase.removeChannel(channel);
    };
  },

  /**
   * Fetch server-side downsampled GPS track for a specific Vihar purely from Supabase
   */
  async fetchTrack(viharId, sinceTime = null, maxPoints = 500) {
    try {
      const { data, error } = await supabase.rpc('admin_get_track', {
        p_vihar_id: viharId,
        p_since_time: sinceTime,
        p_max_points: maxPoints,
      });

      if (!error && data && data.length > 0) {
        return { data, error: null };
      }

      // Query real locations table from Supabase
      let query = supabase
        .from('locations')
        .select('id, latitude, longitude, speed_kmh, heading, accuracy_meters, recorded_at')
        .eq('vihar_id', viharId)
        .order('recorded_at', { ascending: true })
        .limit(maxPoints);

      if (sinceTime) {
        query = query.gte('recorded_at', sinceTime);
      }

      const { data: locData, error: locError } = await query;
      if (!locError && locData) {
        return { data: locData, error: null };
      }

      return { data: [], error: null };
    } catch (e) {
      console.warn('[AdminLiveService] fetchTrack error:', e);
      return { data: [], error: null };
    }
  },

  /**
   * Fetch full Vihar detail (sub-vihars, holds, handover, route, emergency history) from Supabase
   */
  async fetchViharDetail(viharId) {
    try {
      const { data, error } = await supabase.rpc('admin_get_vihar_detail', {
        p_vihar_id: viharId,
      });

      if (!error && data) {
        return { data, error: null };
      }

      // Direct Supabase table queries
      const { data: vihar, error: vErr } = await supabase
        .from('vihars')
        .select(`
          *,
          profiles:user_id(id, full_name, phone, blood_group, emergency_contact_phone, emergency_contact_name, medical_notes)
        `)
        .eq('id', viharId)
        .maybeSingle();

      if (vErr || !vihar) {
        return { data: null, error: vErr || new Error('Vihar record not found') };
      }

      const [liveRes, subsRes, holdsRes, emRes] = await Promise.all([
        supabase.from('vihar_live_state').select('*').eq('vihar_id', viharId).maybeSingle(),
        supabase.from('vihar_subsessions').select('*').eq('vihar_id', viharId).order('sub_vihar_number', { ascending: true }),
        supabase.from('vihar_holds').select('*').eq('vihar_id', viharId).order('hold_start', { ascending: false }),
        supabase.from('emergencies').select('*').eq('vihar_id', viharId).order('triggered_at', { ascending: false }),
      ]);

      const leadSevak = vihar.profiles || {};

      return {
        data: {
          vihar: {
            id: vihar.id,
            title: vihar.title || 'Pujya Sadhviji Bhagwant Vihar',
            source_name: vihar.source_name || 'Origin',
            dest_name: vihar.dest_name || 'Destination',
            planned_route: vihar.planned_route,
            total_distance_km: vihar.total_distance_km,
            status: vihar.status,
          },
          live_state: liveRes.data || null,
          participants: [
            {
              id: leadSevak.id || vihar.user_id,
              full_name: leadSevak.full_name || 'Vihar Sevak',
              phone: leadSevak.phone || '',
              role: 'Lead Sevak',
              is_current_responsible: true,
            },
          ],
          current_hold: holdsRes.data?.find((h) => h.status === 'ACTIVE') || null,
          hold_history: holdsRes.data || [],
          sub_vihars: subsRes.data || [],
          handover_history: [],
          emergency_history: emRes.data || [],
        },
        error: null,
      };
    } catch (e) {
      console.warn('[AdminLiveService] fetchViharDetail error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Fetch Helping Details (blood group, emergency contact, phone) purely from Supabase
   */
  async fetchHelpingDetails(viharId) {
    try {
      const { data, error } = await supabase.rpc('admin_get_helping_details', {
        p_vihar_id: viharId,
      });

      if (!error && data) {
        return { data, error: null };
      }

      // Query profiles and vihars directly
      const { data: vihar } = await supabase
        .from('vihars')
        .select(`
          user_id,
          profiles:user_id(id, full_name, phone, avatar_url, blood_group, emergency_contact_phone, emergency_contact_name, emergency_contact_relation, medical_notes)
        `)
        .eq('id', viharId)
        .maybeSingle();

      if (vihar && vihar.profiles) {
        const p = vihar.profiles;
        const { data: liveState } = await supabase
          .from('vihar_live_state')
          .select('*')
          .eq('vihar_id', viharId)
          .maybeSingle();

        return {
          data: {
            user_id: p.id,
            full_name: p.full_name || 'Vihar Sevak',
            phone: p.phone || '',
            avatar_url: p.avatar_url,
            blood_group: p.blood_group || 'Not specified',
            emergency_contact_phone: p.emergency_contact_phone || 'None',
            emergency_contact_name: p.emergency_contact_name || 'Emergency Contact',
            emergency_contact_relation: p.emergency_contact_relation || '',
            medical_notes: p.medical_notes || 'None',
            battery: liveState?.battery ?? 100,
            network: liveState?.network || 'ONLINE',
            accuracy: liveState?.accuracy ?? 10,
            speed: liveState?.speed ?? 0,
            last_heartbeat_at: liveState?.last_heartbeat_at || new Date().toISOString(),
            status: liveState?.status || 'SAFE',
            hold_active: liveState?.hold_active || false,
            responsibility: 'Lead Sevak',
          },
          error: null,
        };
      }

      return { data: null, error: new Error('Helping details not found in database') };
    } catch (e) {
      console.warn('[AdminLiveService] fetchHelpingDetails error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Log Police 112 Call Dispatch to audit logs and notifications
   */
  async logPoliceCall({ viharId, emergencyId = null, location = null }) {
    try {
      const { data, error } = await supabase.rpc('log_police_call_initiated', {
        p_vihar_id: viharId,
        p_emergency_id: emergencyId,
        p_location: location,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.warn('[AdminLiveService] logPoliceCall error:', e);
      return { success: false, error: e };
    }
  },

  /**
   * Log Standard Phone Call to audit logs
   */
  async logCall({ viharId, targetType, phone = null }) {
    try {
      const { data, error } = await supabase.rpc('log_call_initiated', {
        p_vihar_id: viharId,
        p_target_type: targetType, // 'SEVAK' | 'EMERGENCY_CONTACT'
        p_target_phone: phone,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.warn('[AdminLiveService] logCall error:', e);
      return { success: false, error: e };
    }
  },

  /**
   * Reverse Geocode: Nearest place name for last known location
   * Cached for 10 minutes per rounded coordinate (3 decimals, ~110m) to protect free quota
   */
  async reverseGeocode(lat, lng) {
    if (lat == null || lng == null) return null;

    const roundedKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
    const now = Date.now();

    // Check memory cache
    const cached = geocodeCache.get(roundedKey);
    if (cached && now - cached.timestamp < GEOCODE_TTL_MS) {
      return cached.name;
    }

    try {
      // Invoke Supabase Edge Function 'maps-search' with action reverse
      const { data, error } = await supabase.functions.invoke('maps-search', {
        body: { action: 'reverse', lat, lng },
      });

      if (!error && data?.formatted_address) {
        const placeName = data.formatted_address;
        geocodeCache.set(roundedKey, { name: placeName, timestamp: now });
        return placeName;
      }
    } catch (e) {
      // Fallback: don't throw, return null or approximate location
    }

    // Fallback display format if edge function unavailable
    const fallbackText = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
    geocodeCache.set(roundedKey, { name: fallbackText, timestamp: now });
    return fallbackText;
  },

  /**
   * Seed debug active Vihars for testing
   */
  async seedDebugVihars(areaId = null) {
    try {
      const { data, error } = await supabase.rpc('seed_debug_live_vihars', {
        target_area_id: areaId,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.warn('[AdminLiveService] seedDebugVihars error:', e);
      return { success: false, error: e };
    }
  },
};
