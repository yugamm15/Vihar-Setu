-- Phase N: Super Admin communication, announcements, and notification read tracking.

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

CREATE TABLE IF NOT EXISTS public.announcement_recipients (
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('INTENDED', 'GENERATED', 'SKIPPED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_announcements_status_created
    ON public.announcements(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_user
    ON public.announcement_recipients(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_created
    ON public.notifications(type, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read announcements" ON public.announcements;
CREATE POLICY "Super admins read announcements" ON public.announcements
FOR SELECT TO authenticated
USING (public.require_active_super_admin());

DROP POLICY IF EXISTS "Recipients read announcement outcomes" ON public.announcement_recipients;
CREATE POLICY "Recipients read announcement outcomes" ON public.announcement_recipients
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.require_active_super_admin());

DROP POLICY IF EXISTS "Users update own notification read state" ON public.notifications;
CREATE POLICY "Users update own notification read state" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Recipients and active Super Admins read notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.require_active_super_admin() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    changed BOOLEAN;
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

    GET DIAGNOSTICS changed = ROW_COUNT > 0;
    RETURN changed;
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
