-- ==============================================================================
-- JINAARYA VIHAR SETU — Administrator Live Monitoring Core Schema & RPCs
-- Migration: 20260910_admin_live_monitoring.sql
-- ==============================================================================

-- 1. SECURITY & HELPER FUNCTIONS FOR AREA ISOLATION
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
