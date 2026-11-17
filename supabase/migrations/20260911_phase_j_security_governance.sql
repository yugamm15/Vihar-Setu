-- JINAARYA VIHAR SETU - Phase J security governance hardening
-- Additive migration. Apply only after review in an isolated test database.

-- Keep profile edits available for registration while protecting authorization
-- state and administrator scope from client-controlled updates.
CREATE OR REPLACE FUNCTION public.protect_profile_authorization_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authenticated context is required.';
    END IF;

    IF NOT public.has_role(auth.uid(), 'SUPER_ADMIN') THEN
        IF NEW.id IS DISTINCT FROM OLD.id
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Authorization fields are managed by protected backend workflows.';
        END IF;
    END IF;

    IF public.has_role(auth.uid(), 'ADMIN')
       AND NOT public.has_role(auth.uid(), 'SUPER_ADMIN')
       AND NEW.area IS DISTINCT FROM OLD.area THEN
        RAISE EXCEPTION 'Administrator area is managed by protected backend workflows.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_authorization_fields ON public.profiles;
CREATE TRIGGER protect_profile_authorization_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_authorization_fields();

DROP POLICY IF EXISTS "Users can update own basic profile" ON public.profiles;
CREATE POLICY "Users can update own basic profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
        OR public.has_role(auth.uid(), 'SUPER_ADMIN')
    )
    WITH CHECK (
        auth.uid() = id
        OR public.has_role(auth.uid(), 'SUPER_ADMIN')
    );

-- All privileged policy checks must use the active-profile-aware helper.
DROP POLICY IF EXISTS "Super admins can manage areas" ON public.areas;
CREATE POLICY "Super admins can manage areas" ON public.areas
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'SUPER_ADMIN'))
    WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "Super admin can manage user roles" ON public.user_roles;
CREATE POLICY "Super admin can manage user roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'SUPER_ADMIN'))
    WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "Super admin can manage administrators" ON public.administrators;
CREATE POLICY "Super admin can manage administrators" ON public.administrators
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'SUPER_ADMIN'))
    WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "Super admin can manage admin permissions" ON public.admin_permissions;
CREATE POLICY "Super admin can manage admin permissions" ON public.admin_permissions
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'SUPER_ADMIN'))
    WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "Read admin permissions" ON public.admin_permissions;
CREATE POLICY "Read admin permissions" ON public.admin_permissions
    FOR SELECT TO authenticated
    USING (
        public.has_role(auth.uid(), 'SUPER_ADMIN')
        OR (
            public.has_role(auth.uid(), 'ADMIN')
            AND EXISTS (
                SELECT 1
                FROM public.administrators ad
                WHERE ad.id = admin_id
                  AND ad.user_id = auth.uid()
                  AND ad.is_active = TRUE
            )
        )
    );

DROP POLICY IF EXISTS "Super admin update settings" ON public.system_settings;
CREATE POLICY "Super admin update settings" ON public.system_settings
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'SUPER_ADMIN'))
    WITH CHECK (public.has_role(auth.uid(), 'SUPER_ADMIN'));

DROP POLICY IF EXISTS "Authenticated users view settings" ON public.system_settings;
CREATE POLICY "Authenticated users view public system settings" ON public.system_settings
    FOR SELECT TO authenticated
    USING (
        key IN (
            'gps_frequency_active_sec',
            'gps_frequency_low_battery_sec',
            'route_deviation_distance_m',
            'route_deviation_duration_sec',
            'stationary_duration_min',
            'safety_response_timeout_sec',
            'emergency_escalation_timeout_sec',
            'low_battery_threshold_pct',
            'critical_battery_threshold_pct'
        )
        OR public.has_role(auth.uid(), 'SUPER_ADMIN')
    );

-- Prevent direct client fabrication of audit rows. Trusted SECURITY DEFINER
-- functions and existing protected RPCs may still write audit rows internally.
DROP POLICY IF EXISTS "Insert audit log" ON public.audit_logs;

CREATE OR REPLACE FUNCTION public.record_emergency_sos_audit(p_emergency_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_emergency public.emergencies%ROWTYPE;
    v_event_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authenticated context is required.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'An active profile is required.';
    END IF;

    SELECT *
    INTO v_emergency
    FROM public.emergencies
    WHERE id = p_emergency_id
    FOR SHARE;

    IF NOT FOUND
       OR v_emergency.user_id <> auth.uid()
       OR v_emergency.status <> 'TRIGGERED' THEN
        RAISE EXCEPTION 'The emergency is not authorized for this audit event.';
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (
        auth.uid(),
        'EMERGENCY_SOS_TRIGGERED',
        'emergencies',
        v_emergency.id::TEXT,
        jsonb_build_object(
            'vihar_id', v_emergency.vihar_id,
            'trigger_type', v_emergency.trigger_type,
            'triggered_at', v_emergency.triggered_at
        )
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_emergency_sos_audit(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_emergency_sos_audit(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.audit_sevak_profile_view(UUID, TEXT) FROM PUBLIC;
