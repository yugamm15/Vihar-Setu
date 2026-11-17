-- JINAARYA VIHAR SETU - Phase B security foundation
-- Additive migration. Do not apply automatically to production.

-- Allows an authenticated administrator to record a security-operation failure
-- without granting direct arbitrary INSERT access to audit_logs.
CREATE OR REPLACE FUNCTION public.record_security_event(
    p_action TEXT,
    p_entity TEXT,
    p_entity_id TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_id UUID;
BEGIN
    IF auth.uid() IS NULL
       OR NOT EXISTS (
           SELECT 1
           FROM public.profiles
           WHERE id = auth.uid()
             AND status = 'ACTIVE'
       )
       OR NOT public.is_admin_or_super()
       OR p_action <> 'SEVAK_HARD_DELETE_FAILED'
       OR p_entity <> 'profiles' THEN
        RAISE EXCEPTION 'Unauthorized: administrative security events require an administrator role.';
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (auth.uid(), p_action, p_entity, p_entity_id, COALESCE(p_details, '{}'::jsonb))
    RETURNING id INTO event_id;

    RETURN event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_security_event(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_security_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Harden the existing privileged operation without changing its name or retention
-- behavior. Missing targets and privileged target accounts must fail explicitly.
CREATE OR REPLACE FUNCTION public.hard_delete_sevak(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    requester_is_super_admin BOOLEAN;
    target_exists BOOLEAN;
    target_is_sevak BOOLEAN;
BEGIN
    requester_is_super_admin := public.has_role(auth.uid(), 'SUPER_ADMIN')
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND status = 'ACTIVE'
        );
    IF NOT requester_is_super_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators can perform a hard delete on Sevak accounts.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = target_user_id
    )
    INTO target_exists;

    IF NOT target_exists THEN
        RAISE EXCEPTION 'Sevak account does not exist.';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = target_user_id
          AND r.name = 'SEVAK'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = target_user_id
          AND r.name IN ('ADMIN', 'SUPER_ADMIN')
    )
    INTO target_is_sevak;

    IF NOT target_is_sevak THEN
        RAISE EXCEPTION 'Only Sevak accounts can be hard-deleted.';
    END IF;

    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
    VALUES (
        auth.uid(),
        'SEVAK_HARD_DELETED',
        'profiles',
        target_user_id::text,
        jsonb_build_object('timestamp', NOW(), 'deleted_by', auth.uid())
    );

    DELETE FROM public.vihar_participants WHERE user_id = target_user_id;
    DELETE FROM public.vihar_holds WHERE user_id = target_user_id;
    DELETE FROM public.vihar_locations WHERE user_id = target_user_id;
    DELETE FROM public.emergencies WHERE user_id = target_user_id;
    DELETE FROM public.safety_checks WHERE user_id = target_user_id;
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Sevak account permanently hard-deleted.');
END;
$$;

REVOKE ALL ON FUNCTION public.hard_delete_sevak(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hard_delete_sevak(UUID) TO authenticated;
