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

      // Automatically initialize Sub-Vihar #1 and initial participant (Phase 12 & 13)
      try {
        const subViharPayload = {
          vihar_id: data.id,
          sub_vihar_number: 1,
          title: `Sub-Vihar 1: ${record.source_name || 'Origin'} → ${record.dest_name || 'Destination'}`,
          source_name: record.source_name,
          source_lat: record.source_lat,
          source_lng: record.source_lng,
          dest_name: record.dest_name,
          dest_lat: record.dest_lat,
          dest_lng: record.dest_lng,
          total_distance_km: record.total_distance_km,
          status: record.status === 'ACTIVE' ? 'ACTIVE' : 'PLANNED',
          started_at: record.started_at,
          notes: record.notes,
        };

        const { data: subData } = await supabase
          .from('vihar_subsessions')
          .insert(subViharPayload)
          .select()
          .single();

        if (subData?.id) {
          await supabase.from('vihar_participants').insert({
            vihar_id: data.id,
            sub_vihar_id: subData.id,
            user_id: userId,
            role: 'LEAD_SEVAK',
            is_current_responsible: true,
          });
        }
      } catch (subErr) {
        console.warn('[ViharService] Sub-vihar auto-init notice:', subErr);
      }

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

  /**
   * Fetch History of Completed/Past Vihars for a Sevak
   */
  async getViharHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('vihars')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[ViharService] getViharHistory error:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Fetch All Active Vihars for Admin Live Tracking
   */
  async getAllActiveVihars() {
    try {
      const { data, error } = await supabase
        .from('vihars')
        .select('*, profiles:user_id(full_name, phone, emergency_contact_phone, city, area), vihar_subsessions(id, sub_vihar_number, title, status)')
        .eq('status', 'ACTIVE')
        .order('started_at', { ascending: false });

      if (error) {
        const { data: fallbackData } = await supabase
          .from('vihars')
          .select('*, profiles:user_id(full_name, phone, emergency_contact_phone, city, area)')
          .eq('status', 'ACTIVE')
          .order('started_at', { ascending: false });
        return { data: fallbackData || [], error: null };
      }
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[ViharService] getAllActiveVihars error:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Fetch All Alerts & Emergencies for Admin Alerts Center
   */
  async getAllAlerts() {
    try {
      const { data, error } = await supabase
        .from('emergencies')
        .select('*, profiles:user_id(full_name, phone, city, area)')
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      console.warn('[ViharService] getAllAlerts error:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Resolve an Emergency in Supabase (by Admin)
   */
  async resolveEmergency(emergencyId, resolutionNotes = 'Resolved by Administrator') {
    try {
      const { data, error } = await supabase
        .from('emergencies')
        .update({
          status: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', emergencyId)
        .select();

      if (error) throw error;
      return { data: data?.[0] || null, error: null };
    } catch (e) {
      console.warn('[ViharService] resolveEmergency error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Real Emergency SOS Trigger (Multi-Tier Women Safety Engine)
   * Inserts into `emergencies`, updates `vihars.safety_status` to 'EMERGENCY',
   * logs into `route_events` and `audit_logs`.
   */
  async triggerEmergencySOS({
    userId,
    viharId = null,
    latitude = 21.1959,
    longitude = 72.7933,
    batteryPercentage = 85,
    triggerType = 'MANUAL_SOS', // 'MANUAL_SOS' | 'AUTOMATIC_DEVIATION' | 'STATIONARY_TIMEOUT' | 'FALL_DETECTED'
    notes = 'Immediate safety assistance requested during Vihar seva',
  }) {
    try {
      if (!userId) throw new Error('User ID is required to trigger emergency SOS');

      // 1. Insert into emergencies table
      const emergencyPayload = {
        user_id: userId,
        vihar_id: viharId || null,
        status: 'TRIGGERED',
        trigger_type: triggerType,
        latitude: latitude,
        longitude: longitude,
        battery_percentage: batteryPercentage,
        resolution_notes: notes,
        triggered_at: new Date().toISOString(),
      };

      const { data: emergencyData, error: emergencyError } = await supabase
        .from('emergencies')
        .insert(emergencyPayload)
        .select()
        .single();

      if (emergencyError) throw emergencyError;

      // 2. If active vihar exists, elevate its safety status to EMERGENCY
      if (viharId) {
        await supabase
          .from('vihars')
          .update({
            safety_status: 'EMERGENCY',
            updated_at: new Date().toISOString(),
          })
          .eq('id', viharId);

        // 3. Log into route_events
        await supabase.from('route_events').insert({
          vihar_id: viharId,
          event_type: 'DEVIATION_LEVEL_2',
          severity: 'CRITICAL',
          message: `CRITICAL ALERT: ${triggerType} broadcast at (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          latitude: latitude,
          longitude: longitude,
          metadata: { battery: batteryPercentage, notes: notes },
        });
      }

      // 4. Log into audit_logs for governance
      try {
        await supabase.from('audit_logs').insert({
          actor_id: userId,
          action: 'EMERGENCY_SOS_TRIGGERED',
          entity: 'emergencies',
          entity_id: emergencyData.id,
          details: {
            latitude,
            longitude,
            triggerType,
            viharId,
          },
        });
      } catch (auditErr) {
        // Non-fatal
      }

      return { data: emergencyData, error: null };
    } catch (e) {
      console.warn('[ViharService] triggerEmergencySOS error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Cancel or Disarm Emergency by Sevak (e.g. False Alarm or Safe Recovery)
   */
  async cancelEmergencyBySevak(emergencyId, viharId = null, reason = 'False Alarm - Sevika & Sadhviji Safe') {
    try {
      const { data, error } = await supabase
        .from('emergencies')
        .update({
          status: 'FALSE_ALARM',
          resolved_at: new Date().toISOString(),
          resolution_notes: reason,
        })
        .eq('id', emergencyId)
        .select();

      if (error) throw error;

      if (viharId) {
        await supabase
          .from('vihars')
          .update({
            safety_status: 'SAFE',
            updated_at: new Date().toISOString(),
          })
          .eq('id', viharId);

        await supabase.from('route_events').insert({
          vihar_id: viharId,
          event_type: 'ROUTE_RECOVERED',
          severity: 'INFO',
          message: `Emergency SOS cancelled by Sevak: ${reason}`,
        });
      }

      return { data: data?.[0] || null, error: null };
    } catch (e) {
      console.warn('[ViharService] cancelEmergencyBySevak error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Record Real-Time GPS Telemetry Ping in `vihar_locations`
   */
  async recordLocationPing({
    viharId,
    subViharId = null,
    userId,
    latitude,
    longitude,
    speedKmh = 4.0,
    heading = 0.0,
    accuracyMeters = 5.0,
    batteryPercentage = 90,
    networkStatus = 'ONLINE',
  }) {
    try {
      if (!viharId || !userId) return { error: 'Missing viharId or userId' };

      const pingPayload = {
        vihar_id: viharId,
        user_id: userId,
        latitude,
        longitude,
        speed_kmh: speedKmh,
        heading,
        accuracy_meters: accuracyMeters,
        battery_percentage: batteryPercentage,
        network_status: networkStatus,
        recorded_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      };

      if (subViharId) {
        pingPayload.sub_vihar_id = subViharId;
      }

      const { data, error } = await supabase
        .from('vihar_locations')
        .insert(pingPayload);

      return { data, error };
    } catch (e) {
      console.warn('[ViharService] recordLocationPing error:', e);
      return { error: e };
    }
  },

  /**
   * Submit Safety Heartbeat Check-In (Dead-Man's Periodic Check)
   */
  async submitSafetyCheckResponse({
    viharId,
    userId,
    userResponse = 'SAFE', // 'SAFE' | 'HELP'
  }) {
    try {
      const { data, error } = await supabase
        .from('safety_checks')
        .insert({
          vihar_id: viharId,
          user_id: userId,
          prompt_sent_at: new Date().toISOString(),
          user_response: userResponse,
          responded_at: new Date().toISOString(),
          status: 'COMPLETED',
        });

      return { data, error };
    } catch (e) {
      console.warn('[ViharService] submitSafetyCheckResponse error:', e);
      return { error: e };
    }
  },
};
