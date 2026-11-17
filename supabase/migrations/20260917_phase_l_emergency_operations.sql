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
