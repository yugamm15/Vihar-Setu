import { supabase } from '../../../core/config/supabase';
import { ROLES } from '../../../core/constants/roles';

export const authService = {
  /**
   * Helper to check if input is a 10-digit Indian phone number
   */
  isPhoneNumber(val) {
    if (!val) return false;
    const clean = String(val).replace(/[^0-9]/g, '');
    return clean.length === 10 || (clean.length === 12 && clean.startsWith('91'));
  },

  /**
   * Format phone number to E.164 (+91XXXXXXXXXX)
   */
  formatPhone(val) {
    if (!val) return '';
    const clean = String(val).replace(/[^0-9]/g, '');
    if (clean.length === 10) return `+91${clean}`;
    if (clean.length === 12 && clean.startsWith('91')) return `+${clean}`;
    return val;
  },

  /**
   * Request Live Phone SMS or Email OTP from Supabase (for Sevaks)
   */
  async signInWithOtp(identifier) {
    const raw = String(identifier || '').trim();

    if (this.isPhoneNumber(raw)) {
      const fullPhone = this.formatPhone(raw);

      // Guard: Check if phone is a Super Admin account (Super Admin must use password)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_roles:user_roles!user_roles_user_id_fkey(roles(name))')
          .eq('phone', fullPhone)
          .maybeSingle();

        if (profile) {
          const roleNames = (profile.user_roles || []).map((ur) => ur.roles?.name);
          if (roleNames.includes(ROLES.SUPER_ADMIN)) {
            return {
              data: null,
              error: {
                message:
                  'This phone number belongs to a Super Administrator account. Super Admin must log in using password. Please tap "Super Admin Password Login" below.',
              },
            };
          }
        }
      } catch (e) {
        // Proceed
      }

      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: fullPhone,
          options: {
            shouldCreateUser: true,
          },
        });
        return { data, error, isPhone: true, identifier: fullPhone };
      } catch (e) {
        return { data: null, error: e, isPhone: true, identifier: fullPhone };
      }
    }

    const email = raw.toLowerCase();

    // 1. Guard: Check if email belongs to Super Admin (Super Admin must use password)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_roles:user_roles!user_roles_user_id_fkey(roles(name))')
        .eq('email', email)
        .maybeSingle();

      if (profile) {
        const roleNames = (profile.user_roles || []).map((ur) => ur.roles?.name);
        if (roleNames.includes(ROLES.SUPER_ADMIN)) {
          return {
            data: null,
            error: {
              message:
                'This email belongs to a Super Administrator account. Super Admin must log in using password. Please tap "Super Admin Password Login" below.',
            },
          };
        }
      }
    } catch (e) {
      // Proceed
    }

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      return { data, error, isPhone: false, identifier: email };
    } catch (e) {
      return { data: null, error: e, isPhone: false, identifier: email };
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
      const { profile, role, error: authorizationError } =
        await this.fetchUserProfileAndRole(user.id);

      if (authorizationError || !profile || !role) {
        throw authorizationError || new Error('Authenticated account has no database role.');
      }

      if (profile.status !== 'ACTIVE') {
        throw new Error(
          profile.status === 'DISABLED'
            ? 'This account has been disabled. Please contact Super Administrator.'
            : `This account is ${String(profile.status || 'inactive').toLowerCase()}.`
        );
      }

      return {
        data: {
          ...data,
          profile,
          role,
        },
        error: null,
      };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /**
   * Verify Live Phone SMS or Email OTP with Supabase (for Sevaks)
   */
  async verifyOtp(identifier, token) {
    const raw = String(identifier || '').trim();
    const cleanToken = String(token || '').trim();
    const isPhone = this.isPhoneNumber(raw);
    const fullPhone = isPhone ? this.formatPhone(raw) : '';
    const email = !isPhone ? raw.toLowerCase() : '';

    if (!/^\d{8}$/.test(cleanToken)) {
      return {
        data: null,
        error: { message: 'OTP must be exactly 8 digits.' },
      };
    }

    try {
      const verifyPayload = isPhone
        ? {
            phone: fullPhone,
            token: cleanToken,
            type: 'sms',
          }
        : {
            email: email,
            token: cleanToken,
            type: 'email',
          };

      const { data, error } = await supabase.auth.verifyOtp(verifyPayload);

      if (error) throw error;

      // Fetch User Profile and Role from PostgreSQL
      const user = data.user;
      const { profile, role } = await this.fetchUserProfileAndRole(user.id);
      if (!profile || !role) {
        throw new Error('Authenticated account is not authorized for this application.');
      }

      if (profile.status === 'DISABLED') {
        throw new Error('This account has been disabled. Please contact an administrator.');
      }

      if (profile.status === 'REJECTED') {
        throw new Error('This volunteer registration was not approved. Please contact an administrator.');
      }

      if (role === ROLES.SUPER_ADMIN) {
        await supabase.auth.signOut();
        throw new Error('Super Administrator accounts must use password login.');
      }

      return {
        data: {
          ...data,
          profile,
          role,
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch primary role via user_roles query
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId);

      if (userRolesError) throw userRolesError;

      let role = null;
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

      if (!profile) {
        return {
          profile: null,
          role: null,
          error: new Error('Authenticated account profile was not found.'),
        };
      }

      if (!role) {
        return {
          profile,
          role: null,
          error: new Error('Authenticated account has no assigned database role.'),
        };
      }

      return { profile, role, error: null };
    } catch (e) {
      console.warn('[AuthService] Error fetching profile/role:', e);
      return { profile: null, role: null, error: e };
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
   * Hard Delete Sevak Account (Strictly for Super Admin use)
   */
  async hardDeleteSevakAccount(userId) {
    try {
      const { data, error } = await supabase.rpc('hard_delete_sevak', {
        target_user_id: userId,
      });

      if (error) {
        try {
          await supabase.rpc('record_security_event', {
            p_action: 'SEVAK_HARD_DELETE_FAILED',
            p_entity: 'profiles',
            p_entity_id: userId,
            p_details: { error: error.message },
          });
        } catch (auditError) {
          console.warn('[AuthService] Could not record hard-delete failure:', auditError);
        }
        throw error;
      }

      return {
        success: true,
        message: data?.message || 'Sevak account permanently deleted.',
      };
    } catch (e) {
      console.warn('[AuthService] Error in hardDeleteSevakAccount:', e);
      return { success: false, error: e };
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
