import { create } from 'zustand';
import { viharService } from '../services/viharService';
import { storage } from '../../../core/storage/asyncStorage';

export const useViharStore = create((set, get) => ({
  activeVihar: null, // null when no vihar is running (idle state)
  scheduledVihars: [],
  isLoading: false,
  error: null,
  isAlarmTriggered: false,

  /**
   * Load active and planned vihars from Supabase
   */
  loadViharState: async (userId) => {
    if (!userId) return;
    set({ isLoading: true, error: null });

    try {
      const { data: active } = await viharService.getActiveVihar(userId);
      const { data: scheduled } = await viharService.getScheduledVihars(userId);

      set({
        activeVihar: active || null,
        scheduledVihars: scheduled || [],
        isLoading: false,
      });
    } catch (e) {
      console.warn('[ViharStore] loadViharState error:', e);
      set({ isLoading: false });
    }
  },

  /**
   * Start an Immediate Vihar
   */
  startImmediateVihar: async (userId, payload) => {
    set({ isLoading: true, error: null });
    const { data, error } = await viharService.createVihar(userId, {
      ...payload,
      status: 'ACTIVE',
    });

    if (error || !data) {
      set({
        isLoading: false,
        error: error?.message || 'Failed to start Vihar. Please try again.',
      });
      return false;
    }

    set({
      activeVihar: data,
      isLoading: false,
      error: null,
    });
    return true;
  },

  /**
   * Schedule a Future Vihar with 30-min Alarm
   */
  scheduleFutureVihar: async (userId, payload) => {
    set({ isLoading: true, error: null });
    const { data, error } = await viharService.createVihar(userId, {
      ...payload,
      status: 'PLANNED',
    });

    if (error || !data) {
      set({
        isLoading: false,
        error: error?.message || 'Failed to schedule Vihar. Please try again.',
      });
      return false;
    }

    const currentScheduled = get().scheduledVihars;
    set({
      scheduledVihars: [data, ...currentScheduled],
      isLoading: false,
      error: null,
    });
    return true;
  },

  /**
   * Start a Scheduled Vihar
   */
  startScheduled: async (viharId) => {
    set({ isLoading: true });
    const { data, error } = await viharService.startScheduledVihar(viharId);

    if (error || !data) {
      set({ isLoading: false });
      return false;
    }

    const filtered = get().scheduledVihars.filter((v) => v.id !== viharId);
    set({
      activeVihar: data,
      scheduledVihars: filtered,
      isLoading: false,
    });
    return true;
  },

  /**
   * Complete Active Vihar
   */
  completeActiveVihar: async (viharId, stats) => {
    set({ isLoading: true });
    await viharService.completeVihar(viharId, stats);
    set({
      activeVihar: null,
      isLoading: false,
    });
    return true;
  },

  /**
   * Cancel Scheduled Vihar
   */
  cancelScheduled: async (viharId) => {
    set({ isLoading: true });
    await viharService.cancelScheduledVihar(viharId);
    const filtered = get().scheduledVihars.filter((v) => v.id !== viharId);
    set({
      scheduledVihars: filtered,
      isLoading: false,
    });
    return true;
  },

  /**
   * Trigger Pre-Vihar 30-min Alarm state
   */
  setAlarmTriggered: (triggered) => {
    set({ isAlarmTriggered: triggered });
  },
}));
