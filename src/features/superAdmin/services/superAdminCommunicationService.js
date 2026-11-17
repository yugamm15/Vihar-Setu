import { supabase } from '../../../core/config/supabase';

const PAGE_SIZE = 25;

const safe = async (operation, fallback = []) => {
  try {
    const { data, error, count } = await operation();
    if (error) throw error;
    return { data: data || fallback, count: count || 0, error: null };
  } catch (error) {
    return { data: fallback, count: 0, error };
  }
};

export const superAdminCommunicationService = {
  pageSize: PAGE_SIZE,

  async getOverview() {
    const requests = await Promise.all([
      safe(() => supabase.from('notifications').select('id', { count: 'exact', head: true })),
      safe(() => supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)),
      safe(() => supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('type', 'SYSTEM')),
      safe(() => supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('status', 'PUBLISHED')),
      safe(() => supabase.from('announcements').select('id, title, status, priority, published_at, created_at').order('created_at', { ascending: false }).limit(5)),
    ]);
    return {
      data: {
        totalNotifications: requests[0].count,
        unreadNotifications: requests[1].count,
        systemNotifications: requests[2].count,
        activeAnnouncements: requests[3].count,
        recentAnnouncements: requests[4].data,
      },
      errors: requests.filter((request) => request.error).map((request) => request.error),
    };
  },

  async listNotifications(filters = {}, page = 0) {
    return safe(() => {
      let query = supabase
        .from('notifications')
        .select('id, user_id, vihar_id, title, body, type, severity, metadata, is_read, read_at, created_at, profiles:user_id(full_name, phone)', { count: 'exact' });
      if (filters.type && filters.type !== 'ALL') query = query.eq('type', filters.type);
      if (filters.read === 'READ') query = query.eq('is_read', true);
      if (filters.read === 'UNREAD') query = query.eq('is_read', false);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) query = query.lte('created_at', filters.to.length === 10 ? `${filters.to}T23:59:59.999Z` : filters.to);
      if (filters.search?.trim()) {
        const search = filters.search.trim().replace(/[%(),]/g, ' ');
        query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      }
      return query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    });
  },

  async listAnnouncements(filters = {}) {
    return safe(() => {
      let query = supabase
        .from('announcements')
        .select('id, title, description, category, priority, target_audience, target_area_id, target_vihar_id, status, created_by, created_at, published_at, expires_at, updated_at')
        .order('created_at', { ascending: false });
      if (filters.status && filters.status !== 'ALL') query = query.eq('status', filters.status);
      return query;
    });
  },

  async createDraft(input) {
    const { data, error } = await supabase.rpc('super_admin_create_announcement', {
      p_title: input.title,
      p_description: input.description,
      p_category: input.category,
      p_priority: input.priority,
      p_target_audience: input.targetAudience,
      p_target_area_id: input.targetAreaId || null,
      p_target_vihar_id: input.targetViharId || null,
      p_expires_at: input.expiresAt || null,
      p_translations: input.translations || {},
    });
    return { data, error };
  },

  async updateDraft(id, input) {
    const { data, error } = await supabase.rpc('super_admin_update_announcement', {
      p_announcement_id: id,
      p_title: input.title,
      p_description: input.description,
      p_category: input.category,
      p_priority: input.priority,
      p_target_audience: input.targetAudience,
      p_target_area_id: input.targetAreaId || null,
      p_target_vihar_id: input.targetViharId || null,
      p_expires_at: input.expiresAt || null,
      p_translations: input.translations || {},
    });
    return { data, error };
  },

  async publish(id) {
    const { data, error } = await supabase.rpc('super_admin_publish_announcement', { p_announcement_id: id });
    return { data, error };
  },

  async archive(id) {
    const { data, error } = await supabase.rpc('super_admin_archive_announcement', { p_announcement_id: id });
    return { data, error };
  },

  async getNotification(id) {
    return safe(() =>
      supabase
        .from('notifications')
        .select('id, user_id, vihar_id, title, body, type, severity, metadata, is_read, read_at, created_at, profiles:user_id(full_name, phone, email)')
        .eq('id', id)
        .single(),
    null);
  },

  async markRead(id) {
    const { data, error } = await supabase.rpc('mark_notification_read', { p_notification_id: id });
    return { data, error };
  },
};
