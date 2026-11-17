-- ==============================================================================
-- JINAARYA VIHAR SETU — COMPLETE CONSOLIDATED APPLICATION MIGRATION
-- Run this script in the Supabase SQL Editor:
-- Project: https://supabase.com/dashboard/project/uxymzrpnwdtppxutjwum/sql
--
-- This script creates all missing tables, foreign keys, indexes, RLS policies,
-- and Super Admin / Admin Live RPC functions committed by the team.
-- It is idempotent (safe to run multiple times).
-- ==============================================================================

-- 0. EXTEND ENUM TYPES
DO $$ BEGIN
    ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'REJECTED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1. CREATE MISSING TABLES

-- 1.1 VIHAR ROUTES (Planned & Alternative GIS Polylines for Vihars)
CREATE TABLE IF NOT EXISTS public.vihar_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    sub_vihar_id UUID REFERENCES public.vihar_subsessions(id) ON DELETE CASCADE,
    route_name TEXT NOT NULL,
    origin_name TEXT,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    dest_name TEXT,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    polyline_points TEXT,
    total_distance_km DECIMAL(6, 2) DEFAULT 0.00,
    estimated_duration_mins INT DEFAULT 60,
    is_active_route BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 NOTIFICATIONS TABLE (Multi-Tier Safety, Emergency, Deviation, Hold & System Alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vihar_id UUID REFERENCES public.vihars(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('EMERGENCY', 'DEVIATION', 'BATTERY', 'SAFETY_CHECK', 'HANDOVER', 'HOLD', 'SYSTEM', 'APPROVAL', 'POLICE_CALL')),
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add read_at and notification_key columns if notifications already existed
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS notification_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_key ON public.notifications(notification_key) WHERE notification_key IS NOT NULL;

-- 1.3 DEVICE STATUS TABLE (Real-Time Hardware, Battery & Telemetry Health)
CREATE TABLE IF NOT EXISTS public.device_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vihar_id UUID REFERENCES public.vihars(id) ON DELETE SET NULL,
    battery_percentage INT,
    is_charging BOOLEAN DEFAULT FALSE,
    network_status TEXT DEFAULT 'ONLINE' CHECK (network_status IN ('ONLINE', 'OFFLINE', 'POOR_CONNECTIVITY')),
    network_type TEXT DEFAULT 'CELLULAR',
    gps_enabled BOOLEAN DEFAULT TRUE,
    gps_accuracy_meters DECIMAL(6, 2) DEFAULT 5.0,
    app_state TEXT DEFAULT 'FOREGROUND' CHECK (app_state IN ('FOREGROUND', 'BACKGROUND', 'TERMINATED')),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 1.4 ANNOUNCEMENTS TABLE (Super Admin Organization-wide & Area Broadcasts)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
    description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 5000),
    translations JSONB NOT NULL DEFAULT '{}'::jsonb,
    category TEXT NOT NULL CHECK (category IN ('GENERAL', 'SAFETY', 'WEATHER', 'VIHAR_INSTRUCTIONS', 'EMERGENCY', 'MAINTENANCE', 'IMPORTANT')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT', 'URGENT')),
    target_audience TEXT NOT NULL CHECK (target_audience IN ('ALL_USERS', 'ALL_SEVIKAS', 'ALL_ADMINISTRATORS', 'SELECTED_AREA', 'SELECTED_VIHAR')),
    target_area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT,
    target_vihar_id UUID REFERENCES public.vihars(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((target_audience = 'SELECTED_AREA' AND target_area_id IS NOT NULL AND target_vihar_id IS NULL)
        OR (target_audience = 'SELECTED_VIHAR' AND target_vihar_id IS NOT NULL AND target_area_id IS NULL)
        OR (target_audience IN ('ALL_USERS', 'ALL_SEVIKAS', 'ALL_ADMINISTRATORS') AND target_area_id IS NULL AND target_vihar_id IS NULL)),
    CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at)
);

-- 1.5 ANNOUNCEMENT RECIPIENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcement_recipients (
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('INTENDED', 'GENERATED', 'SKIPPED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);

-- 2. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_vihar_routes_vihar ON public.vihar_routes(vihar_id);
CREATE INDEX IF NOT EXISTS idx_vihar_routes_sub_vihar ON public.vihar_routes(sub_vihar_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_device_status_user ON public.device_status(user_id);
CREATE INDEX IF NOT EXISTS idx_device_status_vihar ON public.device_status(vihar_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status_created ON public.announcements(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_user ON public.announcement_recipients(user_id);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.vihar_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

-- Vihar Routes Policies
DROP POLICY IF EXISTS "Read vihar routes" ON public.vihar_routes;
CREATE POLICY "Read vihar routes" ON public.vihar_routes
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert vihar routes" ON public.vihar_routes;
CREATE POLICY "Insert vihar routes" ON public.vihar_routes
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update vihar routes" ON public.vihar_routes;
CREATE POLICY "Update vihar routes" ON public.vihar_routes
    FOR UPDATE TO authenticated USING (true);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_super());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_super());

DROP POLICY IF EXISTS "System and admins can insert notifications" ON public.notifications;
CREATE POLICY "System and admins can insert notifications" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

-- Device Status Policies
DROP POLICY IF EXISTS "Users and admins can read device status" ON public.device_status;
CREATE POLICY "Users and admins can read device status" ON public.device_status
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_super());

DROP POLICY IF EXISTS "Users can insert own device status" ON public.device_status;
CREATE POLICY "Users can insert own device status" ON public.device_status
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own device status" ON public.device_status;
CREATE POLICY "Users can update own device status" ON public.device_status
    FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_super());

-- Announcements Policies
DROP POLICY IF EXISTS "Authenticated users can read announcements" ON public.announcements;
CREATE POLICY "Authenticated users can read announcements" ON public.announcements
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL TO authenticated USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

-- Announcement Recipients Policies
DROP POLICY IF EXISTS "Authenticated users can read announcement recipients" ON public.announcement_recipients;
CREATE POLICY "Authenticated users can read announcement recipients" ON public.announcement_recipients
    FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_or_super());

