import { supabase } from '../../../core/config/supabase';

const PAGE_SIZE = 20;
const VIHAR_FIELDS = `
  id, user_id, title, source_name, source_lat, source_lng, dest_name, dest_lat,
  dest_lng, status, safety_status, started_at, completed_at, created_at, updated_at,
  profiles:user_id!inner(id, full_name, phone, area)
`;

const result = async (query) => {
  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

const safe = async (operation) => {
  try {
    return { ...(await operation()), error: null };
  } catch (error) {
    return { data: [], count: 0, error };
  }
};

export const superAdminViharService = {
  pageSize: PAGE_SIZE,

  async getOverview() {
    const sections = await Promise.all([
      ['total', () => result(supabase.from('vihars').select('id', { count: 'exact', head: true }))],
      ['active', () => result(supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'))],
      ['completed', () => result(supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'))],
      ['held', () => result(supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('safety_status', 'HOLD'))],
      ['subVihars', () => result(supabase.from('vihar_subsessions').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'))],
      ['participants', () => result(supabase.from('vihar_participants').select('id', { count: 'exact', head: true }).eq('is_current_responsible', true).is('left_at', null))],
      ['handovers', () => result(supabase.from('vihar_handover').select('id, vihar_id, status, handover_time, handover_location_name').order('handover_time', { ascending: false }).limit(10))],
      ['activity', () => result(supabase.from('route_events').select('id, vihar_id, event_type, severity, message, created_at').order('created_at', { ascending: false }).limit(10))],
    ].map(async ([key, operation]) => ({ key, ...(await safe(operation)) })));
    const data = {};
    const errors = [];
    sections.forEach(({ key, data: value, count, error }) => {
      data[key] = key === 'handovers' || key === 'activity' ? value : count;
      if (error) errors.push({ section: key, message: error.message });
    });
    return { data, errors };
  },

  async listVihars(filters = {}, page = 0) {
    return safe(async () => {
      const from = page * PAGE_SIZE;
      let query = supabase.from('vihars').select(VIHAR_FIELDS, { count: 'exact' });
      if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
      if (filters.area) query = query.ilike('profiles.area', `%${filters.area}%`);
      if (filters.responsibleSevika) query = query.ilike('profiles.full_name', `%${filters.responsibleSevika}%`);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) query = query.lte('created_at', filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to);
      if (filters.search?.trim()) {
        const search = filters.search.trim().replace(/[%(),]/g, ' ');
        query = query.or(`title.ilike.%${search}%,source_name.ilike.%${search}%,dest_name.ilike.%${search}%`);
      }
      const response = await result(query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1));
      return response;
    });
  },

  async getViharDetails(viharId) {
    if (!viharId) return { data: null, error: new Error('A Vihar id is required.') };
    try {
      const { data: vihar, error } = await supabase.from('vihars').select(VIHAR_FIELDS).eq('id', viharId).single();
      if (error) throw error;
      const [subVihars, participants, handovers, holds, locations, routeEvents, audit] = await Promise.all([
        supabase.from('vihar_subsessions').select('id, vihar_id, sub_vihar_number, title, status, source_name, dest_name, started_at, completed_at, created_at, vihar_participants(id, user_id, role, is_current_responsible, joined_at, left_at, profiles:user_id(id, full_name, phone, area, status))').eq('vihar_id', viharId).order('sub_vihar_number'),
        supabase.from('vihar_participants').select('id, vihar_id, sub_vihar_id, user_id, role, is_current_responsible, joined_at, left_at, created_at, profiles:user_id(id, full_name, phone, area, status)').eq('vihar_id', viharId).order('created_at', { ascending: false }),
        supabase.from('vihar_handover').select('id, vihar_id, from_sub_vihar_id, to_sub_vihar_id, handed_over_by, handed_over_to, next_sevak_name, handover_location_name, handover_time, status, notes, created_at, from_profile:handed_over_by(full_name, phone), to_profile:handed_over_to(full_name, phone)').eq('vihar_id', viharId).order('handover_time', { ascending: false }),
        supabase.from('vihar_holds').select('id, vihar_id, sub_vihar_id, user_id, reason, location_name, hold_start, hold_end, duration_minutes, status, notes, created_at, profiles:user_id(full_name, phone)').eq('vihar_id', viharId).order('created_at', { ascending: false }),
        supabase.from('vihar_locations').select('id, vihar_id, sub_vihar_id, user_id, latitude, longitude, accuracy_meters, recorded_at, synced_at').eq('vihar_id', viharId).order('recorded_at', { ascending: false }).limit(25),
        supabase.from('route_events').select('id, vihar_id, event_type, severity, message, latitude, longitude, metadata, acknowledged_by, created_at').eq('vihar_id', viharId).order('created_at', { ascending: false }).limit(25),
        supabase.from('audit_logs').select('id, actor_id, action, entity, entity_id, details, created_at').eq('entity_id', viharId).order('created_at', { ascending: false }).limit(50),
      ]);
      const failed = [subVihars, participants, handovers, holds, locations, routeEvents, audit].find((item) => item.error);
      if (failed) throw failed.error;
      return { data: { vihar, subVihars: subVihars.data || [], participants: participants.data || [], handovers: handovers.data || [], holds: holds.data || [], locations: locations.data || [], routeEvents: routeEvents.data || [], audit: audit.data || [] }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};
