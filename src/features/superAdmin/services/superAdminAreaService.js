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
    const { data, error } = await supabase.rpc('super_admin_create_area', {
      p_name: name,
      p_city: city,
      p_state: state,
    });
    return { data, error };
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
