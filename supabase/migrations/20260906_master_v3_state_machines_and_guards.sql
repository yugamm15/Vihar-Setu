-- =====================================================================
-- MIGRATION: 20260906_master_v3_state_machines_and_guards.sql
-- JINAARYA VIHAR SETU — SAFETY-CRITICAL STATE MACHINES & GUARDS
-- Standard: PART B Master Prompt v3 (Phases 3, 4, 9)
-- =====================================================================

BEGIN;

-- 1. EXACTLY ONE ACTIVE SUB-VIHAR PER VIHAR (Partial Unique Index)
DROP INDEX IF EXISTS idx_unique_active_subvihar;
CREATE UNIQUE INDEX idx_unique_active_subvihar 
ON public.vihar_subsessions (vihar_id) 
WHERE status = 'ACTIVE';

-- 2. EXACTLY ONE ACTIVE HOLD PER SUB-VIHAR (Partial Unique Index)
DROP INDEX IF EXISTS idx_unique_open_hold;
CREATE UNIQUE INDEX idx_unique_open_hold 
ON public.vihar_holds (sub_vihar_id) 
WHERE status = 'ACTIVE' AND sub_vihar_id IS NOT NULL;

-- 3. STATE MACHINE TRANSITION ENFORCEMENT ON VIHAR
-- Allowed transitions for vihar_status_type:
-- PLANNED -> ACTIVE, CANCELLED
-- ACTIVE -> PAUSED, COMPLETED, CANCELLED
-- PAUSED -> ACTIVE, COMPLETED, CANCELLED
-- COMPLETED & CANCELLED are terminal
CREATE OR REPLACE FUNCTION check_vihar_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'PLANNED' AND NEW.status IN ('ACTIVE', 'CANCELLED') THEN
    RETURN NEW;
  ELSIF OLD.status = 'ACTIVE' AND NEW.status IN ('PAUSED', 'COMPLETED', 'CANCELLED') THEN
    RETURN NEW;
  ELSIF OLD.status = 'PAUSED' AND NEW.status IN ('ACTIVE', 'COMPLETED', 'CANCELLED') THEN
    RETURN NEW;
  ELSIF OLD.status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Illegal state transition: Vihar is terminal (%) and cannot transition to %', OLD.status, NEW.status;
  ELSE
    RAISE EXCEPTION 'Illegal Vihar state transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_vihar_transition ON public.vihars;
CREATE TRIGGER trg_check_vihar_transition
BEFORE UPDATE OF status ON public.vihars
FOR EACH ROW EXECUTE FUNCTION check_vihar_state_transition();

