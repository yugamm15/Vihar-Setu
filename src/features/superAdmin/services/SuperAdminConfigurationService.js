import { supabase } from '../../../core/config/supabase';

const SENSITIVE_KEY_PARTS = ['secret', 'token', 'password', 'credential', 'api_key', 'private_key', 'provider'];

const isSensitive = (key = '') => SENSITIVE_KEY_PARTS.some((part) => key.toLowerCase().includes(part));
const valueType = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const displayValue = (key, value) => {
  if (isSensitive(key)) return { value: '[REDACTED]', redacted: true };
  if (typeof value === 'object' && value !== null) return { value: JSON.stringify(value), redacted: false };
  return { value: String(value), redacted: false };
};

const categoryFor = (key = '') => {
  if (key.startsWith('gps_') || key.startsWith('route_') || key.startsWith('stationary_')) return 'operational';
  if (key.includes('emergency') || key.includes('battery')) return 'safety';
  if (key.includes('notification') || key.includes('sms') || key.includes('push')) return 'notifications';
  if (key.includes('language') || key.includes('locale')) return 'localization';
  return 'general';
};

const mapSetting = (record) => ({
  ...record,
  category: categoryFor(record.key),
  dataType: valueType(record.value),
  ...displayValue(record.key, record.value),
});

export const superAdminConfigurationService = {
  async updateSetting(settingId, value) {
    const { data, error } = await supabase.rpc('super_admin_update_setting', {
      p_setting_id: settingId,
      p_value: String(value).trim(),
    });
    return { data, error };
  },
  async listSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('id, key, value, description, updated_by, updated_at')
      .order('key', { ascending: true });
    if (error) return { data: [], errors: [{ section: 'settings', message: error.message }], error };
    return { data: (data || []).map(mapSetting), errors: [], error: null };
  },

  async getSettingDetails(settingId) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('id, key, value, description, updated_by, updated_at')
      .eq('id', settingId)
      .single();
    if (error) return { data: null, errors: [{ section: 'setting', message: error.message }], error };

    const setting = mapSetting(data);
    const audit = await supabase
      .from('audit_logs')
      .select('id, actor_id, action, entity, entity_id, details, created_at')
      .eq('entity', 'system_settings')
      .eq('entity_id', String(setting.id))
      .order('created_at', { ascending: false })
      .limit(25);
    return {
      data: { setting, audit: audit.data || [] },
      errors: audit.error ? [{ section: 'audit', message: audit.error.message }] : [],
      error: null,
    };
  },
};
