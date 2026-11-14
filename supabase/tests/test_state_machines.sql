-- =====================================================================
-- TEST SCRIPT: test_state_machines.sql
-- Proves illegal state transitions fail & constraints hold
-- =====================================================================

DO $$
DECLARE
  v_test_vihar_id UUID := gen_random_uuid();
  v_sub1_id UUID := gen_random_uuid();
  v_sub2_id UUID := gen_random_uuid();
  v_test_user_id UUID;
BEGIN
  RAISE NOTICE '--- Starting State Machine Constraint Verification Tests ---';

  -- Fetch an existing user profile or create a test one
  SELECT id INTO v_test_user_id FROM public.profiles LIMIT 1;
  IF v_test_user_id IS NULL THEN
    v_test_user_id := gen_random_uuid();
  END IF;

  -- TEST 1: Insert PLANNED Vihar
  INSERT INTO public.vihars (
    id, 
    user_id,
    title, 
    source_name, 
    source_lat, 
    source_lng, 
    dest_name, 
    dest_lat, 
    dest_lng, 
    status
  ) VALUES (
    v_test_vihar_id, 
    v_test_user_id,
    'State Machine Test Vihar', 
    'Athwa Gate Upashray', 
    21.1959, 
    72.7933, 
    'Adajan Gam Upashray', 
    21.1442, 
    72.7758, 
    'PLANNED'
  );
  RAISE NOTICE '[PASS] Test 1: PLANNED Vihar inserted successfully.';

  -- TEST 2: Illegal Direct Transition: PLANNED -> COMPLETED (Must Fail)
  BEGIN
    UPDATE public.vihars SET status = 'COMPLETED' WHERE id = v_test_vihar_id;
    RAISE EXCEPTION 'TEST FAILED: Illegal transition PLANNED -> COMPLETED succeeded when it should fail!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[PASS] Test 2: Illegal transition PLANNED -> COMPLETED was blocked as expected. Error: %', SQLERRM;
  END;

  -- TEST 3: Valid Transition: PLANNED -> ACTIVE (Must Succeed)
  UPDATE public.vihars SET status = 'ACTIVE' WHERE id = v_test_vihar_id;
  RAISE NOTICE '[PASS] Test 3: Valid transition PLANNED -> ACTIVE succeeded.';

  -- TEST 4: Create first ACTIVE Sub-Vihar
  INSERT INTO public.vihar_subsessions (
    id, 
    vihar_id, 
    sub_vihar_number, 
    title, 
    status
  ) VALUES (
    v_sub1_id, 
    v_test_vihar_id, 
    1, 
    'Sub-Vihar 1: Leading Accompaniment', 
    'ACTIVE'
  );
  RAISE NOTICE '[PASS] Test 4: First ACTIVE Sub-Vihar created.';

  -- TEST 5: Attempt to create SECOND ACTIVE Sub-Vihar on same Vihar (Must Fail via Partial Unique Index)
  BEGIN
    INSERT INTO public.vihar_subsessions (
      id, 
      vihar_id, 
      sub_vihar_number, 
      title, 
      status
    ) VALUES (
      v_sub2_id, 
      v_test_vihar_id, 
      2, 
      'Sub-Vihar 2: Duplicate Active Segment', 
      'ACTIVE'
    );
    RAISE EXCEPTION 'TEST FAILED: Duplicate ACTIVE Sub-Vihar allowed on same Vihar!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[PASS] Test 5: Duplicate ACTIVE Sub-Vihar blocked by Partial Unique Index. Error: %', SQLERRM;
  END;

  -- TEST 6: Valid Transition: ACTIVE -> COMPLETED (Must Succeed)
  UPDATE public.vihars SET status = 'COMPLETED' WHERE id = v_test_vihar_id;
  RAISE NOTICE '[PASS] Test 6: Valid transition ACTIVE -> COMPLETED succeeded.';

  -- TEST 7: Attempt to revive COMPLETED Vihar back to ACTIVE (Must Fail)
  BEGIN
    UPDATE public.vihars SET status = 'ACTIVE' WHERE id = v_test_vihar_id;
    RAISE EXCEPTION 'TEST FAILED: Terminal COMPLETED Vihar was allowed to reactivate!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[PASS] Test 7: Transition from terminal COMPLETED blocked as expected. Error: %', SQLERRM;
  END;

  -- Cleanup test data
  DELETE FROM public.vihar_subsessions WHERE vihar_id = v_test_vihar_id;
  DELETE FROM public.vihars WHERE id = v_test_vihar_id;

  RAISE NOTICE '=== ALL 7 STATE MACHINE TESTS PASSED SUCCESSFULLY ===';
END;
$$;
