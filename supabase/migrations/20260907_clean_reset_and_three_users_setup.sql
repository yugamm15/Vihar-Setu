-- ==============================================================================
-- JINAARYA VIHAR SETU — Complete Clean Reset & 3-User Bootstrap Setup
-- File: 20260907_clean_reset_and_three_users_setup.sql
-- ==============================================================================
-- 1. Sevak:       yugamkothari886@gmail.com   -> Role: SEVAK       (Accessed via OTP)
-- 2. Admin:       26bmiitmscit21@gmail.com     -> Role: ADMIN       (Accessed via OTP)
-- 3. Super Admin: viharsetu@jinaarya.com       -> Role: SUPER_ADMIN (Accessed via Password: ViharSetu@2026)
-- ==============================================================================

-- STEP 1: Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- STEP 2: Clean out all previous operational test data & dummy records
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
TRUNCATE TABLE public.administrators CASCADE;
TRUNCATE TABLE public.user_roles CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- STEP 3: Delete existing auth users (cascades to auth.identities)
DELETE FROM auth.users;

-- STEP 4: Ensure Master Roles exist in public.roles
INSERT INTO public.roles (name, description) VALUES
    ('SUPER_ADMIN', 'Super Administrator with full platform authority'),
    ('ADMIN', 'Area Administrator with volunteer management & vihar monitoring'),
    ('SEVAK', 'Volunteer accompanying Jain Sadhvijis on Vihar')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- STEP 5: Ensure public.areas has designated Administrator columns and seed areas
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_name TEXT DEFAULT 'Vihar Administrator';
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_phone TEXT DEFAULT '+919876543210';
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_email TEXT DEFAULT '26bmiitmscit21@gmail.com';

INSERT INTO public.areas (name, city, state, admin_name, admin_phone, admin_email, is_active) VALUES
    ('Surat Central & Rander', 'Surat', 'Gujarat', 'Vihar Administrator', '+919876543210', '26bmiitmscit21@gmail.com', true),
    ('Adajan & Pal',           'Surat', 'Gujarat', 'Vihar Administrator', '+919876543210', '26bmiitmscit21@gmail.com', true),
    ('Vesu & Althan',          'Surat', 'Gujarat', 'Vihar Administrator', '+919876543210', '26bmiitmscit21@gmail.com', true),
    ('Katargam & Varachha',    'Surat', 'Gujarat', 'Vihar Administrator', '+919876543210', '26bmiitmscit21@gmail.com', true),
    ('Gopipura & Athwa',       'Surat', 'Gujarat', 'Vihar Administrator', '+919876543210', '26bmiitmscit21@gmail.com', true)
ON CONFLICT (name) DO UPDATE SET
    admin_name  = EXCLUDED.admin_name,
    admin_phone = EXCLUDED.admin_phone,
    admin_email = EXCLUDED.admin_email;

-- STEP 6: Bootstrap the 3 User Accounts
DO $$
DECLARE
    super_admin_id UUID := gen_random_uuid();
    admin_id       UUID := gen_random_uuid();
    sevak_id       UUID := gen_random_uuid();

    role_super_admin_id INT;
    role_admin_id       INT;
    role_sevak_id       INT;

    default_area_id UUID;
BEGIN
    -- Fetch Role IDs
    SELECT id INTO role_super_admin_id FROM public.roles WHERE name = 'SUPER_ADMIN' LIMIT 1;
    SELECT id INTO role_admin_id       FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
    SELECT id INTO role_sevak_id       FROM public.roles WHERE name = 'SEVAK' LIMIT 1;

    -- Fetch an Area ID for Admin assignment
    SELECT id INTO default_area_id FROM public.areas WHERE name = 'Surat Central & Rander' LIMIT 1;

    -- -------------------------------------------------------------------------
    -- USER 1: SUPER ADMIN (viharsetu@jinaarya.com) - Password: ViharSetu@2026
    -- -------------------------------------------------------------------------
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        super_admin_id,
        'authenticated',
        'authenticated',
        'viharsetu@jinaarya.com',
        extensions.crypt('ViharSetu@2026', extensions.gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Super Administrator"}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

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
        super_admin_id,
        super_admin_id,
        format('{"sub":"%s","email":"%s"}', super_admin_id, 'viharsetu@jinaarya.com')::jsonb,
        'email',
        super_admin_id,
        NOW(),
        NOW(),
        NOW()
    );

    -- Super Admin Profile
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
        super_admin_id,
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
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        status = 'ACTIVE',
        updated_at = NOW();

    -- Super Admin Role
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (super_admin_id, role_super_admin_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;


    -- -------------------------------------------------------------------------
    -- USER 2: VIHAR ADMIN (26bmiitmscit21@gmail.com) - OTP Access
    -- -------------------------------------------------------------------------
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        admin_id,
        'authenticated',
        'authenticated',
        '26bmiitmscit21@gmail.com',
        '',
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Vihar Administrator"}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

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
        admin_id,
        admin_id,
        format('{"sub":"%s","email":"%s"}', admin_id, '26bmiitmscit21@gmail.com')::jsonb,
        'email',
        admin_id,
        NOW(),
        NOW(),
        NOW()
    );

    -- Admin Profile
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
        admin_id,
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
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        status = 'ACTIVE',
        updated_at = NOW();

    -- Admin Role
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (admin_id, role_admin_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Admin Area Assignment
    INSERT INTO public.administrators (user_id, area_id, permissions, is_active)
    VALUES (
        admin_id,
        default_area_id,
        '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": true}'::jsonb,
        true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        area_id = EXCLUDED.area_id,
        is_active = true,
        updated_at = NOW();


    -- -------------------------------------------------------------------------
    -- USER 3: VIHAR SEVIKA (yugamkothari886@gmail.com) - OTP Access
    -- -------------------------------------------------------------------------
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        sevak_id,
        'authenticated',
        'authenticated',
        'yugamkothari886@gmail.com',
        '',
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Yugam Kothari"}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

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
        sevak_id,
        sevak_id,
        format('{"sub":"%s","email":"%s"}', sevak_id, 'yugamkothari886@gmail.com')::jsonb,
        'email',
        sevak_id,
        NOW(),
        NOW(),
        NOW()
    );

    -- Sevika Profile
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
        sevak_id,
        'yugamkothari886@gmail.com',
        '+919979942197',
        'Yugam Kothari',
        'Surat',
        'Adajan & Pal',
        'B+',
        'Family Emergency Contact',
        '+919876543211',
        'ACTIVE',
        'gu',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        status = 'ACTIVE',
        updated_at = NOW();

    -- Sevak Role
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (sevak_id, role_sevak_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RAISE NOTICE 'Clean reset complete! 3 users created: Super Admin (viharsetu@jinaarya.com), Admin (26bmiitmscit21@gmail.com), Sevak (yugamkothari886@gmail.com).';
END $$;
