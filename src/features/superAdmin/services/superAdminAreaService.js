import { supabase } from '../../../core/config/supabase';

export const superAdminAreaService = {
  async listAreas() {
    const { data, error } = await supabase
      .from('areas')
      .select('id, name, city, state, is_active, created_at, updated_at')
      .order('name', { ascending: true });
    return { data: data || [], error };
  },

  async listAdministrators() {
    const { data, error } = await supabase
      .from('administrators')
      .select('id, area_id, is_active, profiles:user_id(full_name, phone, email)')
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },

  async createArea(name, city, state = 'Gujarat') {
    try {
      const { data, error } = await supabase.rpc('super_admin_create_area', {
        p_name: name,
        p_city: city,
        p_state: state,
      });
      if (!error && data) return { data, error: null };
    } catch {}

    // Direct table insert fallback
    const { data, error } = await supabase
      .from('areas')
      .insert({ name, city, state, is_active: true })
      .select()
      .single();
    return { data, error };
  },

  /**
   * Links or promotes a Sevak to Administrator when creating/assigning an area
   */
  async assignAdministratorToArea({ areaId, areaName, adminName, adminPhone, adminEmail }) {
    try {
      let matchedProfile = null;
      const cleanPhone = (adminPhone || '').replace(/\D/g, '');
      const cleanEmail = (adminEmail || '').trim().toLowerCase();

      // 1. Check if user already exists by phone (matching last 10 digits)
      if (cleanPhone.length >= 10) {
        const last10 = cleanPhone.slice(-10);
        const { data: byPhone } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email, status')
          .or(`phone.ilike.%${last10}%,phone.eq.+91${last10},phone.eq.${last10}`)
          .limit(1);
        if (byPhone && byPhone.length > 0) {
          matchedProfile = byPhone[0];
        }
      }

      // 2. Check by email if not found by phone
      if (!matchedProfile && cleanEmail) {
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('id, full_name, phone, email, status')
          .ilike('email', cleanEmail)
          .limit(1);
        if (byEmail && byEmail.length > 0) {
          matchedProfile = byEmail[0];
        }
      }

      if (matchedProfile) {
        // Fetch ADMIN role id
        const { data: roleRow } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'ADMIN')
          .single();

        if (roleRow?.id) {
          // Assign ADMIN role in user_roles
          await supabase
            .from('user_roles')
            .upsert(
              { user_id: matchedProfile.id, role_id: roleRow.id },
              { onConflict: 'user_id,role_id' }
            );
        }

        // Link in administrators table
        await supabase
          .from('administrators')
          .upsert(
            {
              user_id: matchedProfile.id,
              area_id: areaId,
              is_active: true,
              permissions: {
                can_manage_sevaks: true,
                can_monitor_vihars: true,
                can_call_police: true,
                can_edit_area: false,
              },
            },
            { onConflict: 'user_id' }
          );

        // Dispatch real-time in-app notification to that Sevak
        try {
          await supabase.from('notifications').insert({
            user_id: matchedProfile.id,
            title: 'Promoted to Area Administrator 🎉',
            body: `Jai Jinendra! You have been designated as the Administrator for ${areaName}. You can now switch to Administrator Console & Live Radar from your More menu.`,
            type: 'APPROVAL',
            severity: 'INFO',
            metadata: {
              action: 'ROLE_PROMOTION',
              role: 'ADMIN',
              area_id: areaId,
              area_name: areaName,
              promoted_at: new Date().toISOString(),
            },
          });
        } catch (notifErr) {
          console.warn('[superAdminAreaService] Notification error:', notifErr);
        }

        return { success: true, matchedProfile, promoted: true };
      }

      return { success: true, matchedProfile: null, promoted: false };
    } catch (err) {
      console.warn('[superAdminAreaService] assignAdministrator error:', err);
      return { success: false, error: err };
    }
  },

  async updateArea(areaId, name, city, state, isActive) {
    const { data, error } = await supabase.rpc('super_admin_update_area', {
      p_area_id: areaId,
      p_name: name,
      p_city: city,
      p_state: state,
      p_is_active: isActive,
    });
    return { data, error };
  },
};
