-- Phase K - Super Admin operational controls
-- Additive migration. Apply only in an isolated verification database first.

CREATE OR REPLACE FUNCTION public.require_active_super_admin()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL OR NOT public.has_role(caller_id, 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'An active Super Administrator is required.';
    END IF;
    RETURN caller_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_set_profile_status(
    p_user_id UUID,
    p_status TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := public.require_active_super_admin();
    target_profile public.profiles%ROWTYPE;
    result_profile public.profiles%ROWTYPE;
BEGIN
    IF p_user_id IS NULL OR p_status NOT IN ('ACTIVE', 'DISABLED') THEN
        RAISE EXCEPTION 'Only ACTIVE and DISABLED status transitions are supported.';
    END IF;
    IF p_user_id = caller_id THEN
        RAISE EXCEPTION 'The current Super Administrator cannot be disabled.';
    END IF;

    SELECT * INTO target_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Target profile was not found.'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id AND r.name IN ('SEVAK', 'ADMIN')
    ) THEN
        RAISE EXCEPTION 'The target does not have a managed role.';
    END IF;
    IF target_profile.status = p_status THEN
        RETURN target_profile;
    END IF;
    IF p_status = 'ACTIVE' AND target_profile.status <> 'DISABLED' THEN
        RAISE EXCEPTION 'Only disabled profiles can be reactivated.';
    END IF;
    IF p_status = 'DISABLED' AND target_profile.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Only active profiles can be disabled.';
    END IF;

    UPDATE public.profiles
    SET status = p_status, rejection_reason = NULL, updated_at = NOW()
    WHERE id = p_user_id
    RETURNING * INTO result_profile;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (caller_id, 'PROFILE_STATUS_CHANGED', 'profiles', p_user_id::TEXT,
        jsonb_build_object('previous_status', target_profile.status, 'new_status', p_status));
    RETURN result_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_approve_profile(p_user_id UUID)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := public.require_active_super_admin();
    target_profile public.profiles%ROWTYPE;
    result_profile public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO target_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND OR target_profile.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Only pending profiles can be activated.';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = p_user_id AND r.name = 'SEVAK'
    ) THEN
        RAISE EXCEPTION 'Only pending Sevak profiles can be activated.';
    END IF;

    UPDATE public.profiles SET status = 'ACTIVE', rejection_reason = NULL, updated_at = NOW()
    WHERE id = p_user_id RETURNING * INTO result_profile;
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (caller_id, 'SEVAK_APPROVED', 'profiles', p_user_id::TEXT, '{}'::JSONB);
    RETURN result_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_administrator(
    p_administrator_id UUID,
    p_is_active BOOLEAN DEFAULT NULL,
    p_area_id UUID DEFAULT NULL,
    p_permissions JSONB DEFAULT NULL
)
RETURNS public.administrators
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := public.require_active_super_admin();
    before_record public.administrators%ROWTYPE;
    after_record public.administrators%ROWTYPE;
    next_area UUID;
BEGIN
    SELECT * INTO before_record FROM public.administrators
    WHERE id = p_administrator_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Administrator assignment was not found.'; END IF;

    next_area := COALESCE(p_area_id, before_record.area_id);
    IF next_area IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.areas WHERE id = next_area AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'The selected area is not active.';
    END IF;
    IF p_permissions IS NOT NULL AND (
        p_permissions ?| ARRAY['can_manage_sevaks', 'can_monitor_vihars', 'can_call_police', 'can_edit_area']
    ) IS FALSE THEN
        RAISE EXCEPTION 'No supported administrator permission was supplied.';
    END IF;

    UPDATE public.administrators
    SET is_active = COALESCE(p_is_active, is_active),
        area_id = next_area,
        permissions = COALESCE(p_permissions, permissions),
        updated_at = NOW()
    WHERE id = p_administrator_id
    RETURNING * INTO after_record;

    IF p_permissions IS NOT NULL THEN
        INSERT INTO public.admin_permissions (admin_id, permission_key, is_granted, granted_by, updated_at)
        SELECT p_administrator_id, key, value::BOOLEAN, caller_id, NOW()
        FROM jsonb_each_text(p_permissions)
        WHERE key IN ('can_manage_sevaks', 'can_monitor_vihars', 'can_call_police', 'can_edit_area')
        ON CONFLICT (admin_id, permission_key)
        DO UPDATE SET is_granted = EXCLUDED.is_granted, granted_by = EXCLUDED.granted_by, updated_at = NOW();
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (caller_id, 'ADMINISTRATOR_UPDATED', 'administrators', p_administrator_id::TEXT,
        jsonb_build_object('before', jsonb_build_object('is_active', before_record.is_active, 'area_id', before_record.area_id, 'permissions', before_record.permissions),
                           'after', jsonb_build_object('is_active', after_record.is_active, 'area_id', after_record.area_id, 'permissions', after_record.permissions)));
    RETURN after_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_create_area(
    p_name TEXT,
    p_city TEXT DEFAULT 'Surat',
    p_state TEXT DEFAULT 'Gujarat'
)
RETURNS public.areas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := public.require_active_super_admin();
    result_area public.areas%ROWTYPE;
