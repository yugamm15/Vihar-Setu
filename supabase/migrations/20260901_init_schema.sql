-- ==============================================================================
-- JINAARYA VIHAR SETU — Complete Supabase PostgreSQL Database Schema
-- Version: 1.0.0
-- Created For: Jinaarya Vihar Seva (Safe Vihar Monitoring System)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE role_name_type AS ENUM ('SEVAK', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vihar_status_type AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE safety_status_type AS ENUM ('SAFE', 'WARNING', 'EMERGENCY', 'OFFLINE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE route_event_type AS ENUM (
        'DEVIATION_LEVEL_1',
        'DEVIATION_LEVEL_2',
        'STATIONARY_ALERT',
        'LOW_BATTERY',
        'CRITICAL_BATTERY',
        'NETWORK_LOST',
        'NETWORK_RESTORED',
        'ROUTE_RECOVERED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE severity_level_type AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE emergency_status_type AS ENUM (
        'TRIGGERED',
        'ESCALATING',
        'RESPONDED',
        'RESOLVED',
        'FALSE_ALARM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE emergency_trigger_type AS ENUM (
        'MANUAL_SOS',
        'AUTOMATIC_DEVIATION',
        'STATIONARY_TIMEOUT',
        'FALL_DETECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attempt_status_type AS ENUM (
        'NOTIFIED',
        'CALLED',
        'ACKNOWLEDGED',
        'TIMEOUT',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    city TEXT DEFAULT '',
    avatar_url TEXT,
    emergency_contact_name TEXT DEFAULT '',
    emergency_contact_phone TEXT DEFAULT '',
    blood_group TEXT DEFAULT '',
    gender TEXT DEFAULT 'Female',
    preferred_language TEXT DEFAULT 'gu', -- 'gu' (Gujarati), 'hi' (Hindi), 'en' (English)
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ROLES & USER_ROLES TABLES
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name role_name_type UNIQUE NOT NULL,
    description TEXT
);

INSERT INTO public.roles (name, description)
VALUES 
    ('SEVAK', 'Vihar Sevika accompanying Jain Sadhvijis'),
    ('ADMIN', 'Regional safety coordinator with live monitoring access'),
    ('SUPER_ADMIN', 'Central administrator managing system configuration and permissions')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 5. SYSTEM SETTINGS TABLE (Configurable by Super Admin)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed System Settings
INSERT INTO public.system_settings (key, value, description)
VALUES
    ('gps_frequency_active_sec', '5', 'GPS update frequency in seconds during active movement'),
    ('gps_frequency_low_battery_sec', '30', 'GPS update frequency when battery is below 20%'),
    ('route_deviation_distance_m', '50', 'Deviation distance threshold in meters before triggering Level 1 alert'),
    ('route_deviation_duration_sec', '60', 'Duration outside route before triggering Level 2 Admin notification'),
    ('stationary_duration_min', '15', 'Time stationary before initiating "Are you safe?" prompt'),
    ('safety_response_timeout_sec', '120', 'Time user has to respond to stationary safety check'),
    ('emergency_escalation_timeout_sec', '45', 'Time before escalating unacknowledged SOS to next administrator'),
    ('low_battery_threshold_pct', '20', 'Battery percentage triggering advisory warning'),
    ('critical_battery_threshold_pct', '10', 'Battery percentage triggering critical admin warning')
ON CONFLICT (key) DO NOTHING;

-- 6. VIHARS TABLE
CREATE TABLE IF NOT EXISTS public.vihars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Vihar',
    source_name TEXT NOT NULL,
    source_lat DOUBLE PRECISION NOT NULL,
    source_lng DOUBLE PRECISION NOT NULL,
    dest_name TEXT NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    planned_route_polyline TEXT,
    total_distance_km NUMERIC(8,2) DEFAULT 0.00,
    estimated_duration_mins INT DEFAULT 0,
    status vihar_status_type NOT NULL DEFAULT 'PLANNED',
    safety_status safety_status_type NOT NULL DEFAULT 'SAFE',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vihars_user_id ON public.vihars(user_id);
CREATE INDEX IF NOT EXISTS idx_vihars_status ON public.vihars(status);
CREATE INDEX IF NOT EXISTS idx_vihars_safety_status ON public.vihars(safety_status);

-- 7. VIHAR_LOCATIONS TABLE (GPS Breadcrumbs)
CREATE TABLE IF NOT EXISTS public.vihar_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed_kmh NUMERIC(5,2) DEFAULT 0.00,
    heading NUMERIC(5,2) DEFAULT 0.00,
    accuracy_meters NUMERIC(6,2) DEFAULT 0.00,
    altitude NUMERIC(7,2),
    battery_percentage INT,
    is_charging BOOLEAN DEFAULT false,
    network_status TEXT DEFAULT 'ONLINE',
    recorded_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vihar_locations_vihar_id ON public.vihar_locations(vihar_id);
CREATE INDEX IF NOT EXISTS idx_vihar_locations_recorded_at ON public.vihar_locations(recorded_at DESC);

-- 8. ROUTE_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.route_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    event_type route_event_type NOT NULL,
    severity severity_level_type NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    metadata JSONB DEFAULT '{}'::jsonb,
    acknowledged_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_events_vihar_id ON public.route_events(vihar_id);
CREATE INDEX IF NOT EXISTS idx_route_events_created_at ON public.route_events(created_at DESC);

-- 9. EMERGENCIES TABLE
CREATE TABLE IF NOT EXISTS public.emergencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vihar_id UUID REFERENCES public.vihars(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status emergency_status_type NOT NULL DEFAULT 'TRIGGERED',
    trigger_type emergency_trigger_type NOT NULL DEFAULT 'MANUAL_SOS',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    battery_percentage INT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolution_notes TEXT,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_emergencies_status ON public.emergencies(status);
CREATE INDEX IF NOT EXISTS idx_emergencies_user_id ON public.emergencies(user_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_triggered_at ON public.emergencies(triggered_at DESC);

-- 10. EMERGENCY_ATTEMPTS TABLE (Multi-Admin Escalation Engine)
CREATE TABLE IF NOT EXISTS public.emergency_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL,
    status attempt_status_type NOT NULL DEFAULT 'NOTIFIED',
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_emergency_attempts_emergency_id ON public.emergency_attempts(emergency_id);

-- 11. SAFETY_CHECKS TABLE (Stationary Check Prompts)
CREATE TABLE IF NOT EXISTS public.safety_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vihar_id UUID NOT NULL REFERENCES public.vihars(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    prompt_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_response TEXT, -- 'SAFE', 'HELP', 'NO_RESPONSE'
    responded_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING'
);

-- 12. AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 13. SECURITY HELPER FUNCTIONS
-- ==============================================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, role_name role_name_type)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = check_user_id AND r.name = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current authenticated user is ADMIN or SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
          AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's highest role
CREATE OR REPLACE FUNCTION public.get_user_primary_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    role_text TEXT;
BEGIN
    SELECT r.name::text INTO role_text
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id
    ORDER BY 
        CASE r.name 
            WHEN 'SUPER_ADMIN' THEN 1 
            WHEN 'ADMIN' THEN 2 
            WHEN 'SEVAK' THEN 3 
            ELSE 4 
        END
    LIMIT 1;
    
    RETURN COALESCE(role_text, 'SEVAK');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vihars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vihar_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile or admins can view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin_or_super());

CREATE POLICY "Users can update own basic profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.has_role(auth.uid(), 'SUPER_ADMIN'));

CREATE POLICY "Allow profile creation on signup"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ROLES & USER_ROLES POLICIES
CREATE POLICY "Everyone can view roles"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view own role and admins view all"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin_or_super());

CREATE POLICY "Super admin can manage user roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- VIHARS POLICIES
CREATE POLICY "Users can view own vihars or admins can view all"
    ON public.vihars FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin_or_super());

