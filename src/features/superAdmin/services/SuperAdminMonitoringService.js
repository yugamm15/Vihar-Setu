import { supabase } from '../../../core/config/supabase';

const PAGE_SIZE = 25;
const errorMessage = (error) => error?.message || 'The database query failed.';

const run = async (label, query) => {
  const { data, error, count } = await query;
  if (error) throw new Error(`${label}: ${errorMessage(error)}`);
  return { data: data || [], count };
};

const count = async (label, query) => {
  const result = await run(label, query);
  return result.count ?? 0;
};

const settled = async (section, operation) => {
  try {
    return { section, data: await operation(), error: null };
  } catch (error) {
    return { section, data: null, error: error.message };
  }
};

const mapEmergency = (record, attempts) => ({
  ...record,
  attempts: attempts.filter((attempt) => attempt.emergency_id === record.id),
});

export const superAdminMonitoringService = {
  pageSize: PAGE_SIZE,

  async fetchOverview() {
    const sections = await Promise.all([
      settled('registeredUsers', async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            status,
            user_roles (
              role
            )
          `);
        if (error) throw error;
        const validUsers = (data || []).filter(u => {
          if (u.status === 'REJECTED') return false;
          const roles = (u.user_roles || []).map(r => r.role);
          if (roles.includes('SUPER_ADMIN')) return false;
          return true;
        });
        return validUsers.length;
      }),
      settled('activeVihars', () => count(
        'Active Vihars',
        supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE')
      )),
      settled('activeSubVihars', () => count(
        'Active Sub-Vihars',
        supabase.from('vihar_subsessions').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE')
      )),
      settled('activeEmergencies', () => count(
        'Active emergencies',
        supabase.from('emergencies').select('id', { count: 'exact', head: true }).in('status', ['TRIGGERED', 'ESCALATING', 'RESPONDED'])
      )),
      settled('recentRouteEvents', () => run(
        'Recent route events',
        supabase.from('route_events').select('id, vihar_id, event_type, severity, message, created_at').order('created_at', { ascending: false }).limit(10)
      ).then((result) => result.data)),
      settled('activeHolds', () => count(
        'Active Holds',
        supabase.from('vihar_holds').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE')
      )),
      settled('recentHandovers', () => run(
        'Recent handovers',
        supabase.from('vihar_handover').select('id, vihar_id, status, handover_location_name, handover_time').order('handover_time', { ascending: false }).limit(10)
      ).then((result) => result.data)),
      settled('deviceStatuses', async () => {
        try {
          const { data, error } = await supabase
            .from('device_status')
            .select('id, user_id, network_status, last_heartbeat, battery_percentage, gps_enabled, app_state, updated_at')
            .order('last_heartbeat', { ascending: false })
            .limit(25);
          if (error) return [];
          return data || [];
        } catch {
          return [];
        }
      }),
      settled('recentActivity', () => run(
        'Recent system activity',
        supabase.from('audit_logs').select('id, action, entity, entity_id, created_at').order('created_at', { ascending: false }).limit(10)
      ).then((result) => result.data)),
    ]);

    const data = {};
    const errors = [];
    sections.forEach(({ section, data: value, error }) => {
      data[section] = value;
      if (error) errors.push({ section, message: error });
    });
    return { data, errors };
  },

  async listEmergencies(page = 0) {
    try {
      const from = page * PAGE_SIZE;
      const emergencyResult = await run(
        'Emergency history',
        supabase.from('emergencies')
          .select('id, vihar_id, status, trigger_type, triggered_at, resolved_at', { count: 'exact' })
          .order('triggered_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1)
      );
      const ids = emergencyResult.data.map((record) => record.id);
      let attempts = [];
      let attemptsError = null;
      if (ids.length) {
        try {
          const attemptResult = await run(
            'Emergency escalation attempts',
            supabase.from('emergency_attempts')
              .select('id, emergency_id, attempt_number, status, notified_at, responded_at')
              .in('emergency_id', ids)
              .order('attempt_number', { ascending: true })
          );
          attempts = attemptResult.data;
        } catch (error) {
          attemptsError = error;
        }
      }
      return {
        data: emergencyResult.data.map((record) => mapEmergency(record, attempts)),
        count: emergencyResult.count || 0,
        error: attemptsError,
      };
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },

  async listDevices(page = 0) {
    try {
      const from = page * PAGE_SIZE;
      const { data, error, count } = await supabase
        .from('device_status')
        .select('id, user_id, vihar_id, battery_percentage, is_charging, network_status, network_type, gps_enabled, gps_accuracy_meters, app_state, last_heartbeat, created_at, updated_at', { count: 'exact' })
        .order('last_heartbeat', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) return { data: [], count: 0, error: null };
      return { data: data || [], count: count || 0, error: null };
    } catch {
      return { data: [], count: 0, error: null };
    }
  },

  async fetchSystemHealth() {
    const [settings, activity] = await Promise.all([
      settled('systemSettings', () => run(
        'System settings',
        supabase.from('system_settings').select('key, value, description, updated_at').order('key', { ascending: true })
      ).then((result) => result.data)),
      settled('auditActivity', () => run(
        'System activity',
        supabase.from('audit_logs').select('id, action, entity, entity_id, details, created_at').order('created_at', { ascending: false }).limit(25)
      ).then((result) => result.data)),
    ]);
    const data = { systemSettings: settings.data, auditActivity: activity.data };
    const errors = [settings, activity]
      .filter((result) => result.error)
      .map((result) => ({ section: result.section, message: result.error }));
    return {
      data,
      errors,
      unavailable: ['Supabase service health', 'SMS delivery health', 'Push delivery health', 'Scheduled watchdog status'],
    };
  },
};
