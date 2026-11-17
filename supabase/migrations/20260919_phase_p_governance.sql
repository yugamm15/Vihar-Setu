-- Phase P: Platform-wide Administration & Governance
-- Additive migration for platform policies, thresholds, and governance controls

-- 1. Seed Governance System Settings
INSERT INTO public.system_settings (key, value, description)
VALUES
    ('location_retention_days', '90', 'Retention period for GPS location breadcrumbs in days'),
    ('audit_retention_days', '365', 'Retention period for immutable audit logs in days'),
    ('session_inactivity_timeout_min', '1440', 'Maximum mobile session duration in minutes before re-authentication'),
    ('max_hold_duration_hours', '4', 'Maximum recommended duration for a single Vihar hold in hours'),
    ('max_sub_vihar_distance_km', '25', 'Maximum recommended distance in kilometers for a single sub-vihar session')
ON CONFLICT (key) DO NOTHING;

-- 2. Update super_admin_update_setting to support new policy keys
CREATE OR REPLACE FUNCTION public.super_admin_update_setting(
    p_setting_id INTEGER,
    p_value TEXT
)
RETURNS public.system_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := public.require_active_super_admin();
    before_setting public.system_settings%ROWTYPE;
    result_setting public.system_settings%ROWTYPE;
    numeric_value NUMERIC;
BEGIN
    SELECT * INTO before_setting FROM public.system_settings WHERE id = p_setting_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'System setting was not found.';
    END IF;

    IF before_setting.key NOT IN (
        -- Original Phase K operational thresholds
        'gps_frequency_active_sec',
        'gps_frequency_low_battery_sec',
        'route_deviation_distance_m',
        'route_deviation_duration_sec',
        'stationary_duration_min',
        'safety_response_timeout_sec',
        'emergency_escalation_timeout_sec',
        'low_battery_threshold_pct',
        'critical_battery_threshold_pct',
        -- Phase P Governance Policy settings
        'location_retention_days',
        'audit_retention_days',
        'session_inactivity_timeout_min',
        'max_hold_duration_hours',
        'max_sub_vihar_distance_km'
    ) THEN
        RAISE EXCEPTION 'This system setting is not supported for editing.';
    END IF;

    BEGIN
        numeric_value := p_value::NUMERIC;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'The configuration value must be numeric.';
    END;

    IF numeric_value < 0 OR (before_setting.key LIKE '%battery%' AND numeric_value > 100) THEN
        RAISE EXCEPTION 'The configuration value is outside the supported range.';
    END IF;

    UPDATE public.system_settings
    SET value = to_jsonb(p_value),
        updated_by = caller_id,
        updated_at = NOW()
    WHERE id = p_setting_id
    RETURNING * INTO result_setting;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (
        caller_id,
        'SYSTEM_SETTING_UPDATED',
        'system_settings',
        p_setting_id::TEXT,
        jsonb_build_object(
            'key', before_setting.key,
            'previous_value', before_setting.value,
            'new_value', result_setting.value
        )
    );

    RETURN result_setting;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_update_setting(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_update_setting(INTEGER, TEXT) TO authenticated;
