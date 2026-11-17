import { Vibration, Platform } from 'react-native';
import { supabase } from '../../../core/config/supabase';

/**
 * Notification Service (Phase 23)
 * Manages in-app & push notification architecture, unread tracking,
 * and vibration alerts for safety/emergency events.
 */
class NotificationService {
  /**
   * Fetch user notifications from Supabase
   */
  async getUserNotifications(userId) {
    try {
      if (!userId) return { data: [], error: 'User ID required' };

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (e) {
      const missingNotificationTable =
        e?.code === 'PGRST205' || e?.code === '42P01';
      if (!missingNotificationTable) {
        console.warn('[NotificationService] getUserNotifications warning:', e);
      }
      return { data: [], error: missingNotificationTable ? null : e };
    }
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userId) {
    try {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId) {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.warn('[NotificationService] markAsRead error:', e);
      return { success: false, error: e };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      if (!userId) return { success: false };

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.warn('[NotificationService] markAllAsRead error:', e);
      return { success: false, error: e };
    }
  }

  /**
   * Trigger physical device vibration for critical alerts
   */
  triggerAlertFeedback(severity = 'INFO') {
    try {
      if (severity === 'CRITICAL' || severity === 'EMERGENCY') {
        // Double pulse for critical alert
        Vibration.vibrate([0, 500, 200, 500]);
      } else if (severity === 'WARNING') {
        Vibration.vibrate(400);
      }
    } catch (err) {
      // Non-fatal
    }
  }
}

export const notificationService = new NotificationService();
