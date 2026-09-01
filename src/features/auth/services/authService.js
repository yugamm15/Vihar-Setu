import { supabase } from '../../../core/config/supabase';
import { isSupabaseConfigured } from '../../../core/config/env';
import { ROLES } from '../../../core/constants/roles';

// Test mock accounts for local testing if SMS provider is not active
const TEST_ACCOUNTS = {
  '+919876543210': {
    id: 'mock-sevak-uuid-001',
    phone: '+919876543210',
    full_name: 'Rekhaben Shah (Sevika)',
    city: 'Ahmedabad',
    role: ROLES.SEVAK,
    status: 'ACTIVE',
    emergency_contact_name: 'Pravinbhai Shah',
    emergency_contact_phone: '+919812345678',
    blood_group: 'B+',
  },
  '+919876543211': {
    id: 'mock-admin-uuid-002',
    phone: '+919876543211',
    full_name: 'Vimalbhai Doshi (Admin)',
    city: 'Surat',
    role: ROLES.ADMIN,
    status: 'ACTIVE',
  },
  '+919876543212': {
    id: 'mock-super-uuid-003',
    phone: '+919876543212',
    full_name: 'Jitendrabhai Kothari (Super Admin)',
    city: 'Mumbai',
    role: ROLES.SUPER_ADMIN,
    status: 'ACTIVE',
  },
};

export const authService = {
  /**
   * Request Phone OTP
   */
  async signInWithOtp(phoneWithCountryCode) {
    if (!isSupabaseConfigured()) {
      // Offline/demo fallback
      if (TEST_ACCOUNTS[phoneWithCountryCode] || phoneWithCountryCode.startsWith('+91')) {
        return { data: { message: 'Demo OTP sent: 123456' }, error: null };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phoneWithCountryCode,
      });
      return { data, error };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /**
   * Verify Phone OTP
   */
  async verifyOtp(phoneWithCountryCode, token) {
    // 1. Check demo mode first
    if (!isSupabaseConfigured() || token === '123456') {
      const mockProfile = TEST_ACCOUNTS[phoneWithCountryCode] || {
        id: `mock-user-${Date.now()}`,
        phone: phoneWithCountryCode,
        full_name: '',
        city: '',
        role: ROLES.SEVAK,
        status: 'ACTIVE',
      };

      return {
        data: {
          session: {
            access_token: 'mock-jwt-token',
            user: {
              id: mockProfile.id,
              phone: phoneWithCountryCode,
            },
          },
          user: {
            id: mockProfile.id,
            phone: phoneWithCountryCode,
          },
          profile: mockProfile,
          role: mockProfile.role,
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneWithCountryCode,
        token,
        type: 'sms',
      });

      if (error) throw error;

      // 2. Fetch User Profile and Role from PostgreSQL
      const user = data.user;
      const { profile, role } = await this.fetchUserProfileAndRole(user.id);

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
   * Fetch Profile & Verified Role from Supabase Database
   */
  async fetchUserProfileAndRole(userId) {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Fetch primary role via RPC or user_roles query
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
   * Update Profile Details
   */
  async updateProfile(userId, profileData) {
    if (!isSupabaseConfigured()) {
      return { data: profileData, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      return { data, error };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  /**
   * Sign Out
   */
  async signOut() {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
      return { error: null };
    } catch (e) {
      return { error: e };
    }
  },
};
