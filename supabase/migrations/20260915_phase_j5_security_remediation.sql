-- JINAARYA VIHAR SETU - Phase J.5 critical security remediation
-- Additive migration. Apply only in an isolated verification database first.

-- 0. PREREQUISITES: DEVICE STATUS, ADMIN PERMISSIONS & SCOPE HELPERS
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
ALTER TABLE public.device_status ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_device_status_user ON public.device_status(user_id);
CREATE INDEX IF NOT EXISTS idx_device_status_vihar ON public.device_status(vihar_id);

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
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

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

    -- Vihar Participant
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
          AND (a.name = p.area OR a.city = p.city OR a.city = v.city)
    ) THEN RETURN TRUE; END IF;

    RETURN FALSE;
END;
$$;

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
          AND (a.name = p.area OR a.city = p.city OR a.city = v.city)
    ) THEN RETURN TRUE; END IF;

    RETURN FALSE;
END;
$$;

-- Device telemetry is written by the device owner. Administrators and Super
-- Administrators may read only through the established Vihar monitoring scope.
DROP POLICY IF EXISTS "Users can manage own device status" ON public.device_status;
CREATE POLICY "Device owners can write own status"
    ON public.device_status
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
        AND (
            vihar_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.vihars v
                WHERE v.id = vihar_id
                  AND (
                      v.user_id = auth.uid()
                      OR EXISTS (
                          SELECT 1
                          FROM public.vihar_participants vp
                          WHERE vp.vihar_id = v.id
                            AND vp.user_id = auth.uid()
                            AND vp.is_current_responsible = TRUE
                      )
                  )
            )
        )
    );

CREATE POLICY "Device owners can update own status"
    ON public.device_status
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid() AND status = 'ACTIVE'
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND (
            vihar_id IS NULL
            OR public.can_manage_vihar(vihar_id)
            OR EXISTS (
                SELECT 1
                FROM public.vihars v
                WHERE v.id = vihar_id AND v.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Authorized users can read device status"
    ON public.device_status
    FOR SELECT TO authenticated
    USING (
        (
            user_id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid() AND status = 'ACTIVE'
            )
        )
        OR (
            vihar_id IS NOT NULL
            AND public.can_monitor_vihar(vihar_id)
        )
    );

-- No client-side delete path is required for the single-row device snapshot.
-- Trusted cleanup must use a separately reviewed backend workflow.

-- Replace global historical monitoring/resolution access with the established
-- owner/participant, monitor, and manage contracts.
DROP POLICY IF EXISTS "Users can view own vihars or admins can view all" ON public.vihars;
CREATE POLICY "Users can read monitored vihars"
    ON public.vihars
    FOR SELECT TO authenticated
    USING (public.can_monitor_vihar(id));

DROP POLICY IF EXISTS "Sevaks can update own vihar or admins" ON public.vihars;
CREATE POLICY "Owners and managers can update vihars"
    ON public.vihars
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.can_manage_vihar(id))
    WITH CHECK (user_id = auth.uid() OR public.can_manage_vihar(id));

DROP POLICY IF EXISTS "Users view own location or admins view all" ON public.vihar_locations;
CREATE POLICY "Users can read monitored locations"
    ON public.vihar_locations
    FOR SELECT TO authenticated
    USING (
        (
            user_id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid() AND status = 'ACTIVE'
            )
        )
        OR public.can_monitor_vihar(vihar_id)
    );

DROP POLICY IF EXISTS "Users view own emergencies or admins view all" ON public.emergencies;
CREATE POLICY "Users can read authorized emergencies"
    ON public.emergencies
    FOR SELECT TO authenticated
    USING (
        (
            user_id = auth.uid()
            AND EXISTS (
                SELECT 1
                FROM public.profiles
                WHERE id = auth.uid() AND status = 'ACTIVE'
            )
        )
        OR (vihar_id IS NOT NULL AND public.can_monitor_vihar(vihar_id))
    );

DROP POLICY IF EXISTS "Users cancel own or admins resolve emergency" ON public.emergencies;
CREATE POLICY "Emergency owners can cancel active emergencies"
    ON public.emergencies
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        AND status IN ('TRIGGERED', 'ESCALATING', 'RESPONDED')
    )
    WITH CHECK (
        user_id = auth.uid()
        AND status IN ('FALSE_ALARM', 'RESOLVED')
    );

