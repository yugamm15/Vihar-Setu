-- Fix completion failures caused by comparing vihar_status_type with the
-- unsupported PAUSED enum value.

BEGIN;

CREATE OR REPLACE FUNCTION check_vihar_state_transition()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

COMMIT;
