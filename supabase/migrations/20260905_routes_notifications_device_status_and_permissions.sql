-- ==============================================================================
-- JINAARYA VIHAR SETU — Phase 8 & 9 Database Schema & RLS Policies (Complete)
-- Tables: vihar_routes, notifications, device_status, admin_permissions
-- Migration: 20260905_routes_notifications_device_status_and_permissions.sql
-- ==============================================================================

-- 1. VIHAR ROUTES TABLE (Planned & Alternative GIS Polylines for Vihars & Sub-Vihars)
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

-- 2. NOTIFICATIONS TABLE (Multi-Tier Safety, Emergency, Deviation, Hold & System Alerts)
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DEVICE STATUS TABLE (Real-Time Hardware, Battery & Telemetry Health)
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

-- 4. ADMIN PERMISSIONS TABLE (Granular Area & Capability Permissions Matrix)
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.administrators(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL,
    is_granted BOOLEAN DEFAULT TRUE,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(admin_id, permission_key)
);

-- 5. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_vihar_routes_vihar ON public.vihar_routes(vihar_id);
CREATE INDEX IF NOT EXISTS idx_vihar_routes_sub_vihar ON public.vihar_routes(sub_vihar_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_device_status_user ON public.device_status(user_id);
CREATE INDEX IF NOT EXISTS idx_device_status_vihar ON public.device_status(vihar_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin ON public.admin_permissions(admin_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.vihar_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Vihar Routes Policies
DROP POLICY IF EXISTS "Read vihar routes" ON public.vihar_routes;
CREATE POLICY "Read vihar routes" ON public.vihar_routes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insert vihar routes" ON public.vihar_routes;
CREATE POLICY "Insert vihar routes" ON public.vihar_routes
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.vihars v WHERE v.id = vihar_id AND v.user_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "Update vihar routes" ON public.vihar_routes;
CREATE POLICY "Update vihar routes" ON public.vihar_routes
FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.vihars v WHERE v.id = vihar_id AND v.user_id = auth.uid()) OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications
FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read" ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Device Status Policies
DROP POLICY IF EXISTS "Users can manage own device status" ON public.device_status;
CREATE POLICY "Users can manage own device status" ON public.device_status
FOR ALL TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- Admin Permissions Policies
DROP POLICY IF EXISTS "Read admin permissions" ON public.admin_permissions;
CREATE POLICY "Read admin permissions" ON public.admin_permissions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admin can manage admin permissions" ON public.admin_permissions;
CREATE POLICY "Super admin can manage admin permissions" ON public.admin_permissions
FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'SUPER_ADMIN'
    )
);

