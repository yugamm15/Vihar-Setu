-- ==============================================================================
-- JINAARYA VIHAR SETU — Phase 20: Start Vihar Gate, Telemetry & Advisory Schema
-- Migration: 20260920_start_vihar_gate_and_telemetry.sql
-- ==============================================================================

-- 1. HAVERSINE DISTANCE FUNCTION (Deterministic, Extension-free, Pure PL/pgSQL)
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance_m(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS NUMERIC AS $$
DECLARE
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat / 2.0) * sin(dlat / 2.0) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon / 2.0) * sin(dlon / 2.0);
    c := 2.0 * atan2(sqrt(GREATEST(0.0, a)), sqrt(GREATEST(0.0, 1.0 - a)));
    RETURN ROUND((6371000.0 * c)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. ADDITIVE COLUMNS FOR AUDIT & IDEMPOTENCY
ALTER TABLE public.vihars
    ADD COLUMN IF NOT EXISTS gate_distance_m NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS gate_accuracy_m NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS gate_passed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS client_uuid UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vihars_client_uuid
    ON public.vihars(client_uuid)
    WHERE client_uuid IS NOT NULL;

ALTER TABLE public.vihar_locations
    ADD COLUMN IF NOT EXISTS client_uuid UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vihar_locations_client_uuid
    ON public.vihar_locations(client_uuid)
    WHERE client_uuid IS NOT NULL;

-- 3. ENSURE SYSTEM SETTINGS KEYS
INSERT INTO public.system_settings (key, value, description)
VALUES
    ('start_radius_m', '100'::jsonb, 'Maximum allowable distance from starting point in meters'),
    ('start_max_accuracy_m', '50'::jsonb, 'Maximum acceptable GPS accuracy in meters for Start Gate'),
    ('gps_interval_s', '5'::jsonb, 'GPS update frequency in seconds during active movement'),
    ('accuracy_limit_m', '50'::jsonb, 'Maximum accuracy reading before ignoring GPS point'),
    ('deviation_tier1_m', '100'::jsonb, 'Deviation distance for Tier 1 gentle warning'),
    ('deviation_tier2_m', '500'::jsonb, 'Deviation distance for Tier 2 loud alarm and push'),
    ('deviation_tier3_m', '1000'::jsonb, 'Deviation distance for Tier 3 emergency escalation'),
    ('deviation_sustain_s', '15'::jsonb, 'Seconds deviation must sustain before triggering tier'),
    ('deviation_return_margin_m', '60'::jsonb, 'Hysteresis return threshold to cancel deviation'),
    ('escalation_timeout_s', '60'::jsonb, 'Timeout before escalating emergency to next admin'),
    ('walking_speed_kmph', '4.5'::jsonb, 'Default walking speed fallback for ETA calculation'),
    ('weather_refresh_min', '15'::jsonb, 'Minutes between weather refreshes'),
    ('low_battery_pct', '20'::jsonb, 'Low battery warning threshold percent'),
    ('critical_battery_pct', '10'::jsonb, 'Critical battery alert threshold percent'),
    ('silence_timeout_s', '180'::jsonb, 'Seconds of no telemetry before dead-reckoning alert'),
    ('voice_call_enabled', 'false'::jsonb, 'Feature flag for automated voice calling')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 4. VIHAR LIVE STATE RLS POLICIES (Sevika write/read, Admin area read, Super Admin read all)
ALTER TABLE public.vihar_live_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sevika can manage own vihar live state" ON public.vihar_live_state;
CREATE POLICY "Sevika can manage own vihar live state"
    ON public.vihar_live_state FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view live state of their area" ON public.vihar_live_state;
CREATE POLICY "Admins can view live state of their area"
    ON public.vihar_live_state FOR SELECT
    TO authenticated
    USING (
        area_id = public.current_admin_area_id() OR public.is_super_admin()
    );

-- 5. TRANSACTIONAL START VIHAR RPC WITH START GATE ENFORCEMENT
CREATE OR REPLACE FUNCTION public.start_vihar(
    p_client_uuid UUID,
    p_source_name TEXT,
    p_source_lat DOUBLE PRECISION,
    p_source_lng DOUBLE PRECISION,
    p_dest_name TEXT,
    p_dest_lat DOUBLE PRECISION,
    p_dest_lng DOUBLE PRECISION,
    p_expected_arrival TIMESTAMPTZ DEFAULT NULL,
    p_notes TEXT DEFAULT '',
    p_route_geometry TEXT DEFAULT NULL,
    p_total_distance_km NUMERIC DEFAULT 0.0,
    p_estimated_duration_mins INT DEFAULT 60,
    p_participant_ids UUID[] DEFAULT ARRAY[]::UUID[],
    p_device_lat DOUBLE PRECISION DEFAULT NULL,
    p_device_lng DOUBLE PRECISION DEFAULT NULL,
    p_accuracy NUMERIC DEFAULT NULL,
    p_fix_time TIMESTAMPTZ DEFAULT NULL,
    p_is_mock BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_active_vihar_id UUID;
    v_existing_vihar_id UUID;
    v_start_radius_m NUMERIC := 100.0;
    v_start_max_accuracy_m NUMERIC := 50.0;
    v_raw_distance_m NUMERIC := 0.0;
    v_effective_distance_m NUMERIC := 0.0;
    v_area_id UUID;
    v_new_vihar_id UUID;
    v_new_subvihar_id UUID;
    v_new_route_id UUID;
    v_result JSONB;
BEGIN
    -- Check authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required to start a Vihar.';
    END IF;

    -- Idempotency check on client_uuid
    IF p_client_uuid IS NOT NULL THEN
        SELECT id INTO v_existing_vihar_id
        FROM public.vihars
        WHERE client_uuid = p_client_uuid
        LIMIT 1;

        IF v_existing_vihar_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'success', true,
                'vihar_id', v_existing_vihar_id,
                'status', 'ACTIVE',
                'is_idempotent', true
            ) INTO v_result;
            RETURN v_result;
        END IF;
    END IF;

    -- Check if user already has an ACTIVE Vihar
    SELECT id INTO v_active_vihar_id
    FROM public.vihars
    WHERE user_id = v_user_id AND status = 'ACTIVE'
    LIMIT 1;

    IF v_active_vihar_id IS NOT NULL THEN
        RAISE EXCEPTION 'ALREADY_ACTIVE_VIHAR: You already have an active Vihar in progress (ID: %).', v_active_vihar_id;
    END IF;

    -- Fetch dynamic thresholds from system_settings
    BEGIN
        SELECT COALESCE(
            CASE 
                WHEN jsonb_typeof(value) = 'number' THEN value::text::numeric
                WHEN jsonb_typeof(value) = 'string' THEN (value#>>'{}')::numeric
                ELSE 100.0
            END, 100.0)
        INTO v_start_radius_m
        FROM public.system_settings WHERE key = 'start_radius_m';
    EXCEPTION WHEN OTHERS THEN
        v_start_radius_m := 100.0;
    END;

    BEGIN
        SELECT COALESCE(
            CASE 
                WHEN jsonb_typeof(value) = 'number' THEN value::text::numeric
                WHEN jsonb_typeof(value) = 'string' THEN (value#>>'{}')::numeric
                ELSE 50.0
            END, 50.0)
        INTO v_start_max_accuracy_m
        FROM public.system_settings WHERE key = 'start_max_accuracy_m';
    EXCEPTION WHEN OTHERS THEN
        v_start_max_accuracy_m := 50.0;
    END;

    -- START GATE: 1. Reject Mock Location
    IF p_is_mock IS TRUE THEN
        RAISE EXCEPTION 'MOCK_LOCATION_BLOCKED: Mock GPS locations are not permitted for Vihar safety.';
    END IF;

    -- START GATE: 2. Freshness Check (Fix <= 30 seconds old)
    IF p_fix_time IS NOT NULL AND p_fix_time < (NOW() - INTERVAL '30 seconds') THEN
        RAISE EXCEPTION 'STALE_GPS_FIX: Location fix is more than 30 seconds old. Waiting for fresh signal.';
    END IF;

    -- START GATE: 3. Accuracy Threshold Check
    IF p_accuracy IS NOT NULL AND p_accuracy > v_start_max_accuracy_m THEN
        RAISE EXCEPTION 'POOR_GPS_ACCURACY: GPS accuracy is %m (threshold is %m). Waiting for better signal.', ROUND(p_accuracy, 1), v_start_max_accuracy_m;
    END IF;

    -- START GATE: 4. Physical Proximity Calculation
    IF p_device_lat IS NOT NULL AND p_device_lng IS NOT NULL THEN
        v_raw_distance_m := public.calculate_haversine_distance_m(
            p_device_lat, p_device_lng,
            p_source_lat, p_source_lng
        );
        v_effective_distance_m := GREATEST(0.0, v_raw_distance_m - LEAST(COALESCE(p_accuracy, 0.0), v_start_max_accuracy_m));

        IF v_effective_distance_m > v_start_radius_m THEN
            -- Log failure into audit_logs if table exists
            BEGIN
                INSERT INTO public.audit_logs (user_id, action, entity_type, details)
                VALUES (
                    v_user_id,
                    'START_GATE_FAILED',
                    'vihar',
                    jsonb_build_object(
                        'raw_distance_m', v_raw_distance_m,
                        'effective_distance_m', v_effective_distance_m,
                        'accuracy_m', p_accuracy,
                        'threshold_m', v_start_radius_m,
                        'source_lat', p_source_lat,
                        'source_lng', p_source_lng,
                        'device_lat', p_device_lat,
                        'device_lng', p_device_lng
                    )
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            RAISE EXCEPTION 'NOT_AT_START: You are % meters from the starting point (allowable radius: %m).', ROUND(v_raw_distance_m, 0), v_start_radius_m;
        END IF;
    ELSE
        RAISE EXCEPTION 'GPS_REQUIRED: Current device location is required to pass the Start Gate.';
    END IF;

    -- Derive operational area_id
    SELECT id INTO v_area_id
    FROM public.areas
    WHERE is_active = TRUE AND (
        name ILIKE '%' || p_source_name || '%' OR
        p_source_name ILIKE '%' || name || '%'
    )
    LIMIT 1;

    IF v_area_id IS NULL THEN
        SELECT a.id INTO v_area_id
        FROM public.profiles p
        JOIN public.areas a ON a.name ILIKE '%' || p.area || '%'
        WHERE p.id = v_user_id AND a.is_active = TRUE
        LIMIT 1;
    END IF;

    IF v_area_id IS NULL THEN
        SELECT id INTO v_area_id FROM public.areas WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF v_area_id IS NULL THEN
        INSERT INTO public.areas (name, city, state, is_active)
        VALUES ('Surat Central & Rander', 'Surat', 'Gujarat', TRUE)
        RETURNING id INTO v_area_id;
    END IF;

    -- 1. Insert Main Vihar
    INSERT INTO public.vihars (
        client_uuid,
        user_id,
        title,
        source_name,
        source_lat,
        source_lng,
        dest_name,
        dest_lat,
        dest_lng,
        planned_route_polyline,
        total_distance_km,
        estimated_duration_mins,
        status,
        safety_status,
        started_at,
        notes,
        gate_distance_m,
        gate_accuracy_m,
        gate_passed_at,
        created_at,
        updated_at
    ) VALUES (
        p_client_uuid,
        v_user_id,
        'Vihar to ' || COALESCE(p_dest_name, 'Destination'),
        p_source_name,
        p_source_lat,
        p_source_lng,
        p_dest_name,
        p_dest_lat,
        p_dest_lng,
        p_route_geometry,
        p_total_distance_km,
        p_estimated_duration_mins,
        'ACTIVE',
        'SAFE',
        NOW(),
        p_notes,
        v_raw_distance_m,
        p_accuracy,
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_vihar_id;

    -- 2. Insert Sub-Vihar #1
    INSERT INTO public.vihar_subsessions (
        vihar_id,
        sub_vihar_number,
        title,
        source_name,
        source_lat,
        source_lng,
        dest_name,
        dest_lat,
        dest_lng,
        total_distance_km,
        status,
        started_at,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_new_vihar_id,
        1,
        'Sub-Vihar 1: ' || p_source_name || ' → ' || p_dest_name,
        p_source_name,
        p_source_lat,
        p_source_lng,
        p_dest_name,
        p_dest_lat,
        p_dest_lng,
        p_total_distance_km,
        'ACTIVE',
        NOW(),
        p_notes,
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_subvihar_id;

    -- 3. Insert Active Route v1
    INSERT INTO public.vihar_routes (
        vihar_id,
        sub_vihar_id,
        route_name,
        origin_name,
        origin_lat,
        origin_lng,
        dest_name,
        dest_lat,
        dest_lng,
        polyline_points,
        total_distance_km,
        estimated_duration_mins,
        is_active_route,
        created_at,
        updated_at
    ) VALUES (
        v_new_vihar_id,
        v_new_subvihar_id,
        'Route v1: ' || p_source_name || ' to ' || p_dest_name,
        p_source_name,
        p_source_lat,
        p_source_lng,
        p_dest_name,
        p_dest_lat,
        p_dest_lng,
        p_route_geometry,
        p_total_distance_km,
        p_estimated_duration_mins,
        TRUE,
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_route_id;

    -- 4. Insert Lead Participant
    INSERT INTO public.vihar_participants (
        vihar_id,
        sub_vihar_id,
        user_id,
        role,
        is_current_responsible,
        joined_at,
        created_at
    ) VALUES (
        v_new_vihar_id,
        v_new_subvihar_id,
        v_user_id,
        'LEAD_SEVAK',
        TRUE,
        NOW(),
        NOW()
    );

    -- 5. Insert Accompanying Participants (if any)
    IF p_participant_ids IS NOT NULL AND array_length(p_participant_ids, 1) > 0 THEN
        INSERT INTO public.vihar_participants (
            vihar_id,
            sub_vihar_id,
            user_id,
            role,
            is_current_responsible,
            joined_at,
            created_at
        )
        SELECT
            v_new_vihar_id,
            v_new_subvihar_id,
            pid,
            'ACCOMPANYING',
            FALSE,
            NOW(),
            NOW()
        FROM unnest(p_participant_ids) AS pid
        WHERE pid <> v_user_id;
    END IF;

    -- 6. Insert initial row into vihar_live_state
    INSERT INTO public.vihar_live_state (
        vihar_id,
        area_id,
        user_id,
        subvihar_id,
        status,
        lat,
        lng,
        speed,
        heading,
        accuracy,
        battery,
        network,
        route_progress_m,
        distance_remaining_m,
        eta_at,
        deviation_distance_m,
        hold_active,
        last_heartbeat_at,
        updated_at
    ) VALUES (
        v_new_vihar_id,
        v_area_id,
        v_user_id,
        v_new_subvihar_id,
        'SAFE',
        p_device_lat,
        p_device_lng,
        0.0,
        0.0,
        COALESCE(p_accuracy, 5.0),
        100,
        'ONLINE',
        0.0,
        (p_total_distance_km * 1000.0),
        p_expected_arrival,
        0.0,
        FALSE,
        NOW(),
        NOW()
    ) ON CONFLICT (vihar_id) DO UPDATE SET
        area_id = EXCLUDED.area_id,
        subvihar_id = EXCLUDED.subvihar_id,
        status = 'SAFE',
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        last_heartbeat_at = NOW(),
        updated_at = NOW();

    -- Return JSON payload
    SELECT jsonb_build_object(
        'success', true,
        'vihar_id', v_new_vihar_id,
        'subvihar_id', v_new_subvihar_id,
        'route_id', v_new_route_id,
        'area_id', v_area_id,
        'status', 'ACTIVE',
        'started_at', NOW(),
        'gate_distance_m', v_raw_distance_m,
        'effective_distance_m', v_effective_distance_m
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. INGEST LOCATIONS BATCH RPC
CREATE OR REPLACE FUNCTION public.ingest_locations_batch(
    p_batch JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_item JSONB;
    v_vihar_id UUID;
    v_subvihar_id UUID;
    v_client_uuid UUID;
    v_lat DOUBLE PRECISION;
    v_lng DOUBLE PRECISION;
    v_speed NUMERIC;
    v_heading NUMERIC;
    v_accuracy NUMERIC;
    v_altitude NUMERIC;
    v_battery INT;
    v_network TEXT;
    v_rec_time TIMESTAMPTZ;
    v_inserted_count INT := 0;
    v_latest_point JSONB := NULL;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Authentication required.';
    END IF;

    IF jsonb_typeof(p_batch) <> 'array' THEN
        RAISE EXCEPTION 'INVALID_ARGUMENT: p_batch must be a JSON array.';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_batch)
    LOOP
        v_vihar_id := (v_item->>'vihar_id')::uuid;
        v_subvihar_id := (v_item->>'subvihar_id')::uuid;
        v_client_uuid := (v_item->>'client_uuid')::uuid;
        v_lat := (v_item->>'lat')::double precision;
        v_lng := (v_item->>'lng')::double precision;
        v_speed := COALESCE((v_item->>'speed')::numeric, 0.0);
        v_heading := COALESCE((v_item->>'heading')::numeric, 0.0);
        v_accuracy := COALESCE((v_item->>'accuracy')::numeric, 5.0);
        v_altitude := (v_item->>'altitude')::numeric;
        v_battery := COALESCE((v_item->>'battery')::int, 100);
        v_network := COALESCE(v_item->>'network', 'ONLINE');
        v_rec_time := COALESCE((v_item->>'recorded_at')::timestamptz, NOW());

        -- Check participant authorization
        IF NOT EXISTS (
            SELECT 1 FROM public.vihar_participants
            WHERE vihar_id = v_vihar_id AND user_id = v_user_id
        ) THEN
            CONTINUE;
        END IF;

        -- Insert into history table
        INSERT INTO public.vihar_locations (
            client_uuid,
            vihar_id,
            user_id,
            latitude,
            longitude,
            speed_kmh,
            heading,
            accuracy_meters,
            altitude,
            battery_percentage,
            network_status,
            recorded_at,
            synced_at
        ) VALUES (
            v_client_uuid,
            v_vihar_id,
            v_user_id,
            v_lat,
            v_lng,
            v_speed,
            v_heading,
            v_accuracy,
            v_altitude,
            v_battery,
            v_network,
            v_rec_time,
            NOW()
        ) ON CONFLICT (client_uuid) DO NOTHING;

        v_inserted_count := v_inserted_count + 1;
        v_latest_point := v_item;
    END LOOP;

    -- Update vihar_live_state with latest good point if available
    IF v_latest_point IS NOT NULL THEN
        UPDATE public.vihar_live_state
        SET
            lat = (v_latest_point->>'lat')::double precision,
            lng = (v_latest_point->>'lng')::double precision,
            speed = COALESCE((v_latest_point->>'speed')::numeric, speed),
            heading = COALESCE((v_latest_point->>'heading')::numeric, heading),
            accuracy = COALESCE((v_latest_point->>'accuracy')::numeric, accuracy),
            battery = COALESCE((v_latest_point->>'battery')::int, battery),
            network = COALESCE(v_latest_point->>'network', network),
            route_progress_m = COALESCE((v_latest_point->>'route_progress_m')::numeric, route_progress_m),
            distance_remaining_m = COALESCE((v_latest_point->>'distance_remaining_m')::numeric, distance_remaining_m),
            eta_at = COALESCE((v_latest_point->>'eta_at')::timestamptz, eta_at),
            deviation_distance_m = COALESCE((v_latest_point->>'deviation_distance_m')::numeric, deviation_distance_m),
            hold_active = COALESCE((v_latest_point->>'hold_active')::boolean, hold_active),
            status = COALESCE(v_latest_point->>'status', status),
            last_heartbeat_at = NOW(),
            updated_at = NOW()
        WHERE vihar_id = (v_latest_point->>'vihar_id')::uuid;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_points', v_inserted_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ROUTE EVENT RECORDING RPC
CREATE OR REPLACE FUNCTION public.record_route_event(
    p_vihar_id UUID,
    p_event_type TEXT,
    p_severity TEXT,
    p_message TEXT,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    INSERT INTO public.route_events (
        vihar_id,
        event_type,
        severity,
        message,
        latitude,
        longitude,
        metadata,
        created_at
    ) VALUES (
        p_vihar_id,
        p_event_type::route_event_type,
        p_severity::severity_level_type,
        p_message,
        p_latitude,
        p_longitude,
        p_metadata,
        NOW()
    ) RETURNING id INTO v_event_id;

    -- If deviation tier 1 or 2, update live state status
    IF p_event_type = 'DEVIATION_START' THEN
        UPDATE public.vihar_live_state
        SET status = 'WARNING', updated_at = NOW()
        WHERE vihar_id = p_vihar_id AND status = 'SAFE';
    ELSIF p_event_type = 'DEVIATION_END' THEN
        UPDATE public.vihar_live_state
        SET status = 'SAFE', updated_at = NOW()
        WHERE vihar_id = p_vihar_id AND status = 'WARNING';
    END IF;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. EMERGENCY CREATION RPC (ROUTE_DEVIATION_1KM & MANUAL_SOS)
CREATE OR REPLACE FUNCTION public.create_emergency(
    p_vihar_id UUID,
    p_trigger_type TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_battery_percentage INT DEFAULT 100,
    p_client_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_emergency_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;

    INSERT INTO public.emergencies (
        vihar_id,
        user_id,
        status,
        trigger_type,
        latitude,
        longitude,
        battery_percentage,
        triggered_at
    ) VALUES (
        p_vihar_id,
        v_user_id,
        'TRIGGERED',
        p_trigger_type::emergency_trigger_type,
        p_latitude,
        p_longitude,
        p_battery_percentage,
        NOW()
    ) RETURNING id INTO v_emergency_id;

    -- Escalate live state to EMERGENCY
    IF p_vihar_id IS NOT NULL THEN
        UPDATE public.vihar_live_state
        SET status = 'EMERGENCY', updated_at = NOW()
        WHERE vihar_id = p_vihar_id;

        UPDATE public.vihars
        SET safety_status = 'EMERGENCY', updated_at = NOW()
        WHERE id = p_vihar_id;
    END IF;

    RETURN v_emergency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ADD vihar_live_state TO REALTIME PUBLICATION
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vihar_live_state;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
