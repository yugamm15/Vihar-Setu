-- ==============================================================================
-- JINAARYA VIHAR SETU — 3 Existing Users Configuration & 1 Area Allocation
-- File: 20260907_clean_reset_and_three_users_setup.sql
-- ==============================================================================
-- 1. Super Admin: viharsetu@jinaarya.com   -> Role: SUPER_ADMIN (Password: ViharSetu@2026)
-- 2. Vihar Admin: 26bmiitmscit21@gmail.com -> Role: ADMIN       (OTP Access) - ALLOCATED 1 AREA
-- 3. Sevika:      yugamkothari886@gmail.com -> Role: SEVAK       (OTP Access)
-- ==============================================================================

-- STEP 1: Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- STEP 2: Wipe out old operational test data (journeys, locations, emergencies, logs)
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.emergency_attempts CASCADE;
TRUNCATE TABLE public.emergencies CASCADE;
TRUNCATE TABLE public.safety_checks CASCADE;
TRUNCATE TABLE public.route_events CASCADE;
TRUNCATE TABLE public.vihar_handover CASCADE;
TRUNCATE TABLE public.vihar_holds CASCADE;
TRUNCATE TABLE public.vihar_locations CASCADE;
TRUNCATE TABLE public.vihar_participants CASCADE;
TRUNCATE TABLE public.vihar_subsessions CASCADE;
TRUNCATE TABLE public.vihars CASCADE;

-- STEP 3: Ensure Master Roles exist in public.roles
INSERT INTO public.roles (name, description) VALUES
    ('SUPER_ADMIN', 'Super Administrator with full platform authority'),
    ('ADMIN', 'Area Administrator with volunteer management & vihar monitoring'),
    ('SEVAK', 'Volunteer accompanying Jain Sadhvijis on Vihar')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- STEP 4: Ensure public.areas has designated Administrator columns
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_name TEXT DEFAULT 'Vihar Administrator';
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_phone TEXT DEFAULT '+919876543210';
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_email TEXT DEFAULT '26bmiitmscit21@gmail.com';

-- STEP 5: Configure the 3 Existing Users & Allocate Exactly 1 Area
DO $$
DECLARE
    super_admin_uid UUID;
    admin_uid       UUID;
    sevak_uid       UUID;

    role_super_admin_id INT;
    role_admin_id       INT;
    role_sevak_id       INT;

    single_area_id  UUID;