CREATE POLICY "Authorized administrators can resolve emergencies"
    ON public.emergencies
    FOR UPDATE TO authenticated
    USING (
        vihar_id IS NOT NULL
        AND public.can_manage_vihar(vihar_id)
        AND status IN ('TRIGGERED', 'ESCALATING', 'RESPONDED')
    )
    WITH CHECK (
        vihar_id IS NOT NULL
        AND public.can_manage_vihar(vihar_id)
        AND status = 'RESOLVED'
    );

-- Emergency creation is now performed by the transactional RPC below so a
-- client cannot create an emergency without its required audit event.
DROP POLICY IF EXISTS "Users create emergency for self" ON public.emergencies;

-- Notification writes are server-generated. Existing client producers call the
-- RPC below, which derives recipients from the established Vihar scope.
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS notification_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_notification_key_uidx
    ON public.notifications(notification_key)
    WHERE notification_key IS NOT NULL;

DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.emit_vihar_notification(
    p_vihar_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_severity TEXT DEFAULT 'INFO',
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := auth.uid();
    inserted_count INTEGER := 0;
    notification_title TEXT;
    notification_body TEXT;
BEGIN
    IF caller_id IS NULL
       OR NOT EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = caller_id AND status = 'ACTIVE'
       ) THEN
        RAISE EXCEPTION 'An active authenticated profile is required.';
    END IF;

    IF p_vihar_id IS NULL
       OR NOT public.can_monitor_vihar(p_vihar_id) THEN
        RAISE EXCEPTION 'The caller is not authorized for this Vihar.';
    END IF;

    IF p_type NOT IN ('DEVIATION', 'POLICE_CALL') THEN
        RAISE EXCEPTION 'Unsupported notification type.';
    END IF;

    IF p_severity NOT IN ('INFO', 'WARNING', 'CRITICAL') THEN
        RAISE EXCEPTION 'Unsupported notification severity.';
    END IF;

    IF p_type = 'POLICE_CALL' THEN
        IF p_metadata->>'number' NOT IN ('112', '181') THEN
            RAISE EXCEPTION 'Unsupported police notification target.';
        END IF;
        notification_title := 'CRITICAL: Emergency call initiated';
        notification_body := 'An emergency call was initiated for the monitored Vihar.';
    ELSE
        IF NOT (p_metadata ? 'deviation_meters') THEN
            RAISE EXCEPTION 'Deviation distance is required.';
        END IF;
        notification_title := 'Route deviation alert';
        notification_body := 'A route deviation was detected for the monitored Vihar.';
    END IF;

    WITH vihar_context AS (
        SELECT v.user_id AS owner_id, p.city, NULLIF(BTRIM(p.area), '') AS area
        FROM public.vihars v
        JOIN public.profiles p ON p.id = v.user_id AND p.status = 'ACTIVE'
        WHERE v.id = p_vihar_id
    ),
    recipients AS (
        SELECT owner_id AS user_id FROM vihar_context
        UNION
        SELECT vp.user_id
        FROM public.vihar_participants vp
        JOIN public.profiles p ON p.id = vp.user_id AND p.status = 'ACTIVE'
        WHERE vp.vihar_id = p_vihar_id
          AND vp.is_current_responsible = TRUE
        UNION
        SELECT ad.user_id
        FROM public.administrators ad
        JOIN public.profiles ap ON ap.id = ad.user_id AND ap.status = 'ACTIVE'
        JOIN public.areas a ON a.id = ad.area_id AND a.is_active = TRUE
        CROSS JOIN vihar_context vc
        WHERE ad.is_active = TRUE
          AND (
              a.name = vc.area
              OR a.city = vc.city
          )
          AND (
              COALESCE((ad.permissions ->> 'can_monitor_vihars')::BOOLEAN, FALSE)
              OR EXISTS (
                  SELECT 1 FROM public.admin_permissions permission
                  WHERE permission.admin_id = ad.id
                    AND permission.permission_key = 'can_monitor_vihars'
                    AND permission.is_granted = TRUE
              )
          )
    )
    INSERT INTO public.notifications (
        user_id, vihar_id, title, body, type, severity, metadata, notification_key
    )
    SELECT
        r.user_id,
        p_vihar_id,
        notification_title,
        notification_body,
        p_type,
        p_severity,
        COALESCE(p_metadata, '{}'::JSONB),
        CASE
            WHEN p_idempotency_key IS NULL THEN NULL
            ELSE p_idempotency_key || ':' || r.user_id::TEXT
        END
    FROM recipients r
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_vihar_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_vihar_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;

