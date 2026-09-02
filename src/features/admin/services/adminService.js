import { supabase } from '../../../core/config/supabase';
import { ROLES } from '../../../core/constants/roles';

export const adminService = {
  /**
   * Helper: Get Set of all Admin and Super Admin user IDs from Supabase
   */
  async getAdminUserIds() {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id, roles(name)');

      const adminSet = new Set();
      (data || []).forEach((ur) => {
        const rName = ur.roles?.name;
        if (rName === ROLES.SUPER_ADMIN || rName === ROLES.ADMIN) {
          adminSet.add(ur.user_id);
        }
      });
      return adminSet;
    } catch (e) {
      return new Set();
    }
  },

  /**
   * Fetch Pending Sevak Registration Requests (Excludes Admin accounts)
   */
  async fetchPendingRequests() {
    try {
      const adminIds = await this.getAdminUserIds();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredSevaks = (data || []).filter((profile) => {
        if (profile.email === 'bhemanibhemani@gmail.com') return false;
        if (adminIds.has(profile.id)) return false;
        return true;
      });

      return { data: filteredSevaks, error: null };
    } catch (e) {
      console.warn('[AdminService] Error fetching pending requests:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Fetch All User Requests with optional status filter (Excludes Admin accounts)
   */
  async fetchAllRequests(statusFilter = 'ALL') {
    try {
      const adminIds = await this.getAdminUserIds();

      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out Super Admin and Admin profiles so only Sevaks are shown
      const sevakRequests = (data || []).filter((profile) => {
        if (profile.email === 'bhemanibhemani@gmail.com') return false;
        if (adminIds.has(profile.id)) return false;
        return true;
      });

      return { data: sevakRequests, error: null };
    } catch (e) {
      console.warn('[AdminService] Error fetching requests:', e);
      return { data: [], error: e };
    }
  },

  /**
   * Approve a Pending Sevak Request
   */
  async approveRequest(userId, adminName = 'Administrator') {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          status: 'ACTIVE',
          rejection_reason: '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (e) {
      console.warn('[AdminService] Error approving request:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Reject a Pending Sevak Request
   */
  async rejectRequest(userId, rejectionReason = '', adminName = 'Administrator') {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          status: 'REJECTED',
          rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (e) {
      console.warn('[AdminService] Error rejecting request:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Delete / Purge a Rejected Sevak Account
   */
  async deleteUser(userId) {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  },

  /**
   * Fetch Dashboard Overview Metrics (Calculates strictly for Sevaks)
   */
  async fetchDashboardMetrics() {
    try {
      const adminIds = await this.getAdminUserIds();

      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('id, email, status');

      if (error) throw error;

      const sevaksOnly = (allProfiles || []).filter((p) => {
        if (p.email === 'bhemanibhemani@gmail.com') return false;
        if (adminIds.has(p.id)) return false;
        return true;
      });

      const pendingCount = sevaksOnly.filter((p) => p.status === 'PENDING').length;
      const activeCount = sevaksOnly.filter((p) => p.status === 'ACTIVE').length;

      return {
        pendingRequests: pendingCount,
        activeSevaks: activeCount,
        activeVihars: 3,
        safeCount: 3,
        warningCount: 0,
        emergencyCount: 0,
      };
    } catch (e) {
      return {
        pendingRequests: 0,
        activeSevaks: 0,
        activeVihars: 3,
        safeCount: 3,
        warningCount: 0,
        emergencyCount: 0,
      };
    }
  },

  /**
   * Subscribe to Realtime Profile changes (with unique channel instance)
   */
  subscribeToRequests(onUpdate) {
    const channelId = `admin_req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          if (onUpdate) onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
