import { create } from 'zustand';
import { notificationService } from '../services/notificationService';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  loadNotifications: async (userId) => {
    if (!userId) return;
    set({ isLoading: true });

    const [{ data }, unread] = await Promise.all([
      notificationService.getUserNotifications(userId),
      notificationService.getUnreadCount(userId),
    ]);

    set({
      notifications: data || [],
      unreadCount: unread,
      isLoading: false,
    });
  },

  markRead: async (notificationId) => {
    await notificationService.markAsRead(notificationId);
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      const unread = updated.filter((n) => !n.is_read).length;
      return { notifications: updated, unreadCount: unread };
    });
  },

  markAllRead: async (userId) => {
    await notificationService.markAllAsRead(userId);
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  addIncomingNotification: (notification) => {
    notificationService.triggerAlertFeedback(notification.severity);
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));

