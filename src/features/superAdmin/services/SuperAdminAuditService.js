import { supabase } from '../../../core/config/supabase';

const PAGE_SIZE = 25;
const OVERVIEW_SAMPLE_SIZE = 100;
const SENSITIVE_KEY_PARTS = [
  'password', 'token', 'secret', 'credential', 'private_key', 'api_key',
  'emergency_contact', 'medical', 'blood_group', 'phone', 'email',
];

const errorMessage = (error) => error?.message || 'The audit log query failed.';
const isSensitiveKey = (key = '') => SENSITIVE_KEY_PARTS.some((part) => key.toLowerCase().includes(part));

const redactValue = (value, key = '') => {
  if (isSensitiveKey(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((result, [childKey, childValue]) => {
      result[childKey] = redactValue(childValue, childKey);
      return result;
    }, {});
  }
  return value;
};

const formatDetails = (details) => JSON.stringify(redactValue(details || {}), null, 2);

const applyFilters = (query, filters = {}) => {
  const { recordId, action, entity, actorId, dateFrom, dateTo } = filters;
  let nextQuery = query;
  if (recordId?.trim()) nextQuery = nextQuery.eq('id', recordId.trim());
  if (action?.trim()) nextQuery = nextQuery.ilike('action', `%${action.trim().replace(/[%(),]/g, ' ')}%`);
  if (entity?.trim()) nextQuery = nextQuery.ilike('entity', `%${entity.trim().replace(/[%(),]/g, ' ')}%`);
  if (actorId?.trim()) nextQuery = nextQuery.eq('actor_id', actorId.trim());
  if (dateFrom) nextQuery = nextQuery.gte('created_at', dateFrom);
  if (dateTo) nextQuery = nextQuery.lte('created_at', dateTo);
  return nextQuery;
};

const mapRecord = (record) => ({
  ...record,
  safeDetails: formatDetails(record.details),
});

const baseQuery = () => supabase
  .from('audit_logs')
  .select('id, actor_id, action, entity, entity_id, details, created_at', { count: 'exact' });

const distribution = (records, field) => records.reduce((result, record) => {
  const value = record[field] || 'UNKNOWN';
  result[value] = (result[value] || 0) + 1;
  return result;
}, {});

export const superAdminAuditService = {
  pageSize: PAGE_SIZE,

  async listAuditLogs(filters = {}, page = 0) {
    try {
      const { data, count, error } = await applyFilters(baseQuery(), filters)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return { data: (data || []).map(mapRecord), count: count || 0, error: null };
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },

  async getAuditLogDetails(id) {
    if (!id) return { data: null, error: new Error('An audit record id is required.') };
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, actor_id, action, entity, entity_id, details, created_at')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { data: mapRecord(data), error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getSecurityOverview(filters = {}) {
    try {
      const { data, count, error } = await applyFilters(baseQuery(), filters)
        .order('created_at', { ascending: false })
        .limit(OVERVIEW_SAMPLE_SIZE);
      if (error) throw error;
      const records = data || [];
      const failedOperations = records.filter((record) => record.action.endsWith('_FAILED')).length;
      const securityEvents = records.filter((record) => [
        'SEVAK_HARD_DELETE_FAILED',
        'SEVAK_HARD_DELETED',
      ].includes(record.action)).length;
      return {
        data: {
          totalRecords: count || 0,
          actionDistribution: distribution(records, 'action'),
          entityDistribution: distribution(records, 'entity'),
          recentSecurityEvents: records
            .filter((record) => record.action.includes('SECURITY') || record.action.includes('HARD_DELETE'))
            .slice(0, 10)
            .map(mapRecord),
          failedOperations,
          securityEvents,
          sampleSize: records.length,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  },
};

export { formatDetails };