-- 4. STATE MACHINE TRANSITION ENFORCEMENT ON SUB-VIHAR
-- Allowed transitions:
-- PLANNED -> ACTIVE, CANCELLED
-- ACTIVE -> COMPLETED, TRANSFERRED, CANCELLED
-- COMPLETED, TRANSFERRED, CANCELLED are terminal
CREATE OR REPLACE FUNCTION check_subvihar_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'PLANNED' AND NEW.status IN ('ACTIVE', 'CANCELLED') THEN
    RETURN NEW;
  ELSIF OLD.status = 'ACTIVE' AND NEW.status IN ('COMPLETED', 'TRANSFERRED', 'CANCELLED') THEN
    RETURN NEW;
  ELSIF OLD.status IN ('COMPLETED', 'TRANSFERRED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Illegal state transition: Sub-Vihar is terminal (%) and cannot transition to %', OLD.status, NEW.status;
  ELSE
    RAISE EXCEPTION 'Illegal Sub-Vihar state transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_subvihar_transition ON public.vihar_subsessions;
CREATE TRIGGER trg_check_subvihar_transition
BEFORE UPDATE OF status ON public.vihar_subsessions
FOR EACH ROW EXECUTE FUNCTION check_subvihar_state_transition();

-- 5. ATOMIC SUB-VIHAR HANDOVER STORED PROCEDURE (With Concurrency Row-Locking)
CREATE OR REPLACE FUNCTION execute_subvihar_handover(
  p_vihar_id UUID,
  p_current_sub_vihar_id UUID,
  p_new_sevak_id UUID,
  p_handover_lat DOUBLE PRECISION,
  p_handover_lng DOUBLE PRECISION,
  p_handover_location_name TEXT,
  p_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_vihar_record RECORD;
  v_current_subvihar RECORD;
  v_new_subvihar_id UUID;
  v_next_number INT;
  v_handover_id UUID;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  -- Lock parent Vihar record to prevent concurrent handovers
  SELECT * INTO v_vihar_record 
  FROM public.vihars 
  WHERE id = p_vihar_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent Vihar % not found', p_vihar_id;
  END IF;

  IF v_vihar_record.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Cannot execute handover on non-active Vihar (Status: %)', v_vihar_record.status;
  END IF;

  -- Lock current sub-vihar record
  SELECT * INTO v_current_subvihar
  FROM public.vihar_subsessions
  WHERE id = p_current_sub_vihar_id AND vihar_id = p_vihar_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current Sub-Vihar % not found', p_current_sub_vihar_id;
  END IF;

  IF v_current_subvihar.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Current Sub-Vihar is not ACTIVE (Status: %)', v_current_subvihar.status;
  END IF;

  -- Close any active hold on current sub-vihar
  UPDATE public.vihar_holds
  SET status = 'COMPLETED', hold_end = NOW(), notes = COALESCE(notes, '') || ' (Auto-ended due to duty handover)'
  WHERE sub_vihar_id = p_current_sub_vihar_id AND status = 'ACTIVE';

  -- 1. Complete current sub-vihar
  UPDATE public.vihar_subsessions
  SET status = 'TRANSFERRED', completed_at = NOW()
  WHERE id = p_current_sub_vihar_id;

  -- Determine next sub_vihar_number
  SELECT COALESCE(MAX(sub_vihar_number), 0) + 1 INTO v_next_number
  FROM public.vihar_subsessions
  WHERE vihar_id = p_vihar_id;

  -- 2. Create and activate the new sub-vihar segment
  v_new_subvihar_id := gen_random_uuid();
  INSERT INTO public.vihar_subsessions (
    id,
    vihar_id,
    sub_vihar_number,
    title,
    source_name,
    source_lat,
    source_lng,
    dest_name,
    dest_lat,
    dest_lng,
    status,
    started_at
  ) VALUES (
    v_new_subvihar_id,
    p_vihar_id,
    v_next_number,
    'Sub-Vihar ' || v_next_number || ': ' || COALESCE(p_handover_location_name, 'Duty Transfer'),
    p_handover_location_name,
    p_handover_lat,
    p_handover_lng,
    v_vihar_record.dest_name,
    v_vihar_record.dest_lat,
    v_vihar_record.dest_lng,
    'ACTIVE',
    NOW()
  );

  -- 3. Register participant for the new Sub-Vihar
  INSERT INTO public.vihar_participants (
    vihar_id,
    sub_vihar_id,
    user_id,
    role_in_group,
    joined_at,
    is_active
  ) VALUES (
    p_vihar_id,
    v_new_subvihar_id,
    p_new_sevak_id,
    'LEAD_SEVAK',
    NOW(),
    TRUE
  );

  -- 4. Record the handover event
  v_handover_id := gen_random_uuid();
  INSERT INTO public.vihar_handover (
    id,
    vihar_id,
    from_sub_vihar_id,
    to_sub_vihar_id,
    handed_over_by,
    accepted_by,
    location,
    notes,
    status,
    created_at
  ) VALUES (
    v_handover_id,
    p_vihar_id,
    p_current_sub_vihar_id,
    v_new_subvihar_id,
    COALESCE(v_caller_id, p_new_sevak_id),
    p_new_sevak_id,
    jsonb_build_object('lat', p_handover_lat, 'lng', p_handover_lng, 'name', p_handover_location_name),
    p_notes,
    'COMPLETED',
    NOW()
  );

  -- 5. Audit log entry
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity,
    entity_id,
    details
  ) VALUES (
    v_caller_id,
    'SUBVIHAR_HANDOVER_EXECUTED',
    'vihar_handover',
    v_handover_id::text,
    jsonb_build_object(
      'vihar_id', p_vihar_id,
      'from_sub_vihar_id', p_current_sub_vihar_id,
      'to_sub_vihar_id', v_new_subvihar_id,
      'new_sevak_id', p_new_sevak_id,
      'location', p_handover_location_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'handover_id', v_handover_id,
    'new_sub_vihar_id', v_new_subvihar_id,
    'sub_vihar_number', v_next_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. AUDIT TRIGGER FOR SENSITIVE SEVAK PROFILE VIEW (Privacy by Design)
CREATE OR REPLACE FUNCTION audit_sevak_profile_view(
  p_sevak_id UUID,
  p_reason TEXT DEFAULT 'Live Monitoring'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    'SEVAK_SENSITIVE_DATA_ACCESSED',
    'profiles',
    p_sevak_id::text,
    jsonb_build_object(
      'reason', p_reason,
      'timestamp', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
