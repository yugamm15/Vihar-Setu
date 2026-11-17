import NetInfo from '@react-native-community/netinfo';
import { storage } from '../../../core/storage/asyncStorage';
import { supabase } from '../../../core/config/supabase';

const QUEUE_STORAGE_KEY = '@jinaarya_offline_telemetry_queue';
const MAX_BATCH_SIZE = 25;

class OfflineSyncService {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.queue = [];
    this.listeners = new Set();
    this.lastSyncTime = null;
    this.netInfoUnsubscribe = null;
    this.initialized = false;
  }

  /**
   * Initialize NetInfo listeners and load existing queue from storage
   */
  async init() {
    if (this.initialized) return;
    this.initialized = true;

    // Load persisted queue
    const savedQueue = await storage.getItem(QUEUE_STORAGE_KEY);
    if (Array.isArray(savedQueue)) {
      this.queue = savedQueue;
    }

    // Subscribe to network connectivity changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const previouslyOnline = this.isOnline;
      this.isOnline = Boolean(state.isConnected && (state.isInternetReachable ?? true));

      this._notifyListeners();

      if (!previouslyOnline && this.isOnline) {
        // Back online: auto-flush queue
        this.flushQueue();
      }
    });

    // Initial check
    const currentStatus = await NetInfo.fetch();
    this.isOnline = Boolean(currentStatus.isConnected && (currentStatus.isInternetReachable ?? true));
    this._notifyListeners();

    if (this.isOnline && this.queue.length > 0) {
      this.flushQueue();
    }
  }

  /**
   * Subscribe a callback to receive status updates (isOnline, pendingCount, lastSyncTime)
   */
  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getStatus());
    return () => this.listeners.delete(callback);
  }

  /**
   * Get current offline engine status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.queue.length,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    };
  }

  _notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn('[OfflineSync] Listener callback error:', err);
      }
    });
  }

  /**
   * Persist current in-memory queue to AsyncStorage
   */
  async _saveQueue() {
    try {
      await storage.setItem(QUEUE_STORAGE_KEY, this.queue);
      this._notifyListeners();
    } catch (e) {
      console.warn('[OfflineSync] Failed to persist queue:', e);
    }
  }

  /**
   * Enqueue a pending telemetry ping, route event, or hold update
   * @param {string} type - 'LOCATION_PING' | 'ROUTE_EVENT' | 'HOLD_EVENT' | 'DEVICE_STATUS'
   * @param {object} payload - Record payload to insert into Supabase
   */
  async enqueue(type, payload) {
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(item);
    await this._saveQueue();

    // If online, immediately trigger background flush
    if (this.isOnline && !this.isSyncing) {
      this.flushQueue();
    }

    return item;
  }

  /**
   * Flush queued items sequentially into Supabase
   */
  async flushQueue() {
    if (this.isSyncing || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this._notifyListeners();

    try {
      while (this.queue.length > 0 && this.isOnline) {
        const batch = this.queue.slice(0, MAX_BATCH_SIZE);
        const locationPings = [];
        const routeEvents = [];
        const holdEvents = [];
        const deviceStatuses = [];

        batch.forEach((item) => {
          if (item.type === 'LOCATION_PING') locationPings.push(item.payload);
          else if (item.type === 'ROUTE_EVENT') routeEvents.push(item.payload);
          else if (item.type === 'HOLD_EVENT') holdEvents.push(item.payload);
          else if (item.type === 'DEVICE_STATUS') deviceStatuses.push(item.payload);
        });

        // 1. Drain Location Pings in batch
        if (locationPings.length > 0) {
          const { error } = await supabase.from('vihar_locations').insert(locationPings);
          if (error) {
            console.warn('[OfflineSync] Location pings batch sync warning:', error);
            // If foreign key violation (e.g. past test vihar deleted from server), drop orphaned records instead of deadlocking queue
            if (error.code !== '23503') {
              break;
            }
          }
        }

        // 2. Drain Route Events
        if (routeEvents.length > 0) {
          const { error } = await supabase.from('route_events').insert(routeEvents);
          if (error) {
            console.warn('[OfflineSync] Route events sync warning:', error);
            break;
          }
        }

        // 3. Drain Holds
        if (holdEvents.length > 0) {
          for (const hold of holdEvents) {
            if (hold.action === 'INSERT') {
              await supabase.from('vihar_holds').insert(hold.data);
            } else if (hold.action === 'UPDATE') {
              await supabase.from('vihar_holds').update(hold.data).eq('id', hold.id);
            }
          }
        }

        // 4. Drain Device Status (upsert latest)
        if (deviceStatuses.length > 0) {
          const latestStatus = deviceStatuses[deviceStatuses.length - 1];
          await supabase.from('device_status').upsert(latestStatus, { onConflict: 'user_id' });
        }

        // Successfully synced this batch: remove from queue
        this.queue.splice(0, batch.length);
        this.lastSyncTime = new Date().toISOString();
        await this._saveQueue();
      }
    } catch (e) {
      console.warn('[OfflineSync] Error during queue flush:', e);
    } finally {
      this.isSyncing = false;
      this._notifyListeners();
    }
  }

  /**
   * Clear all queue items (e.g. on user logout)
   */
  async clearQueue() {
    this.queue = [];
    await storage.removeItem(QUEUE_STORAGE_KEY);
    this._notifyListeners();
  }
}

export const offlineSyncService = new OfflineSyncService();

