-- ==============================================================================
-- JINAARYA VIHAR SETU — Phase 8 & 9 Database Schema & RLS Policies
-- Sub-Vihars, Handover System, Holds, Areas & Hard-Delete Operations
-- Version: 2.0.0
-- ==============================================================================

-- 1. ADD NEW COLUMNS TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interested_in_administrator BOOLEAN DEFAULT FALSE;

-- 2. AREAS TABLE (Operational Scope: initially Surat, scalable to other cities)
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Surat',
    state TEXT NOT NULL DEFAULT 'Gujarat',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default Surat Area if not exists
INSERT INTO public.areas (name, city, state, is_active)
SELECT 'Surat Central & Rander', 'Surat', 'Gujarat', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.areas WHERE name = 'Surat Central & Rander');

-- 3. ADMINISTRATORS TABLE (Area-based Administration)
CREATE TABLE IF NOT EXISTS public.administrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
    permissions JSONB DEFAULT '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": false}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. SUB-VIHARS TABLE (Child of public.vihars)
CREATE TABLE IF NOT EXISTS public.vihar_subsessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    sub_vihar_number INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    source_name TEXT,
    source_lat DOUBLE PRECISION,
    source_lng DOUBLE PRECISION,
    dest_name TEXT,
    dest_lat DOUBLE PRECISION,
    dest_lng DOUBLE PRECISION,
    total_distance_km DECIMAL(6, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'TRANSFERRED', 'CANCELLED')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VIHAR PARTICIPANTS (Multiple Sevaks per Sub-Vihar / Main Vihar)
CREATE TABLE IF NOT EXISTS public.vihar_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    sub_vihar_id UUID REFERENCES public.vihar_subsessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'SEVAK' CHECK (role IN ('LEAD_SEVAK', 'SEVAK', 'ACCOMPANYING')),
    is_current_responsible BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. VIHAR HANDOVER TABLE (Handover / Transfer between Sevak groups)
CREATE TABLE IF NOT EXISTS public.vihar_handover (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    from_sub_vihar_id UUID REFERENCES public.vihar_subsessions(id) ON DELETE SET NULL,
    to_sub_vihar_id UUID REFERENCES public.vihar_subsessions(id) ON DELETE SET NULL,
    handed_over_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    handed_over_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    next_sevak_name TEXT,
    handover_location_name TEXT,
    handover_lat DOUBLE PRECISION,
    handover_lng DOUBLE PRECISION,
    handover_time TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. VIHAR HOLDS TABLE (Temporary stops / breaks during walking Vihar)
CREATE TABLE IF NOT EXISTS public.vihar_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    sub_vihar_id UUID REFERENCES public.vihar_subsessions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('REST', 'TEMPLE_VISIT', 'WATER_BREAK', 'WAITING', 'MEETING', 'MEDICAL', 'MEAL', 'OTHER')),
    location_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    hold_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hold_end TIMESTAMPTZ,
    duration_minutes INT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LINK SUB-VIHAR TO VIHAR LOCATIONS
ALTER TABLE public.vihar_locations
ADD COLUMN IF NOT EXISTS sub_vihar_id UUID REFERENCES public.vihar_subsessions(id) ON DELETE SET NULL;

-- 9. CREATE INDEXES FOR FAST REALTIME QUERIES
CREATE INDEX IF NOT EXISTS idx_subsessions_vihar_id ON public.vihar_subsessions(vihar_id);
CREATE INDEX IF NOT EXISTS idx_subsessions_status ON public.vihar_subsessions(status);
CREATE INDEX IF NOT EXISTS idx_participants_vihar ON public.vihar_participants(vihar_id);
CREATE INDEX IF NOT EXISTS idx_participants_sub_vihar ON public.vihar_participants(sub_vihar_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.vihar_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_handover_vihar ON public.vihar_handover(vihar_id);
CREATE INDEX IF NOT EXISTS idx_holds_vihar ON public.vihar_holds(vihar_id);
CREATE INDEX IF NOT EXISTS idx_holds_status ON public.vihar_holds(status);
CREATE INDEX IF NOT EXISTS idx_administrators_area ON public.administrators(area_id);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vihar_subsessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vihar_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vihar_handover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vihar_holds ENABLE ROW LEVEL SECURITY;

-- Areas Policies
DROP POLICY IF EXISTS "Anyone can read active areas" ON public.areas;
CREATE POLICY "Anyone can read active areas" ON public.areas
FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS "Super admins can manage areas" ON public.areas;
CREATE POLICY "Super admins can manage areas" ON public.areas
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
);