CREATE POLICY "Sevaks can create vihar"
    ON public.vihars FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sevaks can update own vihar or admins"
    ON public.vihars FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin_or_super());

-- VIHAR_LOCATIONS POLICIES
CREATE POLICY "Users insert location for own vihar"
    ON public.vihar_locations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own location or admins view all"
    ON public.vihar_locations FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin_or_super());

-- EMERGENCIES POLICIES
CREATE POLICY "Users create emergency for self"
    ON public.emergencies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own emergencies or admins view all"
    ON public.emergencies FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin_or_super());

CREATE POLICY "Users cancel own or admins resolve emergency"
    ON public.emergencies FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin_or_super());

-- SYSTEM SETTINGS POLICIES
CREATE POLICY "Authenticated users view settings"
    ON public.system_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Super admin update settings"
    ON public.system_settings FOR ALL
    USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- AUDIT LOGS POLICIES
CREATE POLICY "Admins view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin_or_super());

CREATE POLICY "Insert audit log"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- 15. AUTOMATIC PROFILE TRIGGER ON AUTH.SIGNUP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id INT;
BEGIN
    -- 1. Insert into public.profiles
    INSERT INTO public.profiles (id, phone, full_name, preferred_language, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.phone, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'gu'),
        'ACTIVE'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Fetch default SEVAK role
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'SEVAK' LIMIT 1;

    -- 3. Assign SEVAK role by default
    IF default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, default_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 16. REALTIME PUBLICATION ENABLEMENT
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.vihars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vihar_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.route_events;
