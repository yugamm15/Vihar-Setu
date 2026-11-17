import { create } from 'zustand';
import { authService } from '../services/authService';
import { storage } from '../../../core/storage/asyncStorage';
import { setAppLanguage, loadStoredLanguage } from '../../../core/localization/i18n';
import { ROLES } from '../../../core/constants/roles';

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  role: null, // 'SEVAK' | 'ADMIN' | 'SUPER_ADMIN'
  availableRoles: [], // ['SEVAK', 'ADMIN']
  status: 'PENDING', // 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED'
  language: 'gu',
  isAuthenticated: false,
  isLoading: true,
  error: null,
  pendingEmail: '',

  /**
   * Initialize Session & Language from Storage
   */
  initAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const savedLang = await loadStoredLanguage();
      const savedUser = await storage.getItem('auth_user');
      const savedProfile = await storage.getItem('auth_profile');
      const savedRole = await storage.getItem('auth_role');

      if (savedUser && savedRole) {
        const { profile: freshProfile, role: freshRole, availableRoles = [], error } =
          await authService.fetchUserProfileAndRole(savedUser.id);
        const rolesList = availableRoles.length ? availableRoles : [freshRole].filter(Boolean);
        const isValidRole = Object.values(ROLES).includes(freshRole);
        const isAllowedStatus =
          freshRole === ROLES.SEVAK
            ? freshProfile?.status === 'ACTIVE' || freshProfile?.status === 'PENDING'
            : freshProfile?.status === 'ACTIVE';

        if (
          error ||
          !freshProfile ||
          !isValidRole ||
          !isAllowedStatus
        ) {
          await storage.removeItem('auth_user');
          await storage.removeItem('auth_profile');
          await storage.removeItem('auth_role');
          set({
            language: savedLang,
            isAuthenticated: false,
            isLoading: false,
            error:
              freshProfile?.status === 'DISABLED'
                ? 'Your account has been suspended. Please contact administrator.'
                : freshProfile?.status === 'REJECTED'
                ? 'Your volunteer registration was not approved.'
                : 'Your session is no longer authorized.',
          });
        } else {
          const activeRole = rolesList.includes(savedRole) ? savedRole : freshRole;
          await storage.setItem('auth_profile', freshProfile);
          await storage.setItem('auth_role', activeRole);
          set({
            user: savedUser,
            profile: freshProfile,
            role: activeRole,
            availableRoles: rolesList,
            status: freshProfile.status || 'PENDING',
            language: savedLang,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } else {
        set({
          language: savedLang,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (e) {
      console.error('[AuthStore] Initialization failed:', e);
      set({ isLoading: false });
    }
  },

  /**
   * Set Language
   */
  changeLanguage: async (lang) => {
    await setAppLanguage(lang);
    set({ language: lang });
  },

  /**
   * Super Admin & Admin Direct Password Login
   */
  loginWithPassword: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await authService.signInWithPassword(email, password);

    if (error || !data) {
      set({
        isLoading: false,
        error: error?.message || 'Invalid email or password.',
      });
      return false;
    }

    const { user, profile, role, session, availableRoles = [] } = data;
    if (!user || !profile || !Object.values(ROLES).includes(role)) {
      set({
        isLoading: false,
        error: 'Authenticated account is not authorized for this application.',
      });
      return false;
    }
    const resolvedRole = role;
    const resolvedStatus = profile.status;
    const rolesList = availableRoles.length ? availableRoles : [role];

    await storage.setItem('auth_user', user);
    await storage.setItem('auth_profile', profile);
    await storage.setItem('auth_role', resolvedRole);

    set({
      user,
      profile,
      role: resolvedRole,
      availableRoles: rolesList,
      status: resolvedStatus,
      session,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    return true;
  },

  /**
   * Step 1: Send Email OTP
   */
  requestOtp: async (email) => {
    set({ isLoading: true, error: null, pendingEmail: email });
    const { data, error } = await authService.signInWithOtp(email);
    set({ isLoading: false });

    if (error) {
      set({ error: error.message || 'Failed to send OTP to email' });
      return false;
    }
    return true;
  },

  /**
   * Step 2: Verify Email OTP and Route according to Role & Status
   */
  verifyOtp: async (email, otp) => {
    set({ isLoading: true, error: null });
    const { data, error } = await authService.verifyOtp(email, otp);

    if (error || !data) {
      set({
        isLoading: false,
        error: error?.message || 'Invalid or expired OTP code.',
      });
      return { success: false };
    }

    const { user, profile, role, session, availableRoles = [] } = data;
    if (!user || !profile || !Object.values(ROLES).includes(role)) {
      set({
        isLoading: false,
        error: 'Authenticated account is not authorized for this application.',
      });
      return { success: false };
    }

    const resolvedRole = role;
    const resolvedStatus = profile?.status || 'PENDING';
    const rolesList = availableRoles.length ? availableRoles : [role];

    // Save to persistent storage
    await storage.setItem('auth_user', user);
    await storage.setItem('auth_profile', profile);
    await storage.setItem('auth_role', resolvedRole);

    set({
      user,
      profile,
      role: resolvedRole,
      availableRoles: rolesList,
      status: resolvedStatus,
      session,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const isNewUser = !profile?.full_name || profile.full_name.trim() === '';
    return { success: true, isNewUser, role: resolvedRole, status: resolvedStatus };
  },

  /**
   * Save / Update Profile & Submit Registration
   */
  updateProfileDetails: async (details) => {
    const { user, profile } = get();
    if (!user) return false;

    set({ isLoading: true, error: null });
    const updated = {
      ...profile,
      ...details,
      status: details.status || profile?.status || 'PENDING',
    };

    const { data, error } = await authService.updateProfile(user.id, details);

    if (error) {
      const msg =
        error.code === 'DUPLICATE_PHONE' ||
        error.message?.includes('phone') ||
        error.message?.includes('23505')
          ? 'This mobile number is already registered with another account.'
          : error.message || 'Could not save profile details.';
      set({ isLoading: false, error: msg });
      return false;
    }

    const finalProfile = data || updated;
    await storage.setItem('auth_profile', finalProfile);
    set({
      profile: finalProfile,
      status: finalProfile.status || 'PENDING',
      isLoading: false,
    });
    return true;
  },

  /**
   * Set Status (called by Realtime Listener or Status Polling)
   */
  setProfileStatus: async (newStatus, updatedProfile = null) => {
    const { profile } = get();
    const merged = updatedProfile ? { ...profile, ...updatedProfile, status: newStatus } : { ...profile, status: newStatus };

    await storage.setItem('auth_profile', merged);
    set({
      status: newStatus,
      profile: merged,
    });
  },

  /**
   * Refresh Approval Status from Database
   */
  checkStatus: async () => {
    const { user } = get();
    if (!user?.id) return 'PENDING';

    const { status: freshStatus, profile: freshProfile } = await authService.checkApprovalStatus(user.id);
    if (freshStatus) {
      await get().setProfileStatus(freshStatus, freshProfile);
      return freshStatus;
    }
    return 'PENDING';
  },

  /**
   * Withdraw Request & Cancel Registration
   */
  withdrawRequest: async () => {
    const { user } = get();
    if (user?.id) {
      await authService.withdrawPendingRequest(user.id);
    }
    await get().logout();
  },

  /**
   * Switch Role (for demonstration and multi-role testing)
   */
  switchRole: async (targetRole) => {
    await storage.setItem('auth_role', targetRole);
    set({ role: targetRole });
  },

  /**
   * Dynamically refresh assigned roles from database
   */
  refreshRoles: async () => {
    const { user } = get();
    if (!user?.id) return;
    try {
      const { availableRoles = [], profile } = await authService.fetchUserProfileAndRole(user.id);
      if (availableRoles.length) {
        set({ availableRoles, profile: profile || get().profile });
      }
    } catch {}
  },

  /**
   * Logout
   */
  logout: async () => {
    await authService.signOut();
    await storage.removeItem('auth_user');
    await storage.removeItem('auth_profile');
    await storage.removeItem('auth_role');

    set({
      user: null,
      session: null,
      profile: null,
      role: null,
      status: 'PENDING',
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pendingEmail: '',
    });
  },
}));
