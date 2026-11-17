import { supabase } from '../../../core/config/supabase';

const PROFILE_FIELDS = 'id, full_name, phone, email, avatar_url, status, city, area, created_at, updated_at, rejection_reason';
const PAGE_SIZE = 25;

const getUserRoles = (user) => {
  if (!user?.user_roles) return [];
  const list = Array.isArray(user.user_roles) ? user.user_roles : [user.user_roles];
  const roleNames = list.map((ur) => ur.roles?.name).filter(Boolean);
  return Array.from(new Set(roleNames));
};

const formatRoleDisplay = (roles) => {
  if (!roles || roles.length === 0) return 'Unassigned';
  if (roles.includes('ADMIN') && roles.includes('SEVAK')) return 'ADMIN & SEVAK';
  return roles.join(' & ');
};

const mapUser = (user, explicitRoles = null) => {
  const roles = explicitRoles && explicitRoles.length > 0 ? explicitRoles : getUserRoles(user);
  return {
    ...user,
    role: formatRoleDisplay(roles),
    roles,
    isDualRole: roles.includes('ADMIN') && roles.includes('SEVAK'),
    user_roles: undefined,
  };
};

const errorMessage = (error) => error?.message || 'The database query failed.';

const getSuperAdminUserIds = async () => {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, roles!inner(name)')
      .eq('roles.name', 'SUPER_ADMIN');
    return (data || []).map((r) => r.user_id).filter(Boolean);
  } catch (error) {
    console.warn('[superAdminUserService] getSuperAdminUserIds error:', error?.message);
    return [];
  }
};

const applyUserFilters = (query, filters = {}, superAdminIds = []) => {
  const { role, status, city, area, search, registeredFrom, registeredTo } = filters;
  let nextQuery = query;

  if (role && role !== 'ALL') {
    nextQuery = nextQuery.eq('user_roles.roles.name', role);
  } else {
    // 'ALL' tab: Super Admin is NOT an ordinary user, exclude from general user directory & counts
    if (superAdminIds.length > 0) {
      nextQuery = nextQuery.not('id', 'in', `(${superAdminIds.join(',')})`);
    }
  }

  // Default 'ALL': If a sevak is rejected, they should NOT be counted as an active user or shown in default view
  if (status && status !== 'ALL') {
    nextQuery = nextQuery.eq('status', status);
  } else {
    // Exclude REJECTED accounts from the default 'ALL' view
    nextQuery = nextQuery.neq('status', 'REJECTED');
  }

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

const baseUserQuery = (options = {}, filters = {}) => {
  const hasRoleFilter = filters.role && filters.role !== 'ALL';
  const roleRelation = hasRoleFilter
    ? 'user_roles:user_roles!user_roles_user_id_fkey!inner(roles!inner(name))'
    : 'user_roles:user_roles!user_roles_user_id_fkey(roles(name))';
  let query = supabase
    .from('profiles')
    .select(`${PROFILE_FIELDS}, ${roleRelation}`, options);
  return query;
};

const runListQuery = async (filters, page) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const superAdminIds = await getSuperAdminUserIds();
  const query = applyUserFilters(baseUserQuery({ count: 'exact' }, filters), filters, superAdminIds)
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const profiles = data || [];
  const userIds = profiles.map((p) => p.id).filter(Boolean);

  // Fetch all assigned roles for users on this page to ensure dual-roles (e.g. ADMIN & SEVAK) are always complete
  let rolesMap = {};
  if (userIds.length > 0) {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, roles(name)')
        .in('user_id', userIds);

      (rolesData || []).forEach((r) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        const rName = r.roles?.name;
        if (rName && !rolesMap[r.user_id].includes(rName)) {
          rolesMap[r.user_id].push(rName);
        }
      });
    } catch (e) {
      console.warn('[superAdminUserService] Could not fetch supplementary roles:', e?.message);
    }
  }

  return {
    data: profiles.map((p) => mapUser(p, rolesMap[p.id])),
    count: count || 0,
  };
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

  async rejectUser(userId, reason = 'Application rejected by Super Administrator') {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          status: 'REJECTED',
          rejection_reason: reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select();
      return { data: data?.[0] || null, error };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  async reinstateUser(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          status: 'ACTIVE',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select();
      return { data: data?.[0] || null, error };
    } catch (e) {
      return { data: null, error: e };
    }
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
        .select(`${PROFILE_FIELDS}, user_roles:user_roles!user_roles_user_id_fkey(roles(name))`)
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
