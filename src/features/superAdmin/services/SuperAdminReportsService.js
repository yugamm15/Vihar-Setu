import { supabase } from '../../../core/config/supabase';
import { calculateDurationMins, formatDurationMins } from '../utils/reportDateUtils';

const dateFilter = (query, field, range = {}) => {
  let next = query;
  if (range.from) next = next.gte(field, range.from.length === 10 ? `${range.from}T00:00:00.000Z` : range.from);
  if (range.to) next = next.lte(field, range.to.length === 10 ? `${range.to}T23:59:59.999Z` : range.to);
  return next;
};

const queryRows = async (label, query) => {
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn(`[ReportsService] ${label}:`, error.message);
    return [];
  }
};

const queryCount = async (label, query) => {
  try {
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.warn(`[ReportsService] Count for ${label}:`, error.message);
    return 0;
  }
};

const bucketByDay = (rows, field) => rows.reduce((buckets, row) => {
  if (!row[field]) return buckets;
  const day = String(row[field]).slice(0, 10);
  buckets[day] = (buckets[day] || 0) + 1;
  return buckets;
}, {});

const countBy = (rows, field) => rows.reduce((buckets, row) => {
  const value = row[field] || 'UNKNOWN';
  buckets[value] = (buckets[value] || 0) + 1;
  return buckets;
}, {});

const toSeries = (buckets) => Object.entries(buckets)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([label, value]) => ({ label, value }));

