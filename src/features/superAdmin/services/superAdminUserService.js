import { supabase } from '../../../core/config/supabase';

const PROFILE_FIELDS = 'id, full_name, phone, email, avatar_url, status, city, area, created_at, updated_at, rejection_reason';
const PAGE_SIZE = 25;

const roleName = (user) => user?.user_roles?.[0]?.roles?.name || null;

const mapUser = (user) => ({
  ...user,
  role: roleName(user),
  user_roles: undefined,
});

const errorMessage = (error) => error?.message || 'The database query failed.';

const applyUserFilters = (query, filters = {}) => {
  const { role, status, city, area, search, registeredFrom, registeredTo } = filters;
  let nextQuery = query;

  if (role && role !== 'ALL') {
    nextQuery = nextQuery.eq('user_roles.roles.name', role);
  }
  if (status && status !== 'ALL') nextQuery = nextQuery.eq('status', status);
  if (city) nextQuery = nextQuery.ilike('city', `%${city}%`);
  if (area) nextQuery = nextQuery.ilike('area', `%${area}%`);
  if (registeredFrom) nextQuery = nextQuery.gte('created_at', registeredFrom);
  if (registeredTo) nextQuery = nextQuery.lte('created_at', registeredTo);
  if (search?.trim()) {
    const value = search.trim().replace(/[%(),]/g, ' ');
    nextQuery = nextQuery.or(
      `full_name.ilike.%${value}%,phone.ilike.%${value}%,email.ilike.%${value}%`
    );
  }
  return nextQuery;
};

const baseUserQuery = (options = {}) => {
  let query = supabase
    .from('profiles')
    .select(`${PROFILE_FIELDS}, user_roles!inner(roles!inner(name))`, options);
  return query;
};

const runListQuery = async (filters, page) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const query = applyUserFilters(baseUserQuery({ count: 'exact' }), filters)
    .order('created_at', { ascending: false })
    .range(from, to);
  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data || []).map(mapUser), count: count || 0 };
};

const runActivityQuery = async (label, query, mapRecord = (record) => record) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${errorMessage(error)}`);
  return (data || []).map(mapRecord);
};

export const superAdminUserService = {
  pageSize: PAGE_SIZE,

  async approveUser(userId) {
    const { data, error } = await supabase.rpc('super_admin_approve_profile', { p_user_id: userId });
    return { data, error };
  },

  async setUserStatus(userId, status) {
    const { data, error } = await supabase.rpc('super_admin_set_profile_status', {
      p_user_id: userId,
      p_status: status,
    });
    return { data, error };
  },

  async listUsers(filters = {}, page = 0) {
    try {
      return { ...(await runListQuery(filters, page)), error: null };
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },

  async getUserDetails(userId) {
    if (!userId) return { data: null, error: new Error('A user id is required.') };

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`${PROFILE_FIELDS}, user_roles!inner(roles!inner(name))`)
        .eq('id', userId)
        .single();
      if (profileError) throw profileError;

      const queries = [
        ['vihars', supabase.from('vihar_participants').select('id, vihar_id, sub_vihar_id, role, is_current_responsible, joined_at, left_at, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)],
        ['holds', supabase.from('vihar_holds').select('id, vihar_id, sub_vihar_id, reason, location_name, hold_start, hold_end, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)],
        ['handovers', supabase.from('vihar_handover').select('id, vihar_id, from_sub_vihar_id, to_sub_vihar_id, handed_over_by, handed_over_to, handover_location_name, handover_time, status, created_at').or(`handed_over_by.eq.${userId},handed_over_to.eq.${userId}`).order('created_at', { ascending: false }).limit(50)],
        ['emergencies', supabase.from('emergencies').select('id, vihar_id, status, trigger_type, triggered_at, resolved_at').eq('user_id', userId).order('triggered_at', { ascending: false }).limit(50)],
        ['auditLogs', supabase.from('audit_logs').select('id, actor_id, action, entity, entity_id, details, created_at').or(`actor_id.eq.${userId},entity_id.eq.${userId}`).order('created_at', { ascending: false }).limit(50)],
      ];

      const results = await Promise.all(
        queries.map(async ([key, query]) => {
          try {
            return { key, data: await runActivityQuery(key, query) };
          } catch (error) {
            return { key, data: [], error: error.message };
          }
        })
      );

      const activity = {};
      const errors = [];
      results.forEach((result) => {
        activity[result.key] = result.data;
        if (result.error) errors.push({ section: result.key, message: result.error });
      });

      const subViharIds = (activity.vihars || []).map((record) => record.sub_vihar_id).filter(Boolean);
      if (subViharIds.length) {
        const { data: subVihars, error: subViharError } = await supabase
          .from('vihar_subsessions')
          .select('id, vihar_id, sub_vihar_number, status, started_at, completed_at')
          .in('id', subViharIds);
        activity.subVihars = subVihars || [];
        if (subViharError) errors.push({ section: 'subVihars', message: errorMessage(subViharError) });
      } else {
        activity.subVihars = [];
      }

      return { data: { profile: mapUser(profile), activity }, errors, error: null };
    } catch (error) {
      return { data: null, errors: [], error };
    }
  },
};
