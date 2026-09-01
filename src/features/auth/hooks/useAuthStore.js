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
  language: 'gu',
  isAuthenticated: false,
  isLoading: true,
  error: null,
  pendingPhone: '',

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
        set({
          user: savedUser,
          profile: savedProfile,
          role: savedRole,
          language: savedLang,
          isAuthenticated: true,
          isLoading: false,
        });
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
   * Step 1: Send OTP
   */
  requestOtp: async (phone) => {
    set({ isLoading: true, error: null, pendingPhone: phone });
    const { data, error } = await authService.signInWithOtp(phone);
    set({ isLoading: false });

    if (error) {
      set({ error: error.message || 'Failed to send OTP' });
      return false;
    }
    return true;
  },

  /**
   * Step 2: Verify OTP and Route according to Role
   */
  verifyOtp: async (phone, otp) => {
    set({ isLoading: true, error: null });
    const { data, error } = await authService.verifyOtp(phone, otp);

    if (error || !data) {
      set({
        isLoading: false,
        error: error?.message || 'Invalid or expired OTP code.',
      });
      return { success: false };
    }

    const { user, profile, role, session } = data;
    const resolvedRole = role || ROLES.SEVAK;

    // Save to persistent storage
    await storage.setItem('auth_user', user);
    await storage.setItem('auth_profile', profile);
    await storage.setItem('auth_role', resolvedRole);

    set({
      user,
      profile,
      role: resolvedRole,
      session,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const isNewUser = !profile?.full_name || profile.full_name.trim() === '';
    return { success: true, isNewUser, role: resolvedRole };
  },

  /**
   * Save / Update Profile
   */
  updateProfileDetails: async (details) => {
    const { user, profile } = get();
    if (!user) return false;

    set({ isLoading: true });
    const updated = { ...profile, ...details };
    const { data, error } = await authService.updateProfile(user.id, details);

    if (error) {
      set({ isLoading: false, error: error.message });
      return false;
    }

    await storage.setItem('auth_profile', updated);
    set({ profile: updated, isLoading: false });
    return true;
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
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pendingPhone: '',
    });
  },
}));
