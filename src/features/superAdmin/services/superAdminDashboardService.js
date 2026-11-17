import { supabase } from '../../../core/config/supabase';

const emptyDashboard = () => ({
  organization: {
    totalUsers: null,
    totalSevaks: null,
    totalAdministrators: null,
    totalSuperAdministrators: null,
    activeAccounts: null,
    disabledAccounts: null,
    pendingRegistrations: null,
  },
  operations: {
    totalAreas: null,
    totalCities: null,
    activeVihars: null,
    activeSubVihars: null,
    completedVihars: null,
  },
  safety: {
    activeEmergencies: null,
    routeDeviations: null,
    activeHolds: null,
    recentHandovers: null,
    offlineDevices: null,
  },
  recentActivity: [],
});

const getErrorMessage = (error) => error?.message || 'The database query failed.';

const count = async (label, query) => {
  const { count: value, error } = await query;
  if (error) {
    throw new Error(`${label}: ${getErrorMessage(error)}`);
  }
  return value ?? 0;
};

const countDistinctCities = async () => {
  const { data, error } = await supabase.from('areas').select('city').eq('is_active', true);
  if (error) throw new Error(`Total cities: ${getErrorMessage(error)}`);
  return new Set((data || []).map((area) => area.city).filter(Boolean)).size;
};

const queryActivity = async (label, query, mapRecord) => {
  const { data, error } = await query;
  if (error) {
    throw new Error(`${label}: ${getErrorMessage(error)}`);
  }
  return (data || []).map(mapRecord);
};

export const superAdminDashboardService = {
  async fetchDashboard() {
    const dashboard = emptyDashboard();
    const errors = [];

    const metricQueries = [
      ['totalUsers', () => count('Total users', supabase.from('profiles').select('id', { count: 'exact', head: true }))],
      ['totalSevaks', () => count('Total Sevaks', supabase.from('user_roles').select('user_id, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'SEVAK'))],
      ['totalAdministrators', () => count('Total Administrators', supabase.from('user_roles').select('user_id, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'ADMIN'))],
      ['totalSuperAdministrators', () => count('Total Super Administrators', supabase.from('user_roles').select('user_id, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'SUPER_ADMIN'))],
      ['activeAccounts', () => count('Active accounts', supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'))],
      ['disabledAccounts', () => count('Disabled accounts', supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'DISABLED'))],
      ['pendingRegistrations', () => count('Pending registrations', supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'))],
    ];

    const operationQueries = [
      ['totalAreas', () => count('Total areas', supabase.from('areas').select('id', { count: 'exact', head: true }).eq('is_active', true))],
      ['totalCities', countDistinctCities],
      ['activeVihars', () => count('Active Vihars', supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'))],
      ['activeSubVihars', () => count('Active Sub-Vihars', supabase.from('vihar_subsessions').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'))],
      ['completedVihars', () => count('Completed Vihars', supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'))],
    ];

    const safetyQueries = [
      ['activeEmergencies', () => count('Active emergencies', supabase.from('emergencies').select('id', { count: 'exact', head: true }).in('status', ['TRIGGERED', 'ESCALATING', 'RESPONDED']))],
      ['routeDeviations', () => count('Route deviations', supabase.from('route_events').select('id', { count: 'exact', head: true }).in('event_type', ['DEVIATION_LEVEL_1', 'DEVIATION_LEVEL_2']))],
      ['activeHolds', () => count('Active Holds', supabase.from('vihar_holds').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'))],
      ['recentHandovers', () => count('Recent handovers', supabase.from('vihar_handover').select('id', { count: 'exact', head: true }).gte('handover_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()))],
      ['offlineDevices', () => count('Offline devices', supabase.from('device_status').select('id', { count: 'exact', head: true }).in('network_status', ['OFFLINE', 'POOR_CONNECTIVITY']))],
    ];

    const settledMetrics = await Promise.all(
      [...metricQueries, ...operationQueries, ...safetyQueries].map(async ([key, run]) => {
        try {
          return { key, value: await run() };
        } catch (error) {
          errors.push({ section: key, message: error.message });
          return { key, value: null };
        }
      })
    );

    settledMetrics.forEach(({ key, value }) => {
      if (key in dashboard.organization) dashboard.organization[key] = value;
      else if (key in dashboard.operations) dashboard.operations[key] = value;
      else dashboard.safety[key] = value;
    });

    const activityQueries = [
      queryActivity(
        'Emergency activity',
        supabase.from('emergencies').select('id, status, trigger_type, triggered_at').order('triggered_at', { ascending: false }).limit(5),
        (record) => ({
          id: `emergency-${record.id}`,
          type: 'EMERGENCY',
          title: record.status === 'RESOLVED' ? 'Emergency resolved' : 'Emergency event',
          detail: record.trigger_type || 'Safety event',
          timestamp: record.triggered_at,
        })
      ),
      queryActivity(
        'Administrative activity',
        supabase.from('audit_logs').select('id, action, entity, created_at, details').order('created_at', { ascending: false }).limit(5),
        (record) => ({
          id: `audit-${record.id}`,
          type: 'ADMIN',
          title: record.action || 'Administrative change',
          detail: record.entity || 'System record',
          timestamp: record.created_at,
        })
      ),
      queryActivity(
        'Registration activity',
        supabase.from('profiles').select('id, full_name, status, created_at').order('created_at', { ascending: false }).limit(5),
        (record) => ({
          id: `registration-${record.id}`,
          type: 'REGISTRATION',
          title: 'Registration record',
          detail: `${record.full_name || 'Unnamed account'} · ${record.status || 'Unknown status'}`,
          timestamp: record.created_at,
        })
      ),
      queryActivity(
        'Handover activity',
        supabase.from('vihar_handover').select('id, status, handover_time, handover_location_name').order('handover_time', { ascending: false }).limit(5),
        (record) => ({
          id: `handover-${record.id}`,
          type: 'HANDOVER',
          title: 'Vihar handover',
          detail: record.handover_location_name || record.status || 'Handover record',
          timestamp: record.handover_time,
        })
      ),
    ];

    const settledActivity = await Promise.all(
      activityQueries.map(async (query) => {
        try {
          return await query;
        } catch (error) {
          errors.push({ section: 'recentActivity', message: error.message });
          return [];
        }
      })
    );

    dashboard.recentActivity = settledActivity
      .flat()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    return { data: dashboard, errors };
  },
};