-- Administrators Policies
DROP POLICY IF EXISTS "Authenticated users can read admin records" ON public.administrators;
CREATE POLICY "Authenticated users can read admin records" ON public.administrators
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admin can manage administrators" ON public.administrators;
CREATE POLICY "Super admin can manage administrators" ON public.administrators
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
);

-- Sub-Vihars Policies
DROP POLICY IF EXISTS "Users can read subsessions of their vihars or if admin" ON public.vihar_subsessions;
CREATE POLICY "Users can read subsessions of their vihars or if admin" ON public.vihar_subsessions
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vihars v WHERE v.id = vihar_id AND v.user_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "Users can insert subsessions for own vihar" ON public.vihar_subsessions;
CREATE POLICY "Users can insert subsessions for own vihar" ON public.vihar_subsessions
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.vihars v WHERE v.id = vihar_id AND v.user_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "Users can update subsessions of own vihar or admin" ON public.vihar_subsessions;
CREATE POLICY "Users can update subsessions of own vihar or admin" ON public.vihar_subsessions
FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vihars v WHERE v.id = vihar_id AND v.user_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- Participants Policies
DROP POLICY IF EXISTS "Read vihar participants" ON public.vihar_participants;
CREATE POLICY "Read vihar participants" ON public.vihar_participants
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert vihar participants" ON public.vihar_participants;
CREATE POLICY "Insert vihar participants" ON public.vihar_participants
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update vihar participants" ON public.vihar_participants;
CREATE POLICY "Update vihar participants" ON public.vihar_participants
FOR UPDATE TO authenticated USING (true);

-- Handover Policies
DROP POLICY IF EXISTS "Read vihar handover records" ON public.vihar_handover;
CREATE POLICY "Read vihar handover records" ON public.vihar_handover
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert vihar handover records" ON public.vihar_handover;
CREATE POLICY "Insert vihar handover records" ON public.vihar_handover
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update vihar handover records" ON public.vihar_handover;
CREATE POLICY "Update vihar handover records" ON public.vihar_handover
FOR UPDATE TO authenticated USING (true);

-- Holds Policies
DROP POLICY IF EXISTS "Read vihar holds" ON public.vihar_holds;
CREATE POLICY "Read vihar holds" ON public.vihar_holds
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert vihar holds" ON public.vihar_holds;
CREATE POLICY "Insert vihar holds" ON public.vihar_holds
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Update vihar holds" ON public.vihar_holds;
CREATE POLICY "Update vihar holds" ON public.vihar_holds
FOR UPDATE TO authenticated USING (true);

-- 11. HARD DELETE STORED PROCEDURE (Strictly for Super Admin use)
CREATE OR REPLACE FUNCTION public.hard_delete_sevak(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requester_is_super_admin BOOLEAN;
BEGIN
    -- Check if calling user is SUPER_ADMIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'SUPER_ADMIN'
    ) INTO requester_is_super_admin;

    IF NOT requester_is_super_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators can perform a hard delete on Sevak accounts.';
    END IF;

    -- Log to audit_logs before permanent deletion
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (
        auth.uid(),
        'SEVAK_HARD_DELETED',
        'profiles',
        target_user_id,
        jsonb_build_object('timestamp', NOW(), 'deleted_by', auth.uid())
    );

    -- Delete dependent entries
    DELETE FROM public.vihar_participants WHERE user_id = target_user_id;
    DELETE FROM public.vihar_holds WHERE user_id = target_user_id;
    DELETE FROM public.vihar_locations WHERE user_id = target_user_id;
    DELETE FROM public.emergencies WHERE user_id = target_user_id;
    DELETE FROM public.safety_checks WHERE user_id = target_user_id;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    
    -- Delete profile permanently
    DELETE FROM public.profiles WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Sevak account permanently hard-deleted.');
END;
$$;