-- Make SOS creation, the required audit event, and required Vihar state change
-- one transaction. Replays with the same request identifier return the original
-- emergency rather than creating a duplicate.
ALTER TABLE public.emergencies
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS emergencies_user_id_idempotency_key_uidx
    ON public.emergencies(user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_emergency_sos(
    p_idempotency_key TEXT,
    p_vihar_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_battery_percentage INTEGER,
    p_trigger_type public.emergency_trigger_type,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    caller_id UUID := auth.uid();
    emergency_row public.emergencies%ROWTYPE;
    audit_id UUID;
    is_replay BOOLEAN := FALSE;
BEGIN
    IF caller_id IS NULL
       OR NOT EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = caller_id AND status = 'ACTIVE'
       ) THEN
        RAISE EXCEPTION 'An active authenticated profile is required.';
    END IF;

    IF p_idempotency_key IS NULL OR BTRIM(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'An idempotency key is required.';
    END IF;

    IF p_vihar_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.vihars v
           WHERE v.id = p_vihar_id
             AND (
                 v.user_id = caller_id
                 OR EXISTS (
                     SELECT 1
                     FROM public.vihar_participants vp
                     WHERE vp.vihar_id = v.id
                       AND vp.user_id = caller_id
                       AND vp.is_current_responsible = TRUE
                 )
             )
       ) THEN
        RAISE EXCEPTION 'The caller is not authorized for this Vihar.';
    END IF;

    SELECT *
    INTO emergency_row
    FROM public.emergencies
    WHERE user_id = caller_id
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.emergencies (
            vihar_id, user_id, status, trigger_type, latitude, longitude,
            battery_percentage, resolution_notes, triggered_at, idempotency_key
        )
        VALUES (
            p_vihar_id, caller_id, 'TRIGGERED', p_trigger_type, p_latitude,
            p_longitude, p_battery_percentage, p_notes, NOW(), p_idempotency_key
        )
        RETURNING * INTO emergency_row;

        IF p_vihar_id IS NOT NULL THEN
            UPDATE public.vihars
            SET safety_status = 'EMERGENCY', updated_at = NOW()
            WHERE id = p_vihar_id;

            INSERT INTO public.route_events (
                vihar_id, event_type, severity, message, latitude, longitude, metadata
            )
            VALUES (
                p_vihar_id,
                'DEVIATION_LEVEL_2',
                'CRITICAL',
                'CRITICAL ALERT: ' || p_trigger_type::TEXT
                    || ' broadcast at (' || ROUND(p_latitude::NUMERIC, 4)
                    || ', ' || ROUND(p_longitude::NUMERIC, 4) || ')',
                p_latitude,
                p_longitude,
                jsonb_build_object('battery', p_battery_percentage, 'notes', p_notes)
            );
        END IF;
    ELSE
        is_replay := TRUE;
    END IF;

    SELECT al.id
    INTO audit_id
    FROM public.audit_logs al
    WHERE al.actor_id = caller_id
      AND al.action = 'EMERGENCY_SOS_TRIGGERED'
      AND al.entity = 'emergencies'
      AND al.entity_id = emergency_row.id::TEXT
    ORDER BY al.created_at
    LIMIT 1
    FOR UPDATE;

    IF audit_id IS NULL THEN
        INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
        VALUES (
            caller_id,
            'EMERGENCY_SOS_TRIGGERED',
            'emergencies',
            emergency_row.id::TEXT,
            jsonb_build_object(
                'vihar_id', emergency_row.vihar_id,
                'trigger_type', emergency_row.trigger_type,
                'triggered_at', emergency_row.triggered_at,
                'idempotency_key', emergency_row.idempotency_key
            )
        )
        RETURNING id INTO audit_id;
    END IF;

    RETURN jsonb_build_object(
        'emergency', to_jsonb(emergency_row),
        'audit_id', audit_id,
        'replayed', is_replay
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_emergency_sos(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, public.emergency_trigger_type, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_emergency_sos(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, public.emergency_trigger_type, TEXT) TO authenticated;
