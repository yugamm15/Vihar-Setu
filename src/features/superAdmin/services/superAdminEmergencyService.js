import { supabase } from '../../../core/config/supabase';

const PAGE_SIZE = 25;

const severityRank = { INFO: 1, WARNING: 2, CRITICAL: 3 };

const highestSeverity = (events = []) => events.reduce((highest, event) => (
  (severityRank[event.severity] || 0) > (severityRank[highest] || 0) ? event.severity : highest
), 'INFO');

const errorMessage = (error) => error?.message || 'The emergency query failed.';

const withLocationAndSeverity = async (records) => {
  const viharIds = [...new Set(records.map((record) => record.vihar_id).filter(Boolean))];
  if (!viharIds.length) return records.map((record) => ({ ...record, severity: null, lastLocation: null }));

  const [locationsResult, eventsResult] = await Promise.all([
    supabase.from('vihar_locations')
      .select('id, vihar_id, latitude, longitude, accuracy_meters, recorded_at, synced_at')
      .in('vihar_id', viharIds)
      .order('recorded_at', { ascending: false }),
    supabase.from('route_events')
      .select('id, vihar_id, event_type, severity, message, latitude, longitude, created_at')
      .in('vihar_id', viharIds)
      .order('created_at', { ascending: false }),
  ]);
  if (locationsResult.error) throw locationsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  return records.map((record) => ({
    ...record,
    severity: highestSeverity((eventsResult.data || []).filter((event) => event.vihar_id === record.vihar_id)),
    lastLocation: (locationsResult.data || []).find((location) => location.vihar_id === record.vihar_id) || null,
  }));
};

const baseSelect = `
  id, vihar_id, user_id, status, trigger_type, latitude, longitude,
  battery_percentage, resolved_by, resolution_notes, triggered_at, resolved_at,
  profiles:user_id(id, full_name, phone),
  vihars:vihar_id(id, title, source_name, source_lat, source_lng, dest_name, dest_lat, dest_lng, status, safety_status)
`;

export const superAdminEmergencyService = {
  pageSize: PAGE_SIZE,

  async listEmergencies(filters = {}, page = 0) {
    try {
      const from = page * PAGE_SIZE;
      let query = supabase.from('emergencies').select(baseSelect, { count: 'exact' });
      if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
      if (filters.triggerType && filters.triggerType !== 'ALL') query = query.eq('trigger_type', filters.triggerType);
      if (filters.viharId) query = query.eq('vihar_id', filters.viharId);
      if (filters.from) query = query.gte('triggered_at', filters.from);
      if (filters.to) query = query.lte('triggered_at', filters.to);
      const { data, count, error } = await query.order('triggered_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const enriched = await withLocationAndSeverity(data || []);
      return {
        data: filters.severity && filters.severity !== 'ALL'
          ? enriched.filter((record) => record.severity === filters.severity)
          : enriched,
        count: count || 0,
        error: null,
      };
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },

  async getEmergencyDetails(emergencyId) {
    if (!emergencyId) return { data: null, error: new Error('An emergency id is required.') };
    try {
      const { data: emergency, error } = await supabase.from('emergencies').select(baseSelect).eq('id', emergencyId).single();
      if (error) throw error;
      const [attempts, locations, routeEvents, holds, audit] = await Promise.all([
        supabase.from('emergency_attempts').select('id, emergency_id, admin_id, attempt_number, status, notified_at, responded_at').eq('emergency_id', emergencyId).order('attempt_number', { ascending: true }),
        emergency.vihar_id
          ? supabase.from('vihar_locations').select('id, vihar_id, user_id, latitude, longitude, accuracy_meters, recorded_at, synced_at').eq('vihar_id', emergency.vihar_id).order('recorded_at', { ascending: false }).limit(50)
          : Promise.resolve({ data: [], error: null }),
        emergency.vihar_id
          ? supabase.from('route_events').select('id, vihar_id, event_type, severity, message, latitude, longitude, metadata, acknowledged_by, created_at').eq('vihar_id', emergency.vihar_id).order('created_at', { ascending: false }).limit(50)
          : Promise.resolve({ data: [], error: null }),
        emergency.vihar_id
          ? supabase.from('vihar_holds').select('id, vihar_id, sub_vihar_id, reason, location_name, hold_start, hold_end, status, created_at').eq('vihar_id', emergency.vihar_id).order('created_at', { ascending: false }).limit(25)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('audit_logs').select('id, actor_id, action, entity, entity_id, details, created_at').eq('entity_id', emergencyId).order('created_at', { ascending: false }).limit(50),
      ]);
      const failed = [attempts, locations, routeEvents, holds, audit].find((result) => result.error);
      if (failed) throw failed.error;
      return {
        data: {
          emergency: { ...emergency, severity: highestSeverity(routeEvents.data || []) },
          attempts: attempts.data || [],
          locations: locations.data || [],
          routeEvents: routeEvents.data || [],
          holds: holds.data || [],
          audit: audit.data || [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: new Error(errorMessage(error)) };
    }
  },

  async manageEmergency(emergencyId, action, notes) {
    const { data, error } = await supabase.rpc('super_admin_manage_emergency', {
      p_emergency_id: emergencyId,
      p_action: action,
      p_notes: notes || null,
    });
    return { data, error };
  },
};
