-- Repair schema values used by the handover, temporary hold, and SOS flows.
-- This migration is safe to run after the initial schema migrations.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'safety_status_type' AND e.enumlabel = 'HOLD'
  ) THEN
    ALTER TYPE public.safety_status_type ADD VALUE 'HOLD';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'route_event_type' AND e.enumlabel = 'HOLD_STARTED'
  ) THEN
    ALTER TYPE public.route_event_type ADD VALUE 'HOLD_STARTED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'route_event_type' AND e.enumlabel = 'HOLD_ENDED'
  ) THEN
    ALTER TYPE public.route_event_type ADD VALUE 'HOLD_ENDED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'route_event_type' AND e.enumlabel = 'SAFETY_CHECK_CONFIRMED'
  ) THEN
    ALTER TYPE public.route_event_type ADD VALUE 'SAFETY_CHECK_CONFIRMED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'route_event_type' AND e.enumlabel = 'STATIONARY_UNRESPONSIVE'
  ) THEN
    ALTER TYPE public.route_event_type ADD VALUE 'STATIONARY_UNRESPONSIVE';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'route_event_type' AND e.enumlabel = 'POLICE_CALL'
  ) THEN
    ALTER TYPE public.route_event_type ADD VALUE 'POLICE_CALL';
  END IF;
END
$$;

-- Reinstall the completion transition guard in case the earlier repair
-- migration was not applied to an existing project.
CREATE OR REPLACE FUNCTION public.check_vihar_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  ELSIF OLD.status = 'PLANNED' AND NEW.status IN ('ACTIVE', 'CANCELLED') THEN
    RETURN NEW;
  ELSIF OLD.status = 'ACTIVE' AND NEW.status IN ('COMPLETED', 'CANCELLED') THEN
    RETURN NEW;
  ELSIF OLD.status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Illegal state transition: Vihar is terminal (%) and cannot transition to %', OLD.status, NEW.status;
  ELSE
    RAISE EXCEPTION 'Illegal Vihar state transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_vihar_transition ON public.vihars;
CREATE TRIGGER trg_check_vihar_transition
BEFORE UPDATE OF status ON public.vihars
FOR EACH ROW EXECUTE FUNCTION public.check_vihar_state_transition();

-- The state-machine migration used column names from an older schema revision.
-- Keep the RPC aligned with the columns created in 20260904.
CREATE OR REPLACE FUNCTION public.execute_subvihar_handover(
  p_vihar_id UUID,
  p_current_sub_vihar_id UUID,
  p_new_sevak_id UUID,
  p_handover_lat DOUBLE PRECISION,
  p_handover_lng DOUBLE PRECISION,
  p_handover_location_name TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vihar RECORD;
  v_current RECORD;
  v_new_sub_vihar_id UUID := gen_random_uuid();
  v_next_number INT;
  v_handover_id UUID := gen_random_uuid();
  v_caller_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_vihar
  FROM public.vihars
  WHERE id = p_vihar_id
  FOR UPDATE;

  IF NOT FOUND OR v_vihar.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Cannot hand over a Vihar that is not active';
  END IF;

  SELECT * INTO v_current
  FROM public.vihar_subsessions
  WHERE id = p_current_sub_vihar_id AND vihar_id = p_vihar_id
  FOR UPDATE;

  IF NOT FOUND OR v_current.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Current Sub-Vihar is not active';
  END IF;

  UPDATE public.vihar_holds
  SET status = 'COMPLETED', hold_end = NOW()
  WHERE sub_vihar_id = p_current_sub_vihar_id AND status = 'ACTIVE';

  UPDATE public.vihar_subsessions
  SET status = 'TRANSFERRED', completed_at = NOW(), updated_at = NOW()
  WHERE id = p_current_sub_vihar_id;

  SELECT COALESCE(MAX(sub_vihar_number), 0) + 1
  INTO v_next_number
  FROM public.vihar_subsessions
  WHERE vihar_id = p_vihar_id;

  INSERT INTO public.vihar_subsessions (
    id, vihar_id, sub_vihar_number, title, source_name, source_lat,
    source_lng, dest_name, dest_lat, dest_lng, status, started_at, notes
  )
  VALUES (
    v_new_sub_vihar_id, p_vihar_id, v_next_number,
    'Sub-Vihar ' || v_next_number || ': ' || COALESCE(p_handover_location_name, 'Duty Transfer'),
    p_handover_location_name, p_handover_lat, p_handover_lng,
    v_vihar.dest_name, v_vihar.dest_lat, v_vihar.dest_lng,
    'ACTIVE', NOW(), p_notes
  );

  INSERT INTO public.vihar_participants (
    vihar_id, sub_vihar_id, user_id, role, is_current_responsible, joined_at
  )
  VALUES (p_vihar_id, v_new_sub_vihar_id, p_new_sevak_id, 'LEAD_SEVAK', TRUE, NOW());

  INSERT INTO public.vihar_handover (
    id, vihar_id, from_sub_vihar_id, to_sub_vihar_id, handed_over_by,
    handed_over_to, next_sevak_name, handover_location_name, handover_lat,
    handover_lng, handover_time, notes, status
  )
  SELECT
    v_handover_id, p_vihar_id, p_current_sub_vihar_id, v_new_sub_vihar_id,
    COALESCE(v_caller_id, p_new_sevak_id), p_new_sevak_id,
    p.full_name, p_handover_location_name, p_handover_lat, p_handover_lng,
    NOW(), p_notes, 'COMPLETED'
  FROM public.profiles p
  WHERE p.id = p_new_sevak_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'handover_id', v_handover_id,
    'new_sub_vihar_id', v_new_sub_vihar_id,
    'sub_vihar_number', v_next_number
  );
END;
$$;

COMMIT;
