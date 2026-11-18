-- Migration: 20260921_fix_vihar_city_column_and_rls.sql
-- Fixes "column v.city does not exist" and "new row violates row-level security policy for table vihars"

-- 1. Ensure city and area columns exist on vihars table
ALTER TABLE public.vihars ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Surat';
ALTER TABLE public.vihars ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';

-- 2. Update can_monitor_vihar function
CREATE OR REPLACE FUNCTION public.can_monitor_vihar(p_vihar_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN RETURN FALSE; END IF;

    -- Super Admin
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = caller_id AND r.name = 'SUPER_ADMIN'
    ) THEN RETURN TRUE; END IF;

    -- Vihar Owner
    IF EXISTS (
        SELECT 1 FROM public.vihars v WHERE v.id = p_vihar_id AND v.user_id = caller_id
    ) THEN RETURN TRUE; END IF;

    -- Active Participant
    IF EXISTS (
        SELECT 1 FROM public.vihar_participants vp WHERE vp.vihar_id = p_vihar_id AND vp.user_id = caller_id AND vp.left_at IS NULL
    ) THEN RETURN TRUE; END IF;

    -- Assigned Area Administrator
    IF EXISTS (
        SELECT 1 FROM public.administrators ad
        JOIN public.areas a ON a.id = ad.area_id AND a.is_active = TRUE
        JOIN public.vihars v ON v.id = p_vihar_id
        JOIN public.profiles p ON p.id = v.user_id
        WHERE ad.user_id = caller_id AND ad.is_active = TRUE
          AND (a.name = p.area OR a.city = p.city OR a.city = COALESCE(v.city, p.city))
    ) THEN RETURN TRUE; END IF;

    RETURN FALSE;
END;
$$;

-- 3. Update can_manage_vihar function
CREATE OR REPLACE FUNCTION public.can_manage_vihar(p_vihar_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := auth.uid();
BEGIN
    IF caller_id IS NULL THEN RETURN FALSE; END IF;

    -- Super Admin
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = caller_id AND r.name = 'SUPER_ADMIN'
    ) THEN RETURN TRUE; END IF;

    -- Vihar Owner
    IF EXISTS (
        SELECT 1 FROM public.vihars v WHERE v.id = p_vihar_id AND v.user_id = caller_id
    ) THEN RETURN TRUE; END IF;

    -- Assigned Area Administrator
    IF EXISTS (
        SELECT 1 FROM public.administrators ad
        JOIN public.areas a ON a.id = ad.area_id AND a.is_active = TRUE
        JOIN public.vihars v ON v.id = p_vihar_id
        JOIN public.profiles p ON p.id = v.user_id
        WHERE ad.user_id = caller_id AND ad.is_active = TRUE
          AND (a.name = p.area OR a.city = p.city OR a.city = COALESCE(v.city, p.city))
    ) THEN RETURN TRUE; END IF;

    RETURN FALSE;
END;
$$;

-- 4. Complete and robust RLS Policies on public.vihars
ALTER TABLE public.vihars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sevaks can create vihar" ON public.vihars;
DROP POLICY IF EXISTS "Users can create vihar" ON public.vihars;
CREATE POLICY "Sevaks can create vihar"
    ON public.vihars
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read monitored vihars" ON public.vihars;
DROP POLICY IF EXISTS "Users can view own vihars or admins can view all" ON public.vihars;
CREATE POLICY "Users can read monitored vihars"
    ON public.vihars
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR public.can_monitor_vihar(id)
    );

DROP POLICY IF EXISTS "Owners and managers can update vihars" ON public.vihars;
DROP POLICY IF EXISTS "Sevaks can update own vihar or admins" ON public.vihars;
CREATE POLICY "Owners and managers can update vihars"
    ON public.vihars
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.can_manage_vihar(id))
    WITH CHECK (user_id = auth.uid() OR public.can_manage_vihar(id));