DROP POLICY IF EXISTS "Admins can manage announcement recipients" ON public.announcement_recipients;
CREATE POLICY "Admins can manage announcement recipients" ON public.announcement_recipients
    FOR ALL TO authenticated USING (public.is_admin_or_super()) WITH CHECK (public.is_admin_or_super());

-- Grants
GRANT ALL ON TABLE public.vihar_routes TO authenticated;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.device_status TO authenticated;
GRANT ALL ON TABLE public.announcements TO authenticated;
GRANT ALL ON TABLE public.announcement_recipients TO authenticated;


-- ==============================================================================
-- 4. SUPER ADMIN CONTROLS & GOVERNANCE RPCS (Phase K)
-- ==============================================================================

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


-- ==============================================================================
-- 5. EMERGENCY OPERATIONS RPCS (Phase L)
-- ==============================================================================

-- Phase L - Super Admin emergency operations
-- Additive, state-machine constrained incident actions.

CREATE OR REPLACE FUNCTION public.super_admin_manage_emergency(
    p_emergency_id UUID,
    p_action TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.emergencies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := public.require_active_super_admin();
    incident public.emergencies%ROWTYPE;
    previous_status public.emergency_status_type;
    next_status public.emergency_status_type;
    audit_action TEXT;
BEGIN
    SELECT * INTO incident
    FROM public.emergencies
    WHERE id = p_emergency_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Emergency was not found.';
    END IF;
    previous_status := incident.status;

    IF p_action = 'ACKNOWLEDGE' THEN
        IF incident.status NOT IN ('TRIGGERED', 'ESCALATING') THEN
            RAISE EXCEPTION 'Only triggered or escalating emergencies can be acknowledged.';
        END IF;
        next_status := 'RESPONDED';
        audit_action := 'EMERGENCY_ACKNOWLEDGED';
    ELSIF p_action = 'RESOLVE' THEN
        IF incident.status <> 'RESPONDED' THEN
            RAISE EXCEPTION 'Only responded emergencies can be resolved.';
        END IF;
        next_status := 'RESOLVED';
        audit_action := 'EMERGENCY_RESOLVED';
    ELSIF p_action = 'FALSE_ALARM' THEN
        IF incident.status NOT IN ('TRIGGERED', 'ESCALATING', 'RESPONDED') THEN
            RAISE EXCEPTION 'This emergency cannot be recorded as a false alarm from its current state.';
        END IF;
        next_status := 'FALSE_ALARM';
        audit_action := 'EMERGENCY_FALSE_ALARM';
    ELSE
        RAISE EXCEPTION 'Unsupported emergency action.';
    END IF;

    UPDATE public.emergencies
    SET status = next_status,
        resolved_by = CASE WHEN next_status IN ('RESOLVED', 'FALSE_ALARM') THEN caller_id ELSE resolved_by END,
        resolution_notes = COALESCE(NULLIF(BTRIM(p_notes), ''), resolution_notes),
        resolved_at = CASE WHEN next_status IN ('RESOLVED', 'FALSE_ALARM') THEN NOW() ELSE resolved_at END
    WHERE id = p_emergency_id
    RETURNING * INTO incident;

    IF next_status = 'RESPONDED' THEN
        UPDATE public.emergency_attempts
        SET status = 'ACKNOWLEDGED', responded_at = COALESCE(responded_at, NOW())
        WHERE emergency_id = p_emergency_id
          AND status IN ('NOTIFIED', 'CALLED');
    END IF;

    IF next_status IN ('RESOLVED', 'FALSE_ALARM') AND incident.vihar_id IS NOT NULL THEN
        UPDATE public.vihars
        SET safety_status = 'SAFE', updated_at = NOW()
        WHERE id = incident.vihar_id;
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (
        caller_id,
        audit_action,
        'emergencies',
        p_emergency_id::TEXT,
        jsonb_build_object('previous_status', previous_status, 'new_status', next_status, 'notes', p_notes)
    );
    RETURN incident;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_manage_emergency(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_manage_emergency(UUID, TEXT, TEXT) TO authenticated;


-- ==============================================================================
-- 6. COMMUNICATION & ANNOUNCEMENTS RPCS (Phase N)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    affected INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required.';
    END IF;

    UPDATE public.notifications
    SET is_read = TRUE,
        read_at = COALESCE(read_at, NOW())
    WHERE id = p_notification_id
      AND user_id = auth.uid()
      AND NOT is_read;

    GET DIAGNOSTICS affected = ROW_COUNT;
    RETURN affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.super_admin_create_announcement(
    p_title TEXT,
    p_description TEXT,
    p_category TEXT,
    p_priority TEXT,
    p_target_audience TEXT,
    p_target_area_id UUID DEFAULT NULL,
    p_target_vihar_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_translations JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor UUID := auth.uid();
    announcement_id UUID;
BEGIN
    PERFORM public.require_active_super_admin();
    IF p_expires_at IS NOT NULL AND p_expires_at <= NOW() THEN
        RAISE EXCEPTION 'Expiry must be in the future.';
    END IF;
    IF p_target_audience = 'SELECTED_AREA' AND NOT EXISTS (SELECT 1 FROM public.areas WHERE id = p_target_area_id AND is_active) THEN
        RAISE EXCEPTION 'The selected area is not active.';
    END IF;
    IF p_target_audience = 'SELECTED_VIHAR' AND NOT EXISTS (SELECT 1 FROM public.vihars WHERE id = p_target_vihar_id) THEN
        RAISE EXCEPTION 'The selected Vihar does not exist.';
    END IF;

    INSERT INTO public.announcements (title, description, category, priority, target_audience, target_area_id, target_vihar_id, expires_at, translations, created_by)
    VALUES (btrim(p_title), btrim(p_description), p_category, p_priority, p_target_audience, p_target_area_id, p_target_vihar_id, p_expires_at, COALESCE(p_translations, '{}'::jsonb), actor)
    RETURNING id INTO announcement_id;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (actor, 'ANNOUNCEMENT_CREATED', 'announcements', announcement_id::TEXT,
            jsonb_build_object('category', p_category, 'priority', p_priority, 'target_audience', p_target_audience));
    RETURN announcement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_announcement(
    p_announcement_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT,
    p_priority TEXT,
    p_target_audience TEXT,
    p_target_area_id UUID DEFAULT NULL,
    p_target_vihar_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_translations JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor UUID := auth.uid(); changed BOOLEAN;
    affected INTEGER;
BEGIN
    PERFORM public.require_active_super_admin();
    IF p_expires_at IS NOT NULL AND p_expires_at <= NOW() THEN RAISE EXCEPTION 'Expiry must be in the future.'; END IF;
    UPDATE public.announcements
    SET title = btrim(p_title), description = btrim(p_description), category = p_category, priority = p_priority,
        target_audience = p_target_audience, target_area_id = p_target_area_id, target_vihar_id = p_target_vihar_id,
        expires_at = p_expires_at, translations = COALESCE(p_translations, '{}'::jsonb), updated_at = NOW()
    WHERE id = p_announcement_id AND status = 'DRAFT';
    GET DIAGNOSTICS affected = ROW_COUNT;
    changed := affected > 0;
    IF changed THEN
        INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
        VALUES (actor, 'ANNOUNCEMENT_UPDATED', 'announcements', p_announcement_id::TEXT, '{}'::jsonb);
    ELSE
        RAISE EXCEPTION 'Only an existing draft can be updated.';
    END IF;
    RETURN changed;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_publish_announcement(p_announcement_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    actor UUID := auth.uid();
    announcement RECORD;
    generated INTEGER := 0;
BEGIN
    PERFORM public.require_active_super_admin();
    SELECT * INTO announcement FROM public.announcements WHERE id = p_announcement_id FOR UPDATE;
    IF NOT FOUND OR announcement.status <> 'DRAFT' THEN RAISE EXCEPTION 'Only an unpublished draft can be published.'; END IF;
    IF announcement.expires_at IS NOT NULL AND announcement.expires_at <= NOW() THEN RAISE EXCEPTION 'Expiry must be in the future.'; END IF;

    UPDATE public.announcements SET status = 'PUBLISHED', published_at = NOW(), updated_at = NOW() WHERE id = p_announcement_id;

    WITH eligible AS (
        SELECT p.id AS user_id
        FROM public.profiles p
        WHERE p.status = 'ACTIVE'
          AND (
            announcement.target_audience = 'ALL_USERS'
            OR (announcement.target_audience = 'ALL_SEVIKAS' AND public.has_role(p.id, 'SEVAK'))
            OR (announcement.target_audience = 'ALL_ADMINISTRATORS' AND public.has_role(p.id, 'ADMIN'))
            OR (announcement.target_audience = 'SELECTED_AREA' AND (p.area = (SELECT name FROM public.areas WHERE id = announcement.target_area_id)
              OR EXISTS (SELECT 1 FROM public.administrators ad JOIN public.areas a ON a.id = ad.area_id WHERE ad.user_id = p.id AND ad.is_active AND a.id = announcement.target_area_id)))
            OR (announcement.target_audience = 'SELECTED_VIHAR' AND (
              EXISTS (SELECT 1 FROM public.vihars v WHERE v.id = announcement.target_vihar_id AND v.user_id = p.id)
              OR EXISTS (SELECT 1 FROM public.vihar_participants vp WHERE vp.vihar_id = announcement.target_vihar_id AND vp.user_id = p.id AND vp.left_at IS NULL)
            ))
          )
    ), inserted AS (
        INSERT INTO public.announcement_recipients (announcement_id, user_id, outcome)
        SELECT p_announcement_id, user_id, 'INTENDED' FROM eligible
        ON CONFLICT DO NOTHING
        RETURNING user_id
    ), notifications_created AS (
        INSERT INTO public.notifications (user_id, title, body, type, severity, metadata, notification_key)
        SELECT ar.user_id, announcement.title, announcement.description, 'SYSTEM',
               CASE announcement.priority WHEN 'URGENT' THEN 'CRITICAL' WHEN 'IMPORTANT' THEN 'WARNING' ELSE 'INFO' END,
               jsonb_build_object('announcement_id', p_announcement_id, 'category', announcement.category),
               'announcement:' || p_announcement_id::TEXT || ':' || ar.user_id::TEXT
        FROM public.announcement_recipients ar
        WHERE ar.announcement_id = p_announcement_id AND ar.outcome = 'INTENDED'
        ON CONFLICT DO NOTHING
        RETURNING id, user_id
    )
    UPDATE public.announcement_recipients ar
    SET outcome = 'GENERATED', notification_id = nc.id
    FROM notifications_created nc
    WHERE ar.announcement_id = p_announcement_id AND ar.user_id = nc.user_id;

    SELECT COUNT(*) INTO generated FROM public.announcement_recipients WHERE announcement_id = p_announcement_id AND outcome = 'GENERATED';
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (actor, 'ANNOUNCEMENT_PUBLISHED', 'announcements', p_announcement_id::TEXT, jsonb_build_object('generated_notifications', generated));
    RETURN generated;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_archive_announcement(p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor UUID := auth.uid(); changed BOOLEAN;
    affected INTEGER;
BEGIN
    PERFORM public.require_active_super_admin();
    UPDATE public.announcements SET status = 'ARCHIVED', updated_at = NOW() WHERE id = p_announcement_id AND status <> 'ARCHIVED';
    GET DIAGNOSTICS affected = ROW_COUNT;
    changed := affected > 0;
    IF changed THEN
        INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
        VALUES (actor, 'ANNOUNCEMENT_ARCHIVED', 'announcements', p_announcement_id::TEXT, '{}'::jsonb);
    END IF;
    RETURN changed;
END;
$$;

REVOKE ALL ON FUNCTION public.super_admin_create_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_update_announcement(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_publish_announcement(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.super_admin_archive_announcement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.super_admin_create_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_announcement(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TIMESTAMPTZ, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_publish_announcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_archive_announcement(UUID) TO authenticated;


-- ==============================================================================
-- 7. ADMIN LIVE MONITORING & TELEMETRY RPCS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.current_admin_area_id()
RETURNS UUID AS $$
    SELECT area_id FROM public.administrators
    WHERE user_id = auth.uid() AND is_active = TRUE
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'SUPER_ADMIN'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. VIHAR LIVE STATE TABLE (One single row per ACTIVE Vihar for high-speed Realtime)
CREATE TABLE IF NOT EXISTS public.vihar_live_state (
    vihar_id UUID PRIMARY KEY REFERENCES public.vihars(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subvihar_id UUID REFERENCES public.vihar_subsessions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'SAFE' CHECK (status IN ('SAFE', 'WARNING', 'EMERGENCY', 'OFFLINE', 'ON_HOLD', 'COMPLETED')),
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed NUMERIC(5,2) DEFAULT 0.0,
    heading NUMERIC(5,2) DEFAULT 0.0,
    accuracy NUMERIC(6,2) DEFAULT 5.0,
    battery INT DEFAULT 100,
    network TEXT DEFAULT 'ONLINE',
    route_progress_m NUMERIC(10,2) DEFAULT 0.0,
    distance_remaining_m NUMERIC(10,2) DEFAULT 0.0,
    eta_at TIMESTAMPTZ,
    deviation_distance_m NUMERIC(10,2) DEFAULT 0.0,
    hold_active BOOLEAN DEFAULT FALSE,
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_simulated BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_vihar_live_state_area_status ON public.vihar_live_state(area_id, status);
CREATE INDEX IF NOT EXISTS idx_vihar_live_state_area_heartbeat ON public.vihar_live_state(area_id, last_heartbeat_at);

-- Enable RLS on vihar_live_state
ALTER TABLE public.vihar_live_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view live state of their area" ON public.vihar_live_state;
CREATE POLICY "Admins can view live state of their area"
    ON public.vihar_live_state FOR SELECT
    TO authenticated
    USING (
        area_id = public.current_admin_area_id() OR public.is_super_admin()
    );

-- 3. EXTENDED / BACKWARD-COMPATIBLE INGEST LOCATIONS RPC
CREATE OR REPLACE FUNCTION public.ingest_locations(
    p_vihar_id UUID,
    p_sub_vihar_id UUID DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT 21.1959,
    p_longitude DOUBLE PRECISION DEFAULT 72.7933,
    p_speed_kmh DOUBLE PRECISION DEFAULT 0.0,
    p_heading DOUBLE PRECISION DEFAULT 0.0,
    p_accuracy_meters DOUBLE PRECISION DEFAULT 5.0,
    p_battery_percentage INT DEFAULT 100,
    p_network_status TEXT DEFAULT 'ONLINE',
    p_route_progress_m NUMERIC DEFAULT 0.0,
    p_distance_remaining_m NUMERIC DEFAULT 0.0,
    p_eta_at TIMESTAMPTZ DEFAULT NULL,
    p_deviation_distance_m NUMERIC DEFAULT 0.0,
    p_hold_active BOOLEAN DEFAULT FALSE,
    p_status TEXT DEFAULT 'SAFE'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_area_id UUID;
    v_vihar_status TEXT;
BEGIN
    -- Identify Vihar & Lead Sevak
    SELECT user_id, status INTO v_user_id, v_vihar_status
    FROM public.vihars
    WHERE id = p_vihar_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vihar not found');
    END IF;

    -- Resolve Area ID from Sevak's registered profile or first active area
    SELECT a.id INTO v_area_id
    FROM public.profiles p
    JOIN public.areas a ON LOWER(TRIM(p.area)) = LOWER(TRIM(a.name))
    WHERE p.id = v_user_id
    LIMIT 1;

    IF v_area_id IS NULL THEN
        SELECT id INTO v_area_id FROM public.areas WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- 1. Insert into historical vihar_locations log
    INSERT INTO public.vihar_locations (
        vihar_id, sub_vihar_id, user_id, latitude, longitude,
        speed_kmh, heading, accuracy_meters, battery_percentage,
        network_status, recorded_at, synced_at
    ) VALUES (
        p_vihar_id, p_sub_vihar_id, v_user_id, p_latitude, p_longitude,
        p_speed_kmh, p_heading, p_accuracy_meters, p_battery_percentage,
        p_network_status, NOW(), NOW()
    );

    -- 2. Upsert into single-row vihar_live_state
    INSERT INTO public.vihar_live_state (
        vihar_id, area_id, user_id, subvihar_id, status,
        lat, lng, speed, heading, accuracy, battery, network,
        route_progress_m, distance_remaining_m, eta_at, deviation_distance_m,
        hold_active, last_heartbeat_at, updated_at
    ) VALUES (
        p_vihar_id, v_area_id, v_user_id, p_sub_vihar_id,
        CASE
            WHEN p_hold_active THEN 'ON_HOLD'
            ELSE COALESCE(p_status, 'SAFE')
        END,
        p_latitude, p_longitude, p_speed_kmh, p_heading, p_accuracy_meters,
        p_battery_percentage, p_network_status,
        p_route_progress_m, p_distance_remaining_m, p_eta_at, p_deviation_distance_m,
        p_hold_active, NOW(), NOW()
    )
    ON CONFLICT (vihar_id) DO UPDATE SET
        area_id               = EXCLUDED.area_id,
        user_id               = EXCLUDED.user_id,
        subvihar_id           = COALESCE(EXCLUDED.subvihar_id, public.vihar_live_state.subvihar_id),
        status                = EXCLUDED.status,
        lat                   = EXCLUDED.lat,
        lng                   = EXCLUDED.lng,
        speed                 = EXCLUDED.speed,
        heading               = EXCLUDED.heading,
        accuracy              = EXCLUDED.accuracy,
        battery               = EXCLUDED.battery,
        network               = EXCLUDED.network,
        route_progress_m      = EXCLUDED.route_progress_m,
        distance_remaining_m  = EXCLUDED.distance_remaining_m,
        eta_at                = EXCLUDED.eta_at,
        deviation_distance_m  = EXCLUDED.deviation_distance_m,
        hold_active           = EXCLUDED.hold_active,
        last_heartbeat_at     = NOW(),
        updated_at            = NOW();

    RETURN jsonb_build_object('success', true, 'vihar_id', p_vihar_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: ADMIN LIVE SNAPSHOT (Derives caller's role and area on server)
CREATE OR REPLACE FUNCTION public.admin_live_snapshot(p_area_id UUID DEFAULT NULL)
RETURNS TABLE (
    vihar_id UUID,
    area_id UUID,
    area_name TEXT,
    user_id UUID,
    sevak_name TEXT,
    sevak_phone TEXT,
    sevak_photo TEXT,
    blood_group TEXT,
    emergency_contact_phone TEXT,
    subvihar_id UUID,
    subvihar_number INT,
    subvihar_label TEXT,
    source_name TEXT,
    dest_name TEXT,
    title TEXT,
    status TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    speed NUMERIC,
    heading NUMERIC,
    accuracy NUMERIC,
    battery INT,
    network TEXT,
    route_progress_m NUMERIC,
    distance_remaining_m NUMERIC,
    eta_at TIMESTAMPTZ,
    deviation_distance_m NUMERIC,
    hold_active BOOLEAN,
    last_heartbeat_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_simulated BOOLEAN
) AS $$
DECLARE
    v_target_area UUID;
    v_is_super BOOLEAN;
BEGIN
    v_is_super := public.is_super_admin();

    IF v_is_super THEN
        v_target_area := p_area_id; -- Super Admin optional filter
    ELSE
        -- Admin: strictly derived from administrators record
        v_target_area := public.current_admin_area_id();
        IF v_target_area IS NULL THEN
            RETURN; -- Zero rows for non-admin callers
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        ls.vihar_id,
        ls.area_id,
        a.name AS area_name,
        ls.user_id,
        COALESCE(p.full_name, 'Vihar Sevak')::TEXT AS sevak_name,
        COALESCE(p.phone, '')::TEXT AS sevak_phone,
        p.avatar_url::TEXT AS sevak_photo,
        COALESCE(p.blood_group, '')::TEXT AS blood_group,
        COALESCE(p.emergency_contact_phone, '')::TEXT AS emergency_contact_phone,
        ls.subvihar_id,
        COALESCE(sub.sub_vihar_number, 1)::INT AS subvihar_number,
        COALESCE('Sub-Vihar #' || sub.sub_vihar_number::TEXT, 'Sub-Vihar #1')::TEXT AS subvihar_label,
        COALESCE(v.source_name, 'Origin')::TEXT AS source_name,
        COALESCE(v.dest_name, 'Destination')::TEXT AS dest_name,
        COALESCE(v.title, 'Pujya Sadhviji Bhagwant Vihar')::TEXT AS title,
        ls.status::TEXT,
        ls.lat,
        ls.lng,
        ls.speed,
        ls.heading,
        ls.accuracy,
        ls.battery,
        ls.network::TEXT,
        ls.route_progress_m,
        ls.distance_remaining_m,
        ls.eta_at,
        ls.deviation_distance_m,
        ls.hold_active,
        ls.last_heartbeat_at,
        ls.updated_at,
        ls.is_simulated
    FROM public.vihar_live_state ls
    JOIN public.vihars v ON ls.vihar_id = v.id
    JOIN public.areas a ON ls.area_id = a.id
    LEFT JOIN public.profiles p ON ls.user_id = p.id
    LEFT JOIN public.vihar_subsessions sub ON ls.subvihar_id = sub.id
    WHERE (v_target_area IS NULL OR ls.area_id = v_target_area)
      AND v.status = 'ACTIVE'
    ORDER BY
        CASE ls.status
            WHEN 'EMERGENCY' THEN 1
            WHEN 'WARNING' THEN 2
            WHEN 'OFFLINE' THEN 3
            WHEN 'ON_HOLD' THEN 4
            WHEN 'SAFE' THEN 5
            ELSE 6
        END,
        ls.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: ADMIN GET TRACK (Server-side downsampled GPS track to at most max_points)
CREATE OR REPLACE FUNCTION public.admin_get_track(
    p_vihar_id UUID,
    p_since_time TIMESTAMPTZ DEFAULT NULL,
    p_max_points INT DEFAULT 500
)
RETURNS TABLE (
    id UUID,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    accuracy_meters DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ
) AS $$
DECLARE
    v_area_id UUID;
    v_total_count INT;
    v_step INT := 1;
BEGIN
    SELECT ls.area_id INTO v_area_id
    FROM public.vihar_live_state ls
    WHERE ls.vihar_id = p_vihar_id;

    IF NOT public.is_super_admin() AND (v_area_id IS NULL OR v_area_id != public.current_admin_area_id()) THEN
        RAISE EXCEPTION 'Access Denied: Vihar is not in your operational jurisdiction.';
    END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.vihar_locations vl
    WHERE vl.vihar_id = p_vihar_id
      AND (p_since_time IS NULL OR vl.recorded_at > p_since_time);

    IF v_total_count > p_max_points AND p_max_points > 0 THEN
        v_step := CEIL(v_total_count::FLOAT / p_max_points)::INT;
    END IF;

    RETURN QUERY
    WITH numbered_points AS (
        SELECT
            vl.id,
            vl.latitude,
            vl.longitude,
            vl.speed_kmh,
            vl.heading,
            vl.accuracy_meters,
            vl.recorded_at,
            ROW_NUMBER() OVER (ORDER BY vl.recorded_at ASC) AS rn
        FROM public.vihar_locations vl
        WHERE vl.vihar_id = p_vihar_id
          AND (p_since_time IS NULL OR vl.recorded_at > p_since_time)
    )
    SELECT
        np.id,
        np.latitude,
        np.longitude,
        np.speed_kmh,
        np.heading,
        np.accuracy_meters,
        np.recorded_at
    FROM numbered_points np
    WHERE (np.rn % v_step) = 0
    ORDER BY np.recorded_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: ADMIN GET VIHAR DETAIL
CREATE OR REPLACE FUNCTION public.admin_get_vihar_detail(p_vihar_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_area_id UUID;
    v_result JSONB;
BEGIN
    SELECT ls.area_id INTO v_area_id
    FROM public.vihar_live_state ls
    WHERE ls.vihar_id = p_vihar_id;

    IF NOT public.is_super_admin() AND (v_area_id IS NULL OR v_area_id != public.current_admin_area_id()) THEN
        RAISE EXCEPTION 'Access Denied: Vihar is not in your operational jurisdiction.';
    END IF;

    SELECT jsonb_build_object(
        'vihar', (SELECT row_to_json(v) FROM (SELECT * FROM public.vihars WHERE id = p_vihar_id) v),
        'live_state', (SELECT row_to_json(ls) FROM (SELECT * FROM public.vihar_live_state WHERE vihar_id = p_vihar_id) ls),
        'sub_vihars', (SELECT COALESCE(json_agg(s ORDER BY s.sub_vihar_number ASC), '[]'::json) FROM public.vihar_subsessions s WHERE s.vihar_id = p_vihar_id),
        'participants', (
            SELECT COALESCE(json_agg(json_build_object(
                'id', vp.id,
                'role', vp.role,
                'is_current_responsible', vp.is_current_responsible,
                'user_id', vp.user_id,
                'full_name', p.full_name,
                'phone', p.phone,
                'avatar_url', p.avatar_url
            )), '[]'::json)
            FROM public.vihar_participants vp
            JOIN public.profiles p ON vp.user_id = p.id
            WHERE vp.vihar_id = p_vihar_id
        ),
        'current_hold', (
            SELECT row_to_json(h)
            FROM public.vihar_holds h
            WHERE h.vihar_id = p_vihar_id AND h.status = 'ACTIVE'
            LIMIT 1
        ),
        'hold_history', (
            SELECT COALESCE(json_agg(h ORDER BY h.created_at DESC), '[]'::json)
            FROM public.vihar_holds h
            WHERE h.vihar_id = p_vihar_id
        ),
        'handover_history', (
            SELECT COALESCE(json_agg(ho ORDER BY ho.created_at DESC), '[]'::json)
            FROM public.vihar_handover ho
            WHERE ho.vihar_id = p_vihar_id
        ),
        'route_geometry', (
            SELECT vr.polyline_points
            FROM public.vihar_routes vr
            WHERE vr.vihar_id = p_vihar_id AND vr.is_active_route = TRUE
            LIMIT 1
        ),
        'emergency_history', (
            SELECT COALESCE(json_agg(e ORDER BY e.triggered_at DESC), '[]'::json)
            FROM public.emergencies e
            WHERE e.vihar_id = p_vihar_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: ADMIN GET HELPING DETAILS (With Throttled Audit Logging)
CREATE OR REPLACE FUNCTION public.admin_get_helping_details(p_vihar_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_area_id UUID;
    v_user_id UUID;
    v_result JSONB;
    v_recent_audit_count INT;
BEGIN
    SELECT ls.area_id, ls.user_id INTO v_area_id, v_user_id
    FROM public.vihar_live_state ls
    WHERE ls.vihar_id = p_vihar_id;

    IF NOT public.is_super_admin() AND (v_area_id IS NULL OR v_area_id != public.current_admin_area_id()) THEN
        RAISE EXCEPTION 'Access Denied: Vihar is not in your operational jurisdiction.';
    END IF;

    -- Throttled Audit Logging: At most 1 audit row per 60 seconds per admin visit
    SELECT COUNT(*) INTO v_recent_audit_count
    FROM public.audit_logs
    WHERE actor_id = auth.uid()
      AND action = 'HELPING_DETAILS_VIEWED'
      AND entity_id = p_vihar_id::TEXT
      AND created_at > NOW() - INTERVAL '60 seconds';

    IF v_recent_audit_count = 0 THEN
        INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details, created_at)
        VALUES (
            auth.uid(),
            'HELPING_DETAILS_VIEWED',
            'vihars',
            p_vihar_id::TEXT,
            jsonb_build_object('vihar_id', p_vihar_id, 'viewed_at', NOW()),
            NOW()
        );
    END IF;

    SELECT jsonb_build_object(
        'vihar_id', p_vihar_id,
        'user_id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'phone', p.phone,
        'emergency_contact_name', p.emergency_contact_name,
        'emergency_contact_phone', p.emergency_contact_phone,
        'blood_group', p.blood_group,
        'battery', ls.battery,
        'network', ls.network,
        'accuracy', ls.accuracy,
        'speed', ls.speed,
        'last_heartbeat_at', ls.last_heartbeat_at
    ) INTO v_result
    FROM public.profiles p
    LEFT JOIN public.vihar_live_state ls ON ls.vihar_id = p_vihar_id
    WHERE p.id = v_user_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CALL LOGGING RPCS (Call User, Emergency Contact, CALL POLICE 112)
CREATE OR REPLACE FUNCTION public.log_police_call_initiated(
    p_vihar_id UUID,
    p_emergency_id UUID DEFAULT NULL,
    p_location JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_admin_id UUID := auth.uid();
BEGIN
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details, created_at)
    VALUES (
        v_admin_id,
        'POLICE_CALL_INITIATED',
        'emergencies',
        COALESCE(p_emergency_id::TEXT, p_vihar_id::TEXT),
        jsonb_build_object(
            'vihar_id', p_vihar_id,
            'emergency_id', p_emergency_id,
            'dialed_at', NOW(),
            'location', p_location
        ),
        NOW()
    );

    INSERT INTO public.notifications (
        user_id, vihar_id, title, body, type, severity, metadata, created_at
    ) VALUES (
        v_admin_id,
        p_vihar_id,
        'POLICE 112 Call Dispatched',
        'Administrator initiated emergency police dialer for Vihar safety.',
        'POLICE_CALL',
        'CRITICAL',
        jsonb_build_object('location', p_location, 'emergency_id', p_emergency_id),
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'logged_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_call_initiated(
    p_vihar_id UUID,
    p_target_type TEXT,
    p_target_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details, created_at)
    VALUES (
        auth.uid(),
        'CALL_INITIATED',
        'vihars',
        p_vihar_id::TEXT,
        jsonb_build_object(
            'target_type', p_target_type,
            'target_phone', p_target_phone,
            'initiated_at', NOW()
        ),
        NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. DEBUG SIMULATION SEED FUNCTION
CREATE OR REPLACE FUNCTION public.seed_debug_live_vihars(target_area_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_area UUID := target_area_id;
    v_sevak1 UUID;
    v_sevak2 UUID;
    v_sevak3 UUID;
    v1_id UUID;
    v2_id UUID;
    v3_id UUID;
    sub1_id UUID;
    sub2_id UUID;
    sub3_id UUID;
BEGIN
    IF v_area IS NULL THEN
        SELECT id INTO v_area FROM public.areas WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1;
    END IF;

    SELECT id INTO v_sevak1 FROM public.profiles WHERE full_name ILIKE '%Yugam%' OR email ILIKE '%yugam%' LIMIT 1;
    SELECT id INTO v_sevak2 FROM public.profiles WHERE full_name ILIKE '%Nevil%' OR email ILIKE '%nevil%' LIMIT 1;
    SELECT id INTO v_sevak3 FROM public.profiles WHERE full_name ILIKE '%Jainish%' OR email ILIKE '%jainish%' LIMIT 1;

    IF v_sevak1 IS NULL THEN SELECT id INTO v_sevak1 FROM public.profiles LIMIT 1; END IF;
    IF v_sevak2 IS NULL THEN v_sevak2 := v_sevak1; END IF;
    IF v_sevak3 IS NULL THEN v_sevak3 := v_sevak1; END IF;

    -- Unit 1: SAFE Vihar
    INSERT INTO public.vihars (
        user_id, title, source_name, source_lat, source_lng, dest_name, dest_lat, dest_lng,
        total_distance_km, status, safety_status, started_at
    ) VALUES (
        v_sevak1, 'Pujya Sadhviji Mayurashriji Maharaj Saheb',
        'Pal Rander Upashray', 21.1959, 72.7933,
        'Adajan Tri-Mandir Jinalay', 21.1895, 72.7850,
        4.5, 'ACTIVE', 'SAFE', NOW()
    ) RETURNING id INTO v1_id;

    INSERT INTO public.vihar_subsessions (vihar_id, sub_vihar_number, title, status)
    VALUES (v1_id, 1, 'Sub-Vihar 1: Pal Rander to Adajan', 'ACTIVE') RETURNING id INTO sub1_id;

    INSERT INTO public.vihar_participants (vihar_id, sub_vihar_id, user_id, role, is_current_responsible)
    VALUES (v1_id, sub1_id, v_sevak1, 'LEAD_SEVAK', true);

    INSERT INTO public.vihar_routes (vihar_id, sub_vihar_id, route_name, origin_lat, origin_lng, dest_lat, dest_lng, polyline_points)
    VALUES (v1_id, sub1_id, 'Primary Pal-Adajan Route', 21.1959, 72.7933, 21.1895, 72.7850, '_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    INSERT INTO public.vihar_live_state (
        vihar_id, area_id, user_id, subvihar_id, status, lat, lng, speed, heading, accuracy, battery, network,
        route_progress_m, distance_remaining_m, eta_at, is_simulated
    ) VALUES (
        v1_id, v_area, v_sevak1, sub1_id, 'SAFE', 21.1940, 72.7910, 4.2, 195.0, 4.5, 91, 'ONLINE',
        650.0, 3850.0, NOW() + INTERVAL '45 minutes', TRUE
    )
    ON CONFLICT (vihar_id) DO UPDATE SET
        status = 'SAFE', lat = 21.1940, lng = 72.7910, updated_at = NOW();

    -- Unit 2: WARNING Vihar (Route Deviation)
    INSERT INTO public.vihars (
        user_id, title, source_name, source_lat, source_lng, dest_name, dest_lat, dest_lng,
        total_distance_km, status, safety_status, started_at
    ) VALUES (
        v_sevak2, 'Pujya Sadhviji Hitaprabha Maharaj Saheb',
        'Ghod Dod Road Upashray', 21.1685, 72.7845,
        'Vesu Aradhana Bhavan', 21.1350, 72.7680,
        5.2, 'ACTIVE', 'WARNING', NOW()
    ) RETURNING id INTO v2_id;

    INSERT INTO public.vihar_subsessions (vihar_id, sub_vihar_number, title, status)
    VALUES (v2_id, 1, 'Sub-Vihar 1: Ghod Dod to Vesu', 'ACTIVE') RETURNING id INTO sub2_id;

    INSERT INTO public.vihar_participants (vihar_id, sub_vihar_id, user_id, role, is_current_responsible)
    VALUES (v2_id, sub2_id, v_sevak2, 'LEAD_SEVAK', true);

    INSERT INTO public.vihar_routes (vihar_id, sub_vihar_id, route_name, origin_lat, origin_lng, dest_lat, dest_lng, polyline_points)
    VALUES (v2_id, sub2_id, 'Ghod Dod to Vesu Corridor', 21.1685, 72.7845, 21.1350, 72.7680, '_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    INSERT INTO public.vihar_live_state (
        vihar_id, area_id, user_id, subvihar_id, status, lat, lng, speed, heading, accuracy, battery, network,
        route_progress_m, distance_remaining_m, eta_at, deviation_distance_m, is_simulated
    ) VALUES (
        v2_id, v_area, v_sevak2, sub2_id, 'WARNING', 21.1620, 72.7800, 3.8, 210.0, 7.0, 78, 'ONLINE',
        1200.0, 4000.0, NOW() + INTERVAL '55 minutes', 145.0, TRUE
    )
    ON CONFLICT (vihar_id) DO UPDATE SET
        status = 'WARNING', lat = 21.1620, lng = 72.7800, updated_at = NOW();

    -- Unit 3: ON_HOLD Vihar (Rest / Gochar)
    INSERT INTO public.vihars (
        user_id, title, source_name, source_lat, source_lng, dest_name, dest_lat, dest_lng,
        total_distance_km, status, safety_status, started_at
    ) VALUES (
        v_sevak3, 'Pujya Sadhviji Samvegshriji Maharaj Saheb',
        'Athwa Lines Jinalay', 21.1788, 72.8123,
        'Nanpura Jain Sangh', 21.1890, 72.8180,
        2.8, 'ACTIVE', 'HOLD', NOW()
    ) RETURNING id INTO v3_id;

    INSERT INTO public.vihar_subsessions (vihar_id, sub_vihar_number, title, status)
    VALUES (v3_id, 1, 'Sub-Vihar 1: Athwa to Nanpura', 'ACTIVE') RETURNING id INTO sub3_id;

    INSERT INTO public.vihar_participants (vihar_id, sub_vihar_id, user_id, role, is_current_responsible)
    VALUES (v3_id, sub3_id, v_sevak3, 'LEAD_SEVAK', true);

    INSERT INTO public.vihar_holds (vihar_id, sub_vihar_id, user_id, reason, location_name, status, hold_start)
    VALUES (v3_id, sub3_id, v_sevak3, 'Gochar / Rest Stop at Upashray', 'Athwagate Aradhana Bhavan', 'ACTIVE', NOW() - INTERVAL '15 minutes');

    INSERT INTO public.vihar_live_state (
        vihar_id, area_id, user_id, subvihar_id, status, lat, lng, speed, heading, accuracy, battery, network,
        route_progress_m, distance_remaining_m, hold_active, is_simulated
    ) VALUES (
        v3_id, v_area, v_sevak3, sub3_id, 'ON_HOLD', 21.1810, 72.8140, 0.0, 0.0, 3.0, 85, 'ONLINE',
        800.0, 2000.0, TRUE, TRUE
    )
    ON CONFLICT (vihar_id) DO UPDATE SET
        status = 'ON_HOLD', lat = 21.1810, lng = 72.8140, updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'area_id', v_area, 'vihars', json_build_array(v1_id, v2_id, v3_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 8. SECURITY AUDIT & HARD DELETE RPCS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_security_event(
    p_action TEXT,
    p_entity TEXT,
    p_entity_id TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_id UUID;
BEGIN
    IF auth.uid() IS NULL
       OR NOT EXISTS (
           SELECT 1
           FROM public.profiles
           WHERE id = auth.uid()
             AND status = 'ACTIVE'
       )
       OR NOT public.is_admin_or_super()
       OR p_action <> 'SEVAK_HARD_DELETE_FAILED'
       OR p_entity <> 'profiles' THEN
        RAISE EXCEPTION 'Unauthorized: administrative security events require an administrator role.';
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (auth.uid(), p_action, p_entity, p_entity_id, COALESCE(p_details, '{}'::jsonb))
    RETURNING id INTO event_id;

    RETURN event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_security_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_security_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Harden the existing privileged operation without changing its name or retention
-- behavior. Missing targets and privileged target accounts must fail explicitly.
CREATE OR REPLACE FUNCTION public.hard_delete_sevak(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    requester_is_super_admin BOOLEAN;
    target_exists BOOLEAN;
    target_is_sevak BOOLEAN;
BEGIN
    requester_is_super_admin := public.has_role(auth.uid(), 'SUPER_ADMIN')
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND status = 'ACTIVE'
        );
    IF NOT requester_is_super_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators can perform a hard delete on Sevak accounts.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = target_user_id
    )
    INTO target_exists;

    IF NOT target_exists THEN
        RAISE EXCEPTION 'Sevak account does not exist.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = target_user_id
          AND r.name = 'SEVAK'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = target_user_id
          AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
    INTO target_is_sevak;

    IF NOT target_is_sevak THEN
        RAISE EXCEPTION 'Only Sevak accounts can be hard-deleted.';
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (
        auth.uid(),
        'SEVAK_HARD_DELETED',
        'profiles',
        target_user_id::text,
        jsonb_build_object('timestamp', NOW(), 'deleted_by', auth.uid())
    );

    DELETE FROM public.vihar_participants WHERE user_id = target_user_id;
    DELETE FROM public.vihar_holds WHERE user_id = target_user_id;
    DELETE FROM public.vihar_locations WHERE user_id = target_user_id;
    DELETE FROM public.emergencies WHERE user_id = target_user_id;
    DELETE FROM public.safety_checks WHERE user_id = target_user_id;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Sevak account permanently hard-deleted.');
END;
$$;

REVOKE ALL ON FUNCTION public.hard_delete_sevak(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hard_delete_sevak(UUID) TO authenticated;
