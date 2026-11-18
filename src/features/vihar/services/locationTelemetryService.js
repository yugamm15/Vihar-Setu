import { AppState, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { supabase } from '../../../core/config/supabase';
import { routeDeviationEngine } from './routeDeviationEngine';
import { offlineSyncService } from './offlineSyncService';

export const GPS_STATUS = {
  ACTIVE: 'ACTIVE',
  WEAK: 'WEAK',
  DISABLED: 'DISABLED',
  SEARCHING: 'SEARCHING',
};

class LocationTelemetryService {
  constructor() {
    this.activeViharId = null;
    this.activeSubViharId = null;
    this.isTracking = false;
    this.watchId = null;
    this.batchTimerId = null;

    this.gpsStatus = GPS_STATUS.SEARCHING;
    this.lastPosition = null;
    this.traveledPath = []; // [{ latitude, longitude }]
    this.pendingBatch = []; // points queued for batch sync
    this.batteryPercentage = 100;
    this.isCharging = false;
    this.networkStatus = 'ONLINE';

    this.listeners = new Set();
    this.appStateSubscription = null;
  }

  /**
   * Start high-accuracy foreground tracking with sticky notification
   */
  async startTracking(viharId, subViharId = null) {
    if (this.isTracking && this.activeViharId === viharId) return;

    this.activeViharId = viharId;
    this.activeSubViharId = subViharId;
    this.isTracking = true;
    this.traveledPath = [];
    this.pendingBatch = [];

    // 1. Initialize Foreground Service Notification via Notifee
    await this._startForegroundNotification();

    // 2. Start watching position with Fused Provider
    this.watchId = Geolocation.watchPosition(
      (pos) => this._onPositionUpdate(pos),
      (err) => {
        console.warn('[LocationTelemetry] Watch error:', err);
        this.gpsStatus = GPS_STATUS.DISABLED;
        this._notifyListeners();
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 3, // meters
        interval: 5000,    // 5 seconds
        fastestInterval: 2000,
        showsBackgroundLocationIndicator: true,
      }
    );

    // 3. Periodic Batch Ingestion (every 15 seconds)
    this.batchTimerId = setInterval(() => {
      this._flushPendingBatch();
    }, 15000);

    // 4. App State Listener
    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          this._flushPendingBatch();
        }
      });
    }

    this._notifyListeners();
  }

  /**
   * Stop tracking and clean up notification
   */
  async stopTracking() {
    this.isTracking = false;
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.batchTimerId) {
      clearInterval(this.batchTimerId);
      this.batchTimerId = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Flush any remaining points
    await this._flushPendingBatch();

    // Stop foreground service
    try {
      await notifee.stopForegroundService();
      await notifee.cancelNotification('vihar-foreground');
    } catch (e) {
      // Ignored
    }

    this.gpsStatus = GPS_STATUS.SEARCHING;
    this._notifyListeners();
  }

  /**
   * Internal foreground notification setup
   */
  async _startForegroundNotification() {
    try {
      const channelId = await notifee.createChannel({
        id: 'vihar-tracking',
        name: 'Vihar Live Tracking',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        id: 'vihar-foreground',
        title: 'Jinaarya Vihar Setu',
        body: 'Vihar in progress · GPS safety tracking active',
        android: {
          channelId,
          asForegroundService: true,
          ongoing: true,
          smallIcon: 'ic_launcher',
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (e) {
      console.warn('[LocationTelemetry] Notifee setup warning:', e?.message);
    }
  }

  /**
   * Process incoming GPS fix
   */
  async _onPositionUpdate(pos) {
    if (!this.isTracking || !pos?.coords) return;

    const { latitude, longitude, accuracy, speed, heading, altitude } = pos.coords;
    const speedKmh = Math.max(0, (speed || 0) * 3.6);
    const recordedAt = new Date(pos.timestamp).toISOString();

    const point = {
      latitude,
      longitude,
      accuracy: accuracy || 5.0,
      speedKmh,
      heading: heading || 0,
      altitude,
      recordedAt,
    };

    this.lastPosition = point;
    this.gpsStatus = accuracy <= 15 ? GPS_STATUS.ACTIVE : GPS_STATUS.WEAK;

    // Append to traveled path
    this.traveledPath.push({ latitude, longitude });

    // Queue point for batch ingestion
    const clientUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    this.pendingBatch.push({
      client_uuid: clientUuid,
      vihar_id: this.activeViharId,
      subvihar_id: this.activeSubViharId,
      lat: latitude,
      lng: longitude,
      speed: speedKmh,
      heading: heading || 0,
      accuracy: accuracy || 5.0,
      altitude,
      battery: this.batteryPercentage,
      network: this.networkStatus,
      recorded_at: recordedAt,
    });

    // Evaluate Route Deviation Engine in real-time
    if (this.activeViharId) {
      await routeDeviationEngine.evaluateLocation(
        { latitude, longitude, accuracy },
        this.activeViharId
      );
    }

    this._notifyListeners();
  }

  /**
   * Flush pending batch to Supabase via ingest_locations_batch RPC
   */
  async _flushPendingBatch() {
    if (this.pendingBatch.length === 0) return;

    const toSend = [...this.pendingBatch];
    this.pendingBatch = [];

    try {
      const { error } = await supabase.rpc('ingest_locations_batch', {
        p_batch: toSend,
      });

      if (error) {
        // Enqueue to offline storage for retry
        for (const pt of toSend) {
          await offlineSyncService.enqueue('LOCATION_PING', pt);
        }
      }
    } catch (e) {
      for (const pt of toSend) {
        await offlineSyncService.enqueue('LOCATION_PING', pt);
      }
    }
  }

  getTelemetrySnapshot() {
    return {
      isTracking: this.isTracking,
      gpsStatus: this.gpsStatus,
      lastPosition: this.lastPosition,
      traveledPath: this.traveledPath,
      batteryPercentage: this.batteryPercentage,
      networkStatus: this.networkStatus,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners() {
    const snap = this.getTelemetrySnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }
}

export const locationTelemetryService = new LocationTelemetryService();
