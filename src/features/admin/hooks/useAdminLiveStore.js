import { create } from 'zustand';
import { adminLiveService } from '../services/adminLiveService';
import { viharService } from '../../vihar/services/viharService';
import { supabase } from '../../../core/config/supabase';

/**
 * Silence timeout threshold in seconds before a live unit is marked OFFLINE on client
 */
const DEFAULT_STALE_TIMEOUT_SEC = 180; // 3 minutes

export const useAdminLiveStore = create((set, get) => {
  let realtimeUnsubscribe = null;
  let viharsRealtimeChannel = null;
  let pollingIntervalId = null;
  let heartbeatCheckIntervalId = null;

  return {
    areaId: null,
    areaName: 'Surat',
    activeVihars: [],
    selectedViharId: null,
    statusFilter: 'ALL', // 'ALL' | 'SAFE' | 'WARNING' | 'EMERGENCY' | 'OFFLINE' | 'ON_HOLD'
    searchQuery: '',
    connectionState: 'LIVE', // 'LIVE' | 'RECONNECTING' | 'OFFLINE_POLLING'
    staleTimeoutSec: DEFAULT_STALE_TIMEOUT_SEC,
    isLoading: true,
    isRefreshing: false,
    lastSnapshotTime: null,

    /**
     * Initialize store for an administrator area
     */
    init: async (areaId = null) => {
      set({ areaId, isLoading: true, connectionState: 'LIVE' });

      // 1. Initial Snapshot from Supabase
      await get().fetchSnapshot();

      // 2. Start Realtime Subscription on vihar_live_state
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
      }

      realtimeUnsubscribe = adminLiveService.subscribeToAreaLiveState(
        areaId,
        (changes) => {
          get().handleRealtimeUpdates(changes);
        }
      );

      // 3. Realtime Subscription on vihars table (starts, ends, cancellations)
      if (viharsRealtimeChannel) {
        supabase.removeChannel(viharsRealtimeChannel);
      }
      const viharChannelName = `admin_vihars_rt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      viharsRealtimeChannel = supabase
        .channel(viharChannelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'vihars',
          },
          () => {
            get().fetchSnapshot();
          }
        )
        .subscribe();

      // 4. Start Heartbeat Watchdog Interval (every 10 seconds, check for stale units)
      if (heartbeatCheckIntervalId) {
        clearInterval(heartbeatCheckIntervalId);
      }
      heartbeatCheckIntervalId = setInterval(() => {
        get().refreshStaleStatus();
      }, 10000);
    },

    /**
     * Cleanup subscriptions on unmount / blur
     */
    cleanup: () => {
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
        realtimeUnsubscribe = null;
      }
      if (viharsRealtimeChannel) {
        supabase.removeChannel(viharsRealtimeChannel);
        viharsRealtimeChannel = null;
      }
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
      if (heartbeatCheckIntervalId) {
        clearInterval(heartbeatCheckIntervalId);
        heartbeatCheckIntervalId = null;
      }
    },

    /**
     * Fetch Live Snapshot purely from Supabase Database
     */
    fetchSnapshot: async () => {
      const { areaId } = get();
      try {
        let snapshotData = [];

        // 1. First attempt: call admin_live_snapshot RPC
        const { data: rpcData, error: rpcError } = await adminLiveService.fetchLiveSnapshot(areaId);
        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          snapshotData = rpcData;
        } else {
          // 2. Direct Supabase query via viharService for all active vihars in database
          const { data: dbVihars } = await viharService.getAllActiveVihars();

          if (dbVihars && dbVihars.length > 0) {
            snapshotData = await Promise.all(
              dbVihars.map(async (v) => {
                const { data: ls } = await supabase
                  .from('vihar_live_state')
                  .select('*')
                  .eq('vihar_id', v.id)
                  .maybeSingle();

                const { data: lastLoc } = await supabase
                  .from('locations')
                  .select('latitude, longitude, speed_kmh, heading, battery_percentage, recorded_at')
                  .eq('vihar_id', v.id)
                  .order('recorded_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                const routeFirstPt = v.planned_route?.coordinates?.[0];
                const fallbackLat = routeFirstPt ? routeFirstPt[1] : 21.1850;
                const fallbackLng = routeFirstPt ? routeFirstPt[0] : 72.8020;

                return {
                  vihar_id: v.id,
                  area_id: ls?.area_id || null,
                  area_name: v.profiles?.area || 'Surat Central',
                  user_id: v.user_id,
                  sevak_name: v.profiles?.full_name || 'Vihar Sevak',
                  sevak_phone: v.profiles?.phone || '',
                  sevak_photo: null,
                  blood_group: v.profiles?.blood_group || '',
                  emergency_contact_phone: v.profiles?.emergency_contact_phone || '',
                  source_name: v.source_name || 'Starting Point',
                  dest_name: v.dest_name || 'Destination Point',
                  title: v.title || 'Pujya Sadhviji Bhagwant Vihar',
                  status: ls?.status || v.safety_status || 'SAFE',
                  lat: ls?.lat ?? lastLoc?.latitude ?? fallbackLat,
                  lng: ls?.lng ?? lastLoc?.longitude ?? fallbackLng,
                  speed: ls?.speed ?? lastLoc?.speed_kmh ?? 4.0,
                  heading: ls?.heading ?? lastLoc?.heading ?? 45,
                  accuracy: ls?.accuracy ?? 10,
                  battery: ls?.battery ?? lastLoc?.battery_percentage ?? 92,
                  network: ls?.network || '4G LTE',
                  route_progress_m: ls?.route_progress_m ?? 0,
                  distance_remaining_m: ls?.distance_remaining_m ?? (Number(v.total_distance_km) * 1000 || 2400),
                  eta_at: ls?.eta_at || null,
                  deviation_distance_m: ls?.deviation_distance_m ?? 0,
                  hold_active: ls?.hold_active ?? false,
                  last_heartbeat_at: ls?.last_heartbeat_at || lastLoc?.recorded_at || v.started_at || new Date().toISOString(),
                  updated_at: ls?.updated_at || new Date().toISOString(),
                  is_simulated: false,
                };
              })
            );
          }
        }

        const areaTitle = snapshotData[0]?.area_name || get().areaName;
        set({
          activeVihars: snapshotData,
          areaName: areaTitle,
          isLoading: false,
          isRefreshing: false,
          lastSnapshotTime: Date.now(),
          connectionState: 'LIVE',
        });
        get().refreshStaleStatus();
      } catch (e) {
        console.warn('[useAdminLiveStore] fetchSnapshot error:', e);
        set({
          activeVihars: [],
          isLoading: false,
          isRefreshing: false,
          connectionState: 'OFFLINE_POLLING',
        });
      }
    },

    /**
     * Refresh pull-to-refresh
     */
    refresh: async () => {
      set({ isRefreshing: true });
      await get().fetchSnapshot();
    },

    /**
     * Handle incoming Realtime payloads (INSERT, UPDATE, DELETE)
     */
    handleRealtimeUpdates: (changes) => {
      const currentList = [...get().activeVihars];

      changes.forEach(({ eventType, new: newRow, old: oldRow }) => {
        if (eventType === 'DELETE') {
          const idx = currentList.findIndex((v) => v.vihar_id === oldRow?.vihar_id);
          if (idx !== -1) currentList.splice(idx, 1);
        } else if (eventType === 'UPDATE' || eventType === 'INSERT') {
          // If status completed, remove from active list
          if (newRow?.status === 'COMPLETED') {
            const idx = currentList.findIndex((v) => v.vihar_id === newRow.vihar_id);
            if (idx !== -1) currentList.splice(idx, 1);
          } else {
            const idx = currentList.findIndex((v) => v.vihar_id === newRow.vihar_id);
            if (idx !== -1) {
              // Merge live telemetry while preserving metadata
              currentList[idx] = {
                ...currentList[idx],
                ...newRow,
                status: newRow.status,
                lat: newRow.lat,
                lng: newRow.lng,
                speed: newRow.speed,
                heading: newRow.heading,
                accuracy: newRow.accuracy,
                battery: newRow.battery,
                network: newRow.network,
                route_progress_m: newRow.route_progress_m,
                distance_remaining_m: newRow.distance_remaining_m,
                eta_at: newRow.eta_at,
                deviation_distance_m: newRow.deviation_distance_m,
                hold_active: newRow.hold_active,
                last_heartbeat_at: newRow.last_heartbeat_at,
                updated_at: newRow.updated_at,
              };
            } else {
              // New Vihar appeared: trigger snapshot refresh to get join labels
              get().fetchSnapshot();
            }
          }
        }
      });

      set({ activeVihars: currentList });
      get().refreshStaleStatus();
    },

    /**
     * Stale Heartbeat Detection (Display side):
     * If last_heartbeat_at is older than staleTimeoutSec, tag as OFFLINE for UI
     */
    refreshStaleStatus: () => {
      const now = Date.now();
      const thresholdMs = get().staleTimeoutSec * 1000;

      const updated = get().activeVihars.map((vihar) => {
        const lastPing = vihar.last_heartbeat_at ? new Date(vihar.last_heartbeat_at).getTime() : 0;
        const diffMs = now - lastPing;
        const isStale = diffMs > thresholdMs;

        let displayStatus = vihar.status;
        let lastSeenText = 'Just now';

        if (diffMs > 60000) {
          const mins = Math.floor(diffMs / 60000);
          lastSeenText = `Last seen ${mins}m ago`;
        } else if (diffMs > 5000) {
          const secs = Math.floor(diffMs / 1000);
          lastSeenText = `Last seen ${secs}s ago`;
        }

        if (isStale && vihar.status !== 'EMERGENCY') {
          displayStatus = 'OFFLINE';
        }

        return {
          ...vihar,
          displayStatus,
          lastSeenText,
          isStale,
        };
      });

      set({ activeVihars: updated });
    },

    setSelectedViharId: (id) => set({ selectedViharId: id }),
    setStatusFilter: (filter) => set({ statusFilter: filter }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    /**
     * Filtered active Vihars matching search and status chips
     */
    getFilteredVihars: () => {
      const { activeVihars, statusFilter, searchQuery } = get();
      const q = searchQuery.toLowerCase().trim();

      return activeVihars.filter((v) => {
        // Status Filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'SAFE' && v.displayStatus !== 'SAFE') return false;
          if (statusFilter === 'WARNING' && v.displayStatus !== 'WARNING') return false;
          if (statusFilter === 'EMERGENCY' && v.displayStatus !== 'EMERGENCY') return false;
          if (statusFilter === 'OFFLINE' && v.displayStatus !== 'OFFLINE') return false;
          if (statusFilter === 'ON_HOLD' && v.displayStatus !== 'ON_HOLD') return false;
        }

        // Search Filter (Sevak name, source, destination, title)
        if (q) {
          const matchesName = (v.sevak_name || '').toLowerCase().includes(q);
          const matchesSource = (v.source_name || '').toLowerCase().includes(q);
          const matchesDest = (v.dest_name || '').toLowerCase().includes(q);
          const matchesTitle = (v.title || '').toLowerCase().includes(q);
          if (!matchesName && !matchesSource && !matchesDest && !matchesTitle) {
            return false;
          }
        }

        return true;
      });
    },

    /**
     * Returns the highest priority active emergency Vihar, if any
     */
    getEmergencyVihar: () => {
      const { activeVihars } = get();
      return activeVihars.find((v) => v.status === 'EMERGENCY' || v.displayStatus === 'EMERGENCY') || null;
    },
  };
});
