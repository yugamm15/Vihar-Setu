import { supabase } from '../../../core/config/supabase';

const PAGE_SIZE = 25;
const PROFILE_FIELDS = 'id, full_name, phone, email, avatar_url, status, city, area, created_at, updated_at';

const errorMessage = (error) => error?.message || 'The database query failed.';

const mapAdministrator = (record) => ({
  ...record.profiles,
  administratorId: record.id,
  assignedArea: record.areas || null,
  administratorStatus: record.is_active ? 'ACTIVE' : 'DISABLED',
  isActive: record.is_active,
  assignmentCreatedAt: record.created_at,
  assignmentUpdatedAt: record.updated_at,
  permissionsSummary: record.permissions || {},
});

const applyFilters = (query, filters = {}) => {
  const { status, city, area, search, registeredFrom, registeredTo } = filters;
  let nextQuery = query;

  if (status && status !== 'ALL') nextQuery = nextQuery.eq('profiles.status', status);
  if (city) nextQuery = nextQuery.ilike('profiles.city', `%${city}%`);
  if (area) nextQuery = nextQuery.ilike('areas.name', `%${area}%`);
  if (registeredFrom) nextQuery = nextQuery.gte('profiles.created_at', registeredFrom);
  if (registeredTo) nextQuery = nextQuery.lte('profiles.created_at', registeredTo);
  if (search?.trim()) {
    const value = search.trim().replace(/[%(),]/g, ' ');
    nextQuery = nextQuery.or(
      `full_name.ilike.%${value}%,phone.ilike.%${value}%,email.ilike.%${value}%`,
      { foreignTable: 'profiles' }
    );
  }
  return nextQuery;
};

const baseQuery = () => supabase
  .from('administrators')
  .select(
    `id, area_id, permissions, is_active, created_at, updated_at,
     profiles:user_id!inner(${PROFILE_FIELDS}),
     areas:area_id(id, name, city, state)`,
    { count: 'exact' }
  );

const activityQuery = async (label, query) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${errorMessage(error)}`);
  return data || [];
};

export const superAdminAdministratorService = {
  pageSize: PAGE_SIZE,

  async updateAdministrator(administratorId, changes) {
    const { data, error } = await supabase.rpc('super_admin_update_administrator', {
      p_administrator_id: administratorId,
      p_is_active: changes.isActive ?? null,
      p_area_id: changes.areaId ?? null,
      p_permissions: changes.permissions ?? null,
    });
    return { data, error };
  },

  async listAdministrators(filters = {}, page = 0) {
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await applyFilters(baseQuery(), filters)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return {
        data: (data || []).map(mapAdministrator),
        count: count || 0,
        error: null,
      };
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },

  async getAdministratorDetails(administratorId) {
    if (!administratorId) {
      return { data: null, errors: [], error: new Error('An administrator id is required.') };
    }

    try {
      const { data: record, error: recordError } = await supabase
        .from('administrators')
        .select(
          `id, area_id, permissions, is_active, created_at, updated_at,
           profiles:user_id!inner(${PROFILE_FIELDS}),
           areas:area_id(id, name, city, state)`
        )
        .eq('id', administratorId)
        .single();
      if (recordError) throw recordError;

      const results = await Promise.all([
        activityQuery(
          'Granular permissions',
          supabase
            .from('admin_permissions')
            .select('id, permission_key, is_granted, granted_by, created_at, updated_at')
            .eq('admin_id', administratorId)
            .order('permission_key', { ascending: true })
        ),
        activityQuery(
          'Audit history',
          supabase
            .from('audit_logs')
            .select('id, actor_id, action, entity, entity_id, details, created_at')
            .or(`entity_id.eq.${record.profiles.id},actor_id.eq.${record.profiles.id}`)
            .order('created_at', { ascending: false })
            .limit(50)
        ),
      ].map(async (promise) => {
        try {
          return { data: await promise };
        } catch (error) {
          return { data: [], error: error.message };
        }
      }));

      const errors = results.filter((result) => result.error).map((result) => ({
        section: result.error.includes('Granular') ? 'permissions' : 'audit',
        message: result.error,
      }));

      return {
        data: {
          administrator: mapAdministrator(record),
          permissions: results[0].data,
          auditHistory: results[1].data,
        },
        errors,
        error: null,
      };
    } catch (error) {
      return { data: null, errors: [], error };
    }
  },
};
