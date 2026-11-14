import { supabase } from '../config/supabase';
import { useNotificationStore } from '../../features/notifications/hooks/useNotificationStore';

/**
 * Real-Time Supabase Subscription & Emergency Broadcast Feed (Phase 24)
 * Connects to Supabase Realtime channels for:
 * - Live Emergencies (INSERT, UPDATE)
 * - Live GPS Telemetry Pings (INSERT on vihar_locations)
 * - Vihar Holds (INSERT, UPDATE)
 * - Notifications (INSERT for current user)
 * - Route Events (INSERT for deviations, battery, police calls)
 */
class RealtimeBroadcastService {
  constructor() {
    this.channel = null;
    this.isSubscribed = false;
    this.userId = null;
    this.listeners = {
      emergencies: new Set(),
      locations: new Set(),
      holds: new Set(),
      routeEvents: new Set(),
    };
  }

  /**
   * Initialize real-time feed for the logged-in user
   */
  init(userId) {
    if (this.isSubscribed && this.userId === userId) return;

    this.cleanup();
    this.userId = userId;

    try {
      this.channel = supabase
        .channel('jinaarya-vihar-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergencies' },
          (payload) => {
            this._handleEmergencyChange(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'vihar_locations' },
          (payload) => {
            this._handleLocationPing(payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vihar_holds' },
          (payload) => {
            this._handleHoldChange(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: userId ? `user_id=eq.${userId}` : undefined,
          },
          (payload) => {
            if (payload.new) {
              useNotificationStore.getState().addIncomingNotification(payload.new);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'route_events' },
          (payload) => {
            this._handleRouteEvent(payload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.isSubscribed = false;
          }
        });
    } catch (e) {
      console.warn('[RealtimeBroadcast] Channel subscription warning:', e);
    }
  }

  _handleEmergencyChange(payload) {
    this.listeners.emergencies.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.warn('[RealtimeBroadcast] Emergency callback error:', err);
      }
    });
  }

  _handleLocationPing(payload) {
    this.listeners.locations.forEach((cb) => {
      try {
        cb(payload.new);
      } catch (err) {
        console.warn('[RealtimeBroadcast] Location callback error:', err);
      }
    });
  }

  _handleHoldChange(payload) {
    this.listeners.holds.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.warn('[RealtimeBroadcast] Hold callback error:', err);
      }
    });
  }

  _handleRouteEvent(payload) {
    this.listeners.routeEvents.forEach((cb) => {
      try {
        cb(payload.new);
      } catch (err) {
        console.warn('[RealtimeBroadcast] Route event callback error:', err);
      }
    });
  }

  /**
   * Subscribe to specific table events
   */
  subscribeToEmergencies(callback) {
    this.listeners.emergencies.add(callback);
    return () => this.listeners.emergencies.delete(callback);
  }

  subscribeToLocations(callback) {
    this.listeners.locations.add(callback);
    return () => this.listeners.locations.delete(callback);
  }

  subscribeToHolds(callback) {
    this.listeners.holds.add(callback);
    return () => this.listeners.holds.delete(callback);
  }

  subscribeToRouteEvents(callback) {
    this.listeners.routeEvents.add(callback);
    return () => this.listeners.routeEvents.delete(callback);
  }

  /**
   * Teardown channel on user logout
   */
  cleanup() {
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (e) {
        // Non-fatal
      }
      this.channel = null;
    }
    this.isSubscribed = false;
    this.userId = null;
  }
}

export const realtimeBroadcastService = new RealtimeBroadcastService();

