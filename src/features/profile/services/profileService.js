import { supabase } from '../../../core/config/supabase';

/**
 * Profile Management Service
 * Direct interface with Supabase PostgreSQL `public.profiles` & Storage
 */
export const profileService = {
  /**
   * Fetch full profile by User UUID
   */
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (e) {
      console.warn('[ProfileService] getProfile error:', e);
      return { data: null, error: e };
    }
  },

  /**
   * Update Profile Details with phone number uniqueness check
   */
  async updateProfile(userId, profileData) {
    try {
      // 1. Check duplicate phone number if provided
      if (profileData.phone) {
        const cleanPhone = profileData.phone.trim();
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('phone', cleanPhone)
          .neq('id', userId)
          .maybeSingle();

        if (existing) {
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

      if (error) throw error;
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
   * Upload Profile Photo to Supabase Storage `profile-images` bucket
   */
  async uploadProfileImage(userId, fileUri, fileExt = 'jpg') {
    try {
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Create FormData or base64 upload depending on platform
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
      });

      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, formData, {
          upsert: true,
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        });

      if (error) {
        // Fallback: If bucket does not exist, return null gracefully
        console.warn('[ProfileService] Storage upload error (using local avatar):', error);
        return { publicUrl: null, error };
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      return { publicUrl: publicUrlData?.publicUrl, error: null };
    } catch (e) {
      console.warn('[ProfileService] Image upload exception:', e);
      return { publicUrl: null, error: e };
    }
  },
};