export const superAdminReportsService = {
  /**
   * Fetch top-level executive metrics for Reports Dashboard
   */
  async fetchOverviewMetrics(range = {}) {
    try {
      const [
        totalUsers,
        activeUsers,
        disabledUsers,
        pendingUsers,
        totalAdmins,
        totalVihars,
        activeVihars,
        completedVihars,
        heldVihars,
        totalDistanceData,
        emergencies,
        attempts,
        totalNotifications,
        unreadNotifications,
        totalHolds,
        totalHandovers,
        routeDeviations,
      ] = await Promise.all([
        queryCount('Total users', dateFilter(supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('status', 'REJECTED'), 'created_at', range)),
        queryCount('Active users', dateFilter(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'), 'created_at', range)),
        queryCount('Disabled users', dateFilter(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'DISABLED'), 'created_at', range)),
        queryCount('Pending users', dateFilter(supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'), 'created_at', range)),
        queryCount('Total administrators', dateFilter(supabase.from('administrators').select('id', { count: 'exact', head: true }), 'created_at', range)),
        queryCount('Total vihars', dateFilter(supabase.from('vihars').select('id', { count: 'exact', head: true }), 'created_at', range)),
        queryCount('Active vihars', dateFilter(supabase.from('vihars').select('id', { count: 'exact', head: true }).in('status', ['IN_TRANSIT', 'ACTIVE']), 'created_at', range)),
        queryCount('Completed vihars', dateFilter(supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'), 'created_at', range)),
        queryCount('Held vihars', dateFilter(supabase.from('vihars').select('id', { count: 'exact', head: true }).eq('status', 'HELD'), 'created_at', range)),
        queryRows('Total distance', dateFilter(supabase.from('vihars').select('total_distance_km'), 'created_at', range)),
        queryRows('Emergencies', dateFilter(supabase.from('emergencies').select('id, status, triggered_at, resolved_at'), 'triggered_at', range)),
        queryRows('Attempts', dateFilter(supabase.from('emergency_attempts').select('notified_at, responded_at, status'), 'notified_at', range)),
        queryCount('Total notifications', dateFilter(supabase.from('notifications').select('id', { count: 'exact', head: true }), 'created_at', range)),
        queryCount('Unread notifications', dateFilter(supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false), 'created_at', range)),
        queryCount('Holds', dateFilter(supabase.from('vihar_holds').select('id', { count: 'exact', head: true }), 'created_at', range)),
        queryCount('Handovers', dateFilter(supabase.from('vihar_handover').select('id', { count: 'exact', head: true }), 'created_at', range)),
        queryCount('Route deviations', dateFilter(supabase.from('route_events').select('id', { count: 'exact', head: true }), 'created_at', range)),
      ]);

      // Calculate total distance
      const totalKm = (totalDistanceData || []).reduce((sum, item) => sum + (Number(item.total_distance_km) || 0), 0);

      // Emergency status counts
      const totalEmergencies = emergencies.length;
      const resolvedEmergencies = emergencies.filter((e) => e.status === 'RESOLVED').length;
      const falseAlarms = emergencies.filter((e) => e.status === 'FALSE_ALARM').length;
      const activeEmergencies = emergencies.filter((e) => ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(e.status)).length;

      // Calculate average response time accurately if reliable timestamps exist
      // First try attempt response times: responded_at - notified_at
      let totalResponseMins = 0;
      let validResponseCount = 0;

      attempts.forEach((att) => {
        if (att.notified_at && att.responded_at) {
          const diff = calculateDurationMins(att.notified_at, att.responded_at);
          if (diff !== null && diff >= 0 && diff <= 1440) {
            totalResponseMins += diff;
            validResponseCount++;
          }
        }
      });

      // Fallback: resolved_at - triggered_at for resolved emergencies
      if (validResponseCount === 0) {
        emergencies.forEach((em) => {
          if (em.triggered_at && em.resolved_at) {
            const diff = calculateDurationMins(em.triggered_at, em.resolved_at);
            if (diff !== null && diff >= 0 && diff <= 1440) {
              totalResponseMins += diff;
              validResponseCount++;
            }
          }
        });
      }

      const avgResponseMins = validResponseCount > 0 ? (totalResponseMins / validResponseCount).toFixed(1) : null;
      const avgResponseTimeStr = avgResponseMins !== null ? `${avgResponseMins} min` : '—';

      return {
        data: {
          totalUsers,
          activeUsers,
          disabledUsers,
          pendingUsers,
          totalAdmins,
          totalVihars,
          activeVihars,
          completedVihars,
          heldVihars,
          totalDistanceKm: totalKm.toFixed(1),
          totalEmergencies,
          resolvedEmergencies,
          falseAlarms,
          activeEmergencies,
          avgResponseTime: avgResponseTimeStr,
          totalNotifications,
          unreadNotifications,
          totalHolds,
          totalHandovers,
          routeDeviations,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Fetch User Reports
   */
  async fetchUserReports(filters = {}, range = {}) {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, phone, city, area, status, created_at', { count: 'exact' });

      query = dateFilter(query, 'created_at', range);

      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      } else {
        // Exclude rejected users from default count & list
        query = query.neq('status', 'REJECTED');
      }
      if (filters.area && filters.area.trim()) {
        query = query.ilike('area', `%${filters.area.trim()}%`);
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim().replace(/[%(),]/g, ' ');
        query = query.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%,city.ilike.%${s}%`);
      }

      const limit = filters.limit || 50;
      const offset = (filters.page || 0) * limit;

      const [profiles, totalCount, rolesData] = await Promise.all([
        queryRows('Profiles list', query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)),
        queryCount('Total profiles count', query),
        queryRows('User roles', supabase.from('user_roles').select('user_id, roles!inner(name)')),
      ]);

      // Map all roles per user to support dual-role (e.g. ADMIN & SEVAK)
      const userRolesMap = {};
      rolesData.forEach((r) => {
        if (!userRolesMap[r.user_id]) userRolesMap[r.user_id] = [];
        const rName = r.roles?.name;
        if (rName && !userRolesMap[r.user_id].includes(rName)) {
          userRolesMap[r.user_id].push(rName);
        }
      });

      const formatRole = (roles) => {
        if (!roles || roles.length === 0) return 'Unassigned';
        if (roles.includes('ADMIN') && roles.includes('SEVAK')) return 'ADMIN & SEVAK';
        return roles.join(' & ');
      };

      const list = profiles.map((p) => {
        const roles = userRolesMap[p.id] || ['SEVAK'];
        return {
          ...p,
          roles,
          role: formatRole(roles),
        };
      });

      // Filter by role if specified (matching if user holds this role)
      const filteredList = filters.role && filters.role !== 'ALL'
        ? list.filter((u) => u.roles?.includes(filters.role))
        : list;

      return {
        data: {
          total: totalCount,
          list: filteredList,
          statusDistribution: countBy(list, 'status'),
          roleDistribution: countBy(list, 'role'),
          cityDistribution: toSeries(countBy(list, 'city')),
          areaDistribution: toSeries(countBy(list, 'area')),
          registrationTrend: toSeries(bucketByDay(list, 'created_at')),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Fetch Vihar Operational Reports
   */
  async fetchViharReports(filters = {}, range = {}) {
    try {
      let query = supabase
        .from('vihars')
        .select('id, user_id, title, source_name, dest_name, total_distance_km, status, safety_status, started_at, completed_at, created_at, profiles:user_id(full_name, city, area)', { count: 'exact' });

      query = dateFilter(query, 'created_at', range);

      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim().replace(/[%(),]/g, ' ');
        query = query.or(`title.ilike.%${s}%,source_name.ilike.%${s}%,dest_name.ilike.%${s}%`);
      }

      const limit = filters.limit || 50;
      const offset = (filters.page || 0) * limit;

      const [viharsList, totalCount, subsessions, holds, handovers] = await Promise.all([
        queryRows('Vihars list', query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)),
        queryCount('Vihars total count', query),
        queryRows('Sub-vihars', dateFilter(supabase.from('vihar_subsessions').select('id, vihar_id, status'), 'created_at', range)),
        queryRows('Vihar holds', dateFilter(supabase.from('vihar_holds').select('id, vihar_id, reason, status'), 'created_at', range)),
        queryRows('Vihar handovers', dateFilter(supabase.from('vihar_handover').select('id, vihar_id, status'), 'created_at', range)),
      ]);

      // Calculate total & average distance
      const totalKm = viharsList.reduce((acc, v) => acc + (Number(v.total_distance_km) || 0), 0);
      const avgKm = viharsList.length > 0 ? (totalKm / viharsList.length).toFixed(1) : 0;

      // Calculate average duration for completed vihars
      let totalMins = 0;
      let completedCount = 0;
      viharsList.forEach((v) => {
        if (v.started_at && v.completed_at) {
          const diff = calculateDurationMins(v.started_at, v.completed_at);
          if (diff !== null && diff >= 0) {
            totalMins += diff;
            completedCount++;
          }
        }
      });
      const avgDurationMins = completedCount > 0 ? Math.round(totalMins / completedCount) : null;

      // Area-wise Vihars based on creator profile area
      const areaBuckets = {};
      viharsList.forEach((v) => {
        const area = v.profiles?.area || 'Unassigned Area';
        areaBuckets[area] = (areaBuckets[area] || 0) + 1;
      });

      return {
        data: {
          total: totalCount,
          list: viharsList,
          totalDistanceKm: totalKm.toFixed(1),
          avgDistanceKm: avgKm,
          avgDuration: formatDurationMins(avgDurationMins),
          statusDistribution: countBy(viharsList, 'status'),
          safetyDistribution: countBy(viharsList, 'safety_status'),
          subViharCount: subsessions.length,
          holdsCount: holds.length,
          holdReasons: countBy(holds, 'reason'),
          handoversCount: handovers.length,
          areaDistribution: toSeries(areaBuckets),
          trend: toSeries(bucketByDay(viharsList, 'created_at')),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Fetch Emergency Reports
   */
  async fetchEmergencyReports(filters = {}, range = {}) {
    try {
      let query = supabase
        .from('emergencies')
        .select('id, vihar_id, user_id, status, trigger_type, latitude, longitude, battery_percentage, resolution_notes, triggered_at, resolved_at, profiles:user_id(full_name, phone, area, city), vihars:vihar_id(title)', { count: 'exact' });

      query = dateFilter(query, 'triggered_at', range);

      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.triggerType && filters.triggerType !== 'ALL') {
        query = query.eq('trigger_type', filters.triggerType);
      }

      const limit = filters.limit || 50;
      const offset = (filters.page || 0) * limit;

      const [emergenciesList, totalCount, attempts] = await Promise.all([
        queryRows('Emergencies list', query.order('triggered_at', { ascending: false }).range(offset, offset + limit - 1)),
        queryCount('Emergencies count', query),
        queryRows('Attempts', dateFilter(supabase.from('emergency_attempts').select('emergency_id, status, notified_at, responded_at'), 'notified_at', range)),
      ]);

      // Calculate response times
      let sumResponseTime = 0;
      let countResponseTime = 0;

      const listWithResponse = emergenciesList.map((em) => {
        let respMins = null;
        if (em.triggered_at && em.resolved_at) {
          respMins = calculateDurationMins(em.triggered_at, em.resolved_at);
          if (respMins !== null && respMins >= 0 && respMins <= 1440) {
            sumResponseTime += respMins;
            countResponseTime++;
          }
        }
        return {
          ...em,
          responseTimeMins: respMins,
        };
      });

      const avgResponseMins = countResponseTime > 0 ? (sumResponseTime / countResponseTime).toFixed(1) : null;

      // Area-wise emergencies based on victim area
      const areaBuckets = {};
      emergenciesList.forEach((e) => {
        const area = e.profiles?.area || 'Unassigned Area';
        areaBuckets[area] = (areaBuckets[area] || 0) + 1;
      });

      return {
        data: {
          total: totalCount,
          list: listWithResponse,
          resolvedCount: emergenciesList.filter((e) => e.status === 'RESOLVED').length,
          falseAlarmCount: emergenciesList.filter((e) => e.status === 'FALSE_ALARM').length,
          avgResponseTime: avgResponseMins !== null ? `${avgResponseMins} min` : '—',
          statusDistribution: countBy(emergenciesList, 'status'),
          triggerDistribution: countBy(emergenciesList, 'trigger_type'),
          escalationAttempts: countBy(attempts, 'status'),
          areaDistribution: toSeries(areaBuckets),
          trend: toSeries(bucketByDay(emergenciesList, 'triggered_at')),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Fetch Safety and Route Reports
   */
  async fetchSafetyReports(filters = {}, range = {}) {
    try {
      let routeQuery = supabase
        .from('route_events')
        .select('id, vihar_id, event_type, severity, message, created_at, vihars:vihar_id(title)', { count: 'exact' });

      routeQuery = dateFilter(routeQuery, 'created_at', range);

      if (filters.severity && filters.severity !== 'ALL') {
        routeQuery = routeQuery.eq('severity', filters.severity);
      }

      const limit = filters.limit || 50;
      const offset = (filters.page || 0) * limit;

      const [routeEventsList, totalRouteEvents, safetyChecks, devices] = await Promise.all([
        queryRows('Route events', routeQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1)),
        queryCount('Route events count', routeQuery),
        queryRows('Safety checks', dateFilter(supabase.from('safety_checks').select('id, status, user_response, prompt_sent_at'), 'prompt_sent_at', range)),
        queryRows('Device status', supabase.from('device_status').select('battery_percentage, network_status, gps_enabled, app_state')),
      ]);

      const batteryBuckets = devices.reduce((buckets, item) => {
        if (item.battery_percentage === null || item.battery_percentage === undefined) return buckets;
        const label = item.battery_percentage < 20 ? '0-19% (Critical)' : item.battery_percentage < 50 ? '20-49% (Low)' : item.battery_percentage < 80 ? '50-79% (Good)' : '80-100% (Full)';
        buckets[label] = (buckets[label] || 0) + 1;
        return buckets;
      }, {});

      return {
        data: {
          totalEvents: totalRouteEvents,
          list: routeEventsList,
          severityDistribution: countBy(routeEventsList, 'severity'),
          eventTypeDistribution: countBy(routeEventsList, 'event_type'),
          safetyChecksCount: safetyChecks.length,
          safetyCheckResponses: countBy(safetyChecks, 'user_response'),
          networkStatus: toSeries(countBy(devices, 'network_status')),
          batteryDistribution: toSeries(batteryBuckets),
          gpsAvailability: toSeries(countBy(devices.map((d) => ({ val: d.gps_enabled ? 'ENABLED' : 'DISABLED' })), 'val')),
          trend: toSeries(bucketByDay(routeEventsList, 'created_at')),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Fetch Administrator Reports
   */
  async fetchAdministratorReports(filters = {}, range = {}) {
    try {
      let query = supabase
        .from('administrators')
        .select('id, user_id, area_id, permissions, is_active, created_at, areas:area_id(name, city), profiles:user_id(full_name, phone, status, city)', { count: 'exact' });

      query = dateFilter(query, 'created_at', range);

      const limit = filters.limit || 50;
      const offset = (filters.page || 0) * limit;

      const [adminsList, totalCount] = await Promise.all([
        queryRows('Administrators', query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)),
        queryCount('Admins count', query),
      ]);

      const activeCount = adminsList.filter((a) => a.is_active).length;
      const disabledCount = adminsList.filter((a) => !a.is_active).length;

      // Area distribution
      const areaBuckets = {};
      adminsList.forEach((a) => {
        const areaName = a.areas?.name || 'Unassigned';
        areaBuckets[areaName] = (areaBuckets[areaName] || 0) + 1;
      });

      return {
        data: {
          total: totalCount,
          activeCount,
          disabledCount,
          list: adminsList,
          areaDistribution: toSeries(areaBuckets),
          statusDistribution: countBy(adminsList.map((a) => ({ status: a.is_active ? 'ACTIVE' : 'DISABLED' })), 'status'),
          trend: toSeries(bucketByDay(adminsList, 'created_at')),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Fetch Audit & Security Reports
   */
  async fetchAuditReports(filters = {}, range = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('id, actor_id, action, entity, entity_id, details, created_at', { count: 'exact' });

      query = dateFilter(query, 'created_at', range);

      if (filters.action && filters.action.trim()) {
        query = query.ilike('action', `%${filters.action.trim()}%`);
      }
      if (filters.entity && filters.entity.trim()) {
        query = query.ilike('entity', `%${filters.entity.trim()}%`);
      }

      const limit = filters.limit || 50;
      const offset = (filters.page || 0) * limit;

      const [logsList, totalCount] = await Promise.all([
        queryRows('Audit logs', query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)),
        queryCount('Audit logs count', query),
      ]);

      // Category breakdown
      const categoryBuckets = {};
      logsList.forEach((log) => {
        let cat = 'OTHER';
        const action = log.action || '';
        if (action.includes('USER') || action.includes('SEVAK') || action.includes('PROFILE')) cat = 'USER_MANAGEMENT';
        else if (action.includes('ADMIN') || action.includes('ROLE')) cat = 'ADMIN_MANAGEMENT';
        else if (action.includes('VIHAR') || action.includes('HANDOVER') || action.includes('HOLD')) cat = 'VIHAR_OPERATIONS';
        else if (action.includes('EMERGENCY') || action.includes('SOS')) cat = 'EMERGENCY_OPS';
        else if (action.includes('SETTING') || action.includes('CONFIG')) cat = 'CONFIG_CHANGE';
        else if (action.includes('ANNOUNCEMENT') || action.includes('NOTIFICATION')) cat = 'COMMUNICATION';
        else if (action.includes('SECURITY') || action.includes('HARD_DELETE')) cat = 'SECURITY_EVENT';

        categoryBuckets[cat] = (categoryBuckets[cat] || 0) + 1;
      });

      return {
        data: {
          total: totalCount,
          list: logsList,
          categoryDistribution: toSeries(categoryBuckets),
          actionDistribution: toSeries(countBy(logsList, 'action')),
          entityDistribution: toSeries(countBy(logsList, 'entity')),
          trend: toSeries(bucketByDay(logsList, 'created_at')),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Fetch Legacy Reports for backward compatibility with existing analytics views
   */
  async fetchReports(range = {}) {
    try {
      const [usersRep, viharsRep, safetyRep, devicesData] = await Promise.all([
        this.fetchUserReports({}, range),
        this.fetchViharReports({}, range),
        this.fetchEmergencyReports({}, range),
        queryRows('Device status', supabase.from('device_status').select('network_status, battery_percentage, gps_enabled, app_state, last_heartbeat')),
      ]);

      const devices = devicesData || [];
      const batteryBuckets = devices.reduce((buckets, item) => {
        if (item.battery_percentage === null || item.battery_percentage === undefined) return buckets;
        const label = item.battery_percentage < 20 ? '0-19%' : item.battery_percentage < 50 ? '20-49%' : item.battery_percentage < 80 ? '50-79%' : '80-100%';
        buckets[label] = (buckets[label] || 0) + 1;
        return buckets;
      }, {});

      return {
        data: {
          users: usersRep.data || {},
          vihars: viharsRep.data || {},
          safety: safetyRep.data || {},
          devices: {
            networkStatus: toSeries(countBy(devices, 'network_status')),
            batteryDistribution: toSeries(batteryBuckets),
            gpsAvailability: toSeries(countBy(devices.map((d) => ({ val: d.gps_enabled ? 'ENABLED' : 'DISABLED' })), 'val')),
            appState: toSeries(countBy(devices, 'app_state')),
            heartbeatTrend: toSeries(bucketByDay(devices, 'last_heartbeat')),
            reportedDevices: devices.length,
          },
        },
        errors: [],
        range,
      };
    } catch (error) {
      return { data: {}, errors: [{ message: error.message }], range };
    }
  },
};