BEGIN
    IF NULLIF(BTRIM(p_name), '') IS NULL OR NULLIF(BTRIM(p_city), '') IS NULL THEN
        RAISE EXCEPTION 'Area name and city are required.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.areas
        WHERE LOWER(BTRIM(name)) = LOWER(BTRIM(p_name))
          AND LOWER(BTRIM(city)) = LOWER(BTRIM(p_city))
    ) THEN
        RAISE EXCEPTION 'An area with this name already exists in the city.';
    END IF;
    INSERT INTO public.areas (name, city, state, is_active)
    VALUES (BTRIM(p_name), BTRIM(p_city), COALESCE(NULLIF(BTRIM(p_state), ''), 'Gujarat'), TRUE)
    RETURNING * INTO result_area;
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (caller_id, 'AREA_CREATED', 'areas', result_area.id::TEXT, to_jsonb(result_area));
    RETURN result_area;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_area(
    p_area_id UUID,
    p_name TEXT,
    p_city TEXT,
    p_state TEXT DEFAULT 'Gujarat',
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS public.areas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := public.require_active_super_admin();
    before_area public.areas%ROWTYPE;
    result_area public.areas%ROWTYPE;
BEGIN
    SELECT * INTO before_area FROM public.areas WHERE id = p_area_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Area was not found.'; END IF;
    IF NULLIF(BTRIM(p_name), '') IS NULL OR NULLIF(BTRIM(p_city), '') IS NULL THEN
        RAISE EXCEPTION 'Area name and city are required.';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.areas
        WHERE id <> p_area_id
          AND LOWER(BTRIM(name)) = LOWER(BTRIM(p_name))
          AND LOWER(BTRIM(city)) = LOWER(BTRIM(p_city))
    ) THEN
        RAISE EXCEPTION 'An area with this name already exists in the city.';
    END IF;
    IF p_is_active = FALSE AND EXISTS (
        SELECT 1 FROM public.administrators WHERE area_id = p_area_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Deactivate assigned Administrators before archiving this area.';
    END IF;
    UPDATE public.areas
    SET name = BTRIM(p_name), city = BTRIM(p_city),
        state = COALESCE(NULLIF(BTRIM(p_state), ''), state),
        is_active = COALESCE(p_is_active, is_active), updated_at = NOW()
    WHERE id = p_area_id RETURNING * INTO result_area;
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (caller_id, 'AREA_UPDATED', 'areas', p_area_id::TEXT,
        jsonb_build_object('before', to_jsonb(before_area), 'after', to_jsonb(result_area)));
    RETURN result_area;
END;
$$;

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
    IF NOT FOUND THEN RAISE EXCEPTION 'System setting was not found.'; END IF;
    IF before_setting.key NOT IN (
        'gps_frequency_active_sec', 'gps_frequency_low_battery_sec',
        'route_deviation_distance_m', 'route_deviation_duration_sec',
        'stationary_duration_min', 'safety_response_timeout_sec',
        'emergency_escalation_timeout_sec', 'low_battery_threshold_pct',
        'critical_battery_threshold_pct'
    ) THEN
        RAISE EXCEPTION 'This system setting is not supported for editing.';
    END IF;
    BEGIN numeric_value := p_value::NUMERIC; EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'The configuration value must be numeric.';
    END;
    IF numeric_value < 0 OR (before_setting.key LIKE '%battery%' AND numeric_value > 100) THEN
        RAISE EXCEPTION 'The configuration value is outside the supported range.';
    END IF;

    UPDATE public.system_settings SET value = to_jsonb(p_value), updated_by = caller_id, updated_at = NOW()
    WHERE id = p_setting_id RETURNING * INTO result_setting;
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (caller_id, 'SYSTEM_SETTING_UPDATED', 'system_settings', p_setting_id::TEXT,
        jsonb_build_object('key', before_setting.key, 'previous_value', before_setting.value, 'new_value', result_setting.value));
    RETURN result_setting;
END;
$$;

REVOKE ALL ON FUNCTION public.require_active_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_set_profile_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_approve_profile(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_update_administrator(UUID, BOOLEAN, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_create_area(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_update_area(UUID, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_update_setting(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_active_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_set_profile_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_approve_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_administrator(UUID, BOOLEAN, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_create_area(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_area(UUID, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_setting(INTEGER, TEXT) TO authenticated;