BEGIN
    -- 1. Fetch User IDs from existing auth.users
    SELECT id INTO super_admin_uid FROM auth.users WHERE email = 'viharsetu@jinaarya.com' LIMIT 1;
    SELECT id INTO admin_uid       FROM auth.users WHERE email = '26bmiitmscit21@gmail.com' LIMIT 1;
    SELECT id INTO sevak_uid       FROM auth.users WHERE email = 'yugamkothari886@gmail.com' LIMIT 1;

    -- Guard: verify users exist in auth.users
    IF super_admin_uid IS NULL OR admin_uid IS NULL OR sevak_uid IS NULL THEN
        RAISE EXCEPTION 'One or more of the 3 users is missing in auth.users. Please verify emails.';
    END IF;

    -- 2. Fetch Role IDs
    SELECT id INTO role_super_admin_id FROM public.roles WHERE name = 'SUPER_ADMIN' LIMIT 1;
    SELECT id INTO role_admin_id       FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
    SELECT id INTO role_sevak_id       FROM public.roles WHERE name = 'SEVAK' LIMIT 1;

    -- 3. Set Password for Super Admin (ViharSetu@2026) and confirm emails
    UPDATE auth.users
    SET encrypted_password = extensions.crypt('ViharSetu@2026', extensions.gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = super_admin_uid;

    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id IN (admin_uid, sevak_uid);

    -- Ensure auth.identities exists for password login
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        super_admin_uid,
        super_admin_uid,
        format('{"sub":"%s","email":"%s"}', super_admin_uid, 'viharsetu@jinaarya.com')::jsonb,
        'email',
        super_admin_uid,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

    -- 4. Create / Ensure EXACTLY ONE Area allocated to 26bmiitmscit21@gmail.com
    INSERT INTO public.areas (name, city, state, admin_name, admin_phone, admin_email, is_active)
    VALUES (
        'Surat Central & Rander',
        'Surat',
        'Gujarat',
        'Vihar Administrator',
        '+919876543210',
        '26bmiitmscit21@gmail.com',
        true
    )
    ON CONFLICT (name) DO UPDATE SET
        admin_name  = 'Vihar Administrator',
        admin_phone = '+919876543210',
        admin_email = '26bmiitmscit21@gmail.com',
        is_active   = true
    RETURNING id INTO single_area_id;

    IF single_area_id IS NULL THEN
        SELECT id INTO single_area_id FROM public.areas WHERE name = 'Surat Central & Rander' LIMIT 1;
    END IF;

    -- Remove any extra/unallocated areas so ONLY this 1 area exists
    DELETE FROM public.areas WHERE id != single_area_id;

    -- 5. Link Admin 26 to this ONE allocated area
    DELETE FROM public.administrators;
    INSERT INTO public.administrators (user_id, area_id, permissions, is_active)
    VALUES (
        admin_uid,
        single_area_id,
        '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": true}'::jsonb,
        true
    );

    -- 6. Upsert Profiles for the 3 Users
    -- 6A. Super Admin Profile
    INSERT INTO public.profiles (
        id,
        email,
        phone,
        full_name,
        city,
        area,
        status,
        preferred_language,
        created_at,
        updated_at
    )
    VALUES (
        super_admin_uid,
        'viharsetu@jinaarya.com',
        '+919876500001',
        'Super Administrator',
        'Surat',
        'Surat Central & Rander',
        'ACTIVE',
        'gu',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email     = EXCLUDED.email,
        full_name = 'Super Administrator',
        status    = 'ACTIVE',
        updated_at = NOW();

    -- 6B. Vihar Admin Profile (Allocated to Surat Central & Rander)
    INSERT INTO public.profiles (
        id,
        email,
        phone,
        full_name,
        city,
        area,
        status,
        preferred_language,
        created_at,
        updated_at
    )
    VALUES (
        admin_uid,
        '26bmiitmscit21@gmail.com',
        '+919876543210',
        'Vihar Administrator',
        'Surat',
        'Surat Central & Rander',
        'ACTIVE',
        'gu',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email     = EXCLUDED.email,
        full_name = 'Vihar Administrator',
        area      = 'Surat Central & Rander',
        status    = 'ACTIVE',
        updated_at = NOW();

    -- 6C. Vihar Sevika Profile (Yugam Kothari)
    INSERT INTO public.profiles (
        id,
        email,
        phone,
        full_name,
        city,
        area,
        blood_group,
        emergency_contact_name,
        emergency_contact_phone,
        status,
        preferred_language,
        created_at,
        updated_at
    )
    VALUES (
        sevak_uid,
        'yugamkothari886@gmail.com',
        '+919979942197',
        'Yugam Kothari',
        'Surat',
        'Surat Central & Rander',
        'B+',
        'Family Emergency Contact',
        '+919876543211',
        'ACTIVE',
        'gu',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email                   = EXCLUDED.email,
        full_name               = 'Yugam Kothari',
        phone                   = '+919979942197',
        area                    = 'Surat Central & Rander',
        blood_group             = 'B+',
        emergency_contact_name  = 'Family Emergency Contact',
        emergency_contact_phone = '+919876543211',
        status                  = 'ACTIVE',
        updated_at              = NOW();

    -- 7. Configure Exact Roles in public.user_roles
    DELETE FROM public.user_roles WHERE user_id IN (super_admin_uid, admin_uid, sevak_uid);

    INSERT INTO public.user_roles (user_id, role_id) VALUES
        (super_admin_uid, role_super_admin_id),
        (admin_uid,       role_admin_id),
        (sevak_uid,       role_sevak_id);

    -- 8. Clean up any leftover profiles that are not these 3 users
    DELETE FROM public.profiles WHERE id NOT IN (super_admin_uid, admin_uid, sevak_uid);

    RAISE NOTICE 'SUCCESS: Configured 3 users. Only 1 area (Surat Central & Rander) created and allocated to 26bmiitmscit21@gmail.com!';
END $$;
