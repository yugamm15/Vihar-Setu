import { supabase } from '../../../core/config/supabase';
import { ROLES } from '../../../core/constants/roles';

export const authService = {
  /**
   * Request Live Email OTP from Supabase (for Sevaks only)
   */
  async signInWithOtp(emailAddress) {
    const email = emailAddress.trim().toLowerCase();

    // 1. Guard: Check if email is an Administrator / Super Admin account
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_roles(roles(name))')
        .eq('email', email)
        .single();

      if (profile) {
        const roleNames = (profile.user_roles || []).map((ur) => ur.roles?.name);
        if (
          roleNames.includes(ROLES.SUPER_ADMIN) ||
          roleNames.includes(ROLES.ADMIN) ||
          email === 'bhemanibhemani@gmail.com'
        ) {
          return {
            data: null,
            error: {
              message:
                'This email is registered as an Administrator account. Please use "Administrator / Super Admin Login" with your password, or enter a correct Sevak email address.',
            },
          };
        }
      } else if (email === 'bhemanibhemani@gmail.com') {
        return {
          data: null,
          error: {
            message:
              'This email is registered as an Administrator account. Please use "Administrator / Super Admin Login" with your password, or enter a correct Sevak email address.',
          },
        };
      }
    } catch (e) {
      if (email === 'bhemanibhemani@gmail.com') {
        return {
          data: null,
          error: {
            message:
              'This email is registered as an Administrator account. Please use "Administrator / Super Admin Login" with your password, or enter a correct Sevak email address.',
          },
        };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      return { data, error };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /**
   * Direct Password Authentication via Supabase (for Super Admin & Admin)
   */
  async signInWithPassword(emailAddress, password) {
    const email = emailAddress.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPassword,
      });

      if (error) throw error;

      const user = data.user;
      const { profile, role } = await this.fetchUserProfileAndRole(user.id);

      return {
        data: {
          ...data,
          profile: profile || {
            id: user.id,
            email: user.email,
            status: 'ACTIVE',
            full_name: profile?.full_name || 'Administrator',
          },
          role: role || ROLES.ADMIN,
        },
        error: null,
      };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /**
   * Verify Live Email OTP with Supabase (for Sevaks)
   */
  async verifyOtp(emailAddress, token) {
    const email = emailAddress.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: 'email',
      });

      if (error) throw error;

      // Fetch User Profile and Role from PostgreSQL
      const user = data.user;
      const { profile, role } = await this.fetchUserProfileAndRole(user.id);

      return {
        data: {
          ...data,
          profile: profile || {
            id: user.id,
            email: user.email,
            status: 'PENDING',
            full_name: '',
          },
          role: role || ROLES.SEVAK,
        },
        error: null,
      };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /**
   * Fetch Profile & Verified Role dynamically from Supabase Database
   */
  async fetchUserProfileAndRole(userId) {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch primary role via user_roles query
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId);

      let role = ROLES.SEVAK;
      if (userRoles && userRoles.length > 0) {
        const roleNames = userRoles.map((ur) => ur.roles?.name);
        if (roleNames.includes(ROLES.SUPER_ADMIN)) {
          role = ROLES.SUPER_ADMIN;
        } else if (roleNames.includes(ROLES.ADMIN)) {
          role = ROLES.ADMIN;
        } else {
          role = ROLES.SEVAK;
        }
      }

      return { profile, role };
    } catch (e) {
      console.warn('[AuthService] Error fetching profile/role:', e);
      return { profile: null, role: ROLES.SEVAK };
    }
  },

  /**
   * Check Fresh Approval Status from Supabase
   */
  async checkApprovalStatus(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return { status: 'REJECTED', profile: null };
      }

      return { status: profile.status, profile };
    } catch (e) {
      return { status: 'PENDING', error: e };
    }
  },

  /**
   * Update Profile Details (Saves to Supabase Database with Duplicate Check)
   */
  async updateProfile(userId, profileData) {
    try {
      // 1. Guard: Check if phone number is already registered by another user
      if (profileData.phone) {
        const cleanPhone = profileData.phone.trim();
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('phone', cleanPhone)
          .neq('id', userId)
          .maybeSingle();

        if (existingUser) {
          return {
            data: null,
            error: {
              code: 'DUPLICATE_PHONE',
              message: 'This mobile number is already registered with another account.',
            },
          };
        }
      }

      const payload = {
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('phone') ||
          error.details?.includes('phone')
        ) {
          return {
            data: null,
            error: {
              code: 'DUPLICATE_PHONE',
              message: 'This mobile number is already registered with another account.',
            },
          };
        }
        throw error;
      }

      return { data, error: null };
    } catch (e) {
      if (
        e?.code === '23505' ||
        e?.message?.includes('phone') ||
        e?.details?.includes('phone')
      ) {
        return {
          data: null,
          error: {
            code: 'DUPLICATE_PHONE',
            message: 'This mobile number is already registered with another account.',
          },
        };
      }
      return { data: null, error: e };
    }
  },

  /**
   * Subscribe to Live Supabase Realtime Status Push
   */
  subscribeToProfileStatus(userId, onStatusChange) {
    if (!userId) {
      return () => {};
    }

    const channel = supabase
      .channel(`profile_status_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            onStatusChange({ status: 'REJECTED', profile: null, isDeleted: true });
          } else if (payload.new) {
            onStatusChange({
              status: payload.new.status,
              profile: payload.new,
              isDeleted: false,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Withdraw Pending Registration Request (Deletes row in Supabase)
   */
  async withdrawPendingRequest(userId) {
    try {
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[AuthService] Error deleting pending profile:', e);
    }
  },

  /**
   * Sign Out
   */
  async signOut() {
    try {
      await supabase.auth.signOut();
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  },
};
