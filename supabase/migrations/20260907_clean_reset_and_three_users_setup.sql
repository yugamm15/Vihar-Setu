-- ==============================================================================
-- JINAARYA VIHAR SETU — Master Database Setup for All 7 Authentication Users
-- File: 20260907_clean_reset_and_three_users_setup.sql
-- ==============================================================================
-- SUPER ADMIN (1 User - Password Login):
-- 1. viharsetu@jinaarya.com        -> SUPER_ADMIN
--
-- AREA ADMINISTRATORS (3 Users - OTP Login, 1 Area each):
-- 2. 26bmiitmscit21@gmail.com      -> ADMIN (Area: Surat Central & Rander)
-- 3. 23bmiit091@gmail.com          -> ADMIN (Area: Adajan & Pal)
-- 4. 26bmiitmscit28@gmail.com      -> ADMIN (Area: Vesu & Althan)
--
-- VIHAR SEVIKAS / VOLUNTEERS (3 Users - OTP Login):
-- 5. yugamkothari886@gmail.com     -> SEVAK (Yugam Kothari)
-- 6. nevilshah587@gmail.com        -> SEVAK (Nevil Shah)
-- 7. jainishpatel1972@gmail.com    -> SEVAK (Jainish Patel)
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

-- STEP 4: Ensure public.areas has designated Administrator columns & unique index
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_name TEXT DEFAULT 'Vihar Administrator';
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_phone TEXT DEFAULT '+919876543210';
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS admin_email TEXT DEFAULT '26bmiitmscit21@gmail.com';
CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_name_unique ON public.areas(name);

-- STEP 5: Configure the 7 Existing Auth Users, Roles, Profiles & Areas
DO $$
DECLARE
    -- Super Admin
    super_admin_uid   UUID;

    -- 3 Area Admins
    admin_21_uid      UUID;
    admin_23_uid      UUID;
    admin_28_uid      UUID;

    -- 3 Sevaks
    sevak_yugam_uid   UUID;
    sevak_nevil_uid   UUID;
    sevak_jainish_uid UUID;

    -- Role IDs
    role_super_admin_id INT;
    role_admin_id       INT;
    role_sevak_id       INT;

    -- Area IDs
    area_central_id UUID;
    area_adajan_id  UUID;
    area_vesu_id    UUID;
BEGIN
    -- 1. Fetch User IDs from auth.users
    SELECT id INTO super_admin_uid   FROM auth.users WHERE email = 'viharsetu@jinaarya.com' LIMIT 1;
    SELECT id INTO admin_21_uid      FROM auth.users WHERE email = '26bmiitmscit21@gmail.com' LIMIT 1;
    SELECT id INTO admin_23_uid      FROM auth.users WHERE email = '23bmiit091@gmail.com' LIMIT 1;
    SELECT id INTO admin_28_uid      FROM auth.users WHERE email = '26bmiitmscit28@gmail.com' LIMIT 1;
    SELECT id INTO sevak_yugam_uid   FROM auth.users WHERE email = 'yugamkothari886@gmail.com' LIMIT 1;
    SELECT id INTO sevak_nevil_uid   FROM auth.users WHERE email = 'nevilshah587@gmail.com' LIMIT 1;
    SELECT id INTO sevak_jainish_uid FROM auth.users WHERE email = 'jainishpatel1972@gmail.com' LIMIT 1;

    -- Guard: Check missing users
    IF super_admin_uid IS NULL THEN RAISE EXCEPTION 'User viharsetu@jinaarya.com not found in auth.users.'; END IF;
    IF admin_21_uid IS NULL THEN RAISE EXCEPTION 'User 26bmiitmscit21@gmail.com not found in auth.users.'; END IF;
    IF admin_23_uid IS NULL THEN RAISE EXCEPTION 'User 23bmiit091@gmail.com not found in auth.users.'; END IF;
    IF admin_28_uid IS NULL THEN RAISE EXCEPTION 'User 26bmiitmscit28@gmail.com not found in auth.users.'; END IF;
    IF sevak_yugam_uid IS NULL THEN RAISE EXCEPTION 'User yugamkothari886@gmail.com not found in auth.users.'; END IF;
    IF sevak_nevil_uid IS NULL THEN RAISE EXCEPTION 'User nevilshah587@gmail.com not found in auth.users.'; END IF;
    IF sevak_jainish_uid IS NULL THEN RAISE EXCEPTION 'User jainishpatel1972@gmail.com not found in auth.users.'; END IF;

    -- 2. Fetch Role IDs
    SELECT id INTO role_super_admin_id FROM public.roles WHERE name = 'SUPER_ADMIN' LIMIT 1;
    SELECT id INTO role_admin_id       FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
    SELECT id INTO role_sevak_id       FROM public.roles WHERE name = 'SEVAK' LIMIT 1;

    -- 3. Confirm emails in auth.users (Leaves passwords completely untouched)
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id IN (
        super_admin_uid, admin_21_uid, admin_23_uid, admin_28_uid,
        sevak_yugam_uid, sevak_nevil_uid, sevak_jainish_uid
    );

    -- 4. Create / Ensure the 3 Operational Areas with Designated Admins
    -- Area 1: Surat Central & Rander -> Admin 21
    SELECT id INTO area_central_id FROM public.areas WHERE name = 'Surat Central & Rander' LIMIT 1;
    IF area_central_id IS NULL THEN
        INSERT INTO public.areas (name, city, state, admin_name, admin_phone, admin_email, is_active)
        VALUES ('Surat Central & Rander', 'Surat', 'Gujarat', 'Admin 21', '+919876543210', '26bmiitmscit21@gmail.com', true)
        RETURNING id INTO area_central_id;
    ELSE
        UPDATE public.areas
        SET admin_name  = 'Admin 21',
            admin_phone = '+919876543210',
            admin_email = '26bmiitmscit21@gmail.com',
            is_active   = true
        WHERE id = area_central_id;
    END IF;

    -- Area 2: Adajan & Pal -> Admin 23
    SELECT id INTO area_adajan_id FROM public.areas WHERE name = 'Adajan & Pal' LIMIT 1;
    IF area_adajan_id IS NULL THEN
        INSERT INTO public.areas (name, city, state, admin_name, admin_phone, admin_email, is_active)
        VALUES ('Adajan & Pal', 'Surat', 'Gujarat', 'Admin 23', '+919876543223', '23bmiit091@gmail.com', true)
        RETURNING id INTO area_adajan_id;
    ELSE
        UPDATE public.areas
        SET admin_name  = 'Admin 23',
            admin_phone = '+919876543223',
            admin_email = '23bmiit091@gmail.com',
            is_active   = true
        WHERE id = area_adajan_id;
    END IF;

    -- Area 3: Vesu & Althan -> Admin 28
    SELECT id INTO area_vesu_id FROM public.areas WHERE name = 'Vesu & Althan' LIMIT 1;
    IF area_vesu_id IS NULL THEN
        INSERT INTO public.areas (name, city, state, admin_name, admin_phone, admin_email, is_active)
        VALUES ('Vesu & Althan', 'Surat', 'Gujarat', 'Admin 28', '+919876543228', '26bmiitmscit28@gmail.com', true)
        RETURNING id INTO area_vesu_id;
    ELSE
        UPDATE public.areas
        SET admin_name  = 'Admin 28',
            admin_phone = '+919876543228',
            admin_email = '26bmiitmscit28@gmail.com',
            is_active   = true
        WHERE id = area_vesu_id;
    END IF;

    -- Clean up any extra/unallocated areas so ONLY these 3 operational areas exist
    DELETE FROM public.areas WHERE id NOT IN (area_central_id, area_adajan_id, area_vesu_id);

    -- 5. Allocate Each Admin to their Respective Area in public.administrators
    DELETE FROM public.administrators;

    INSERT INTO public.administrators (user_id, area_id, permissions, is_active) VALUES
        (admin_21_uid, area_central_id, '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": true}'::jsonb, true),
        (admin_23_uid, area_adajan_id,  '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": true}'::jsonb, true),
        (admin_28_uid, area_vesu_id,    '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": true}'::jsonb, true);

    -- 6. Upsert Profiles for all 7 Users
    -- 6A. Super Admin Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, status, preferred_language, created_at, updated_at
    )
    VALUES (
        super_admin_uid, 'viharsetu@jinaarya.com', '+919876500001', 'Super Administrator', 'Surat', 'Surat Central & Rander', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email     = EXCLUDED.email,
        full_name = 'Super Administrator',
        status    = 'ACTIVE',
        updated_at = NOW();

    -- 6B. Admin 21 Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, status, preferred_language, created_at, updated_at
    )
    VALUES (
        admin_21_uid, '26bmiitmscit21@gmail.com', '+919876543210', 'Admin 21', 'Surat', 'Surat Central & Rander', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email     = EXCLUDED.email,
        full_name = 'Admin 21',
        area      = 'Surat Central & Rander',
        status    = 'ACTIVE',
        updated_at = NOW();

    -- 6C. Admin 23 Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, status, preferred_language, created_at, updated_at
    )
    VALUES (
        admin_23_uid, '23bmiit091@gmail.com', '+919876543223', 'Admin 23', 'Surat', 'Adajan & Pal', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email     = EXCLUDED.email,
        full_name = 'Admin 23',
        area      = 'Adajan & Pal',
        status    = 'ACTIVE',
        updated_at = NOW();

    -- 6D. Admin 28 Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, status, preferred_language, created_at, updated_at
    )
    VALUES (
        admin_28_uid, '26bmiitmscit28@gmail.com', '+919876543228', 'Admin 28', 'Surat', 'Vesu & Althan', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email     = EXCLUDED.email,
        full_name = 'Admin 28',
        area      = 'Vesu & Althan',
        status    = 'ACTIVE',
        updated_at = NOW();

    -- 6E. Sevak Yugam Kothari Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, blood_group, emergency_contact_name, emergency_contact_phone, status, preferred_language, created_at, updated_at
    )
    VALUES (
        sevak_yugam_uid, 'yugamkothari886@gmail.com', '+919979942197', 'Yugam Kothari', 'Surat', 'Surat Central & Rander', 'B+', 'Family Emergency Contact', '+919876543211', 'ACTIVE', 'gu', NOW(), NOW()
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

    -- 6F. Sevak Nevil Shah Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, blood_group, emergency_contact_name, emergency_contact_phone, status, preferred_language, created_at, updated_at
    )
    VALUES (
        sevak_nevil_uid, 'nevilshah587@gmail.com', '+919876543230', 'Nevil Shah', 'Surat', 'Adajan & Pal', 'A+', 'Emergency Contact', '+919876543211', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email                   = EXCLUDED.email,
        full_name               = 'Nevil Shah',
        phone                   = '+919876543230',
        area                    = 'Adajan & Pal',
        blood_group             = 'A+',
        emergency_contact_name  = 'Emergency Contact',
        emergency_contact_phone = '+919876543211',
        status                  = 'ACTIVE',
        updated_at              = NOW();

    -- 6G. Sevak Jainish Patel Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, blood_group, emergency_contact_name, emergency_contact_phone, status, preferred_language, created_at, updated_at
    )
    VALUES (
        sevak_jainish_uid, 'jainishpatel1972@gmail.com', '+919876543231', 'Jainish Patel', 'Surat', 'Vesu & Althan', 'O+', 'Emergency Contact', '+919876543211', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email                   = EXCLUDED.email,
        full_name               = 'Jainish Patel',
        phone                   = '+919876543231',
        area                    = 'Vesu & Althan',
        blood_group             = 'O+',
        emergency_contact_name  = 'Emergency Contact',
        emergency_contact_phone = '+919876543211',
        status                  = 'ACTIVE',
        updated_at              = NOW();

    -- 7. Configure Roles in public.user_roles
    DELETE FROM public.user_roles WHERE user_id IN (
        super_admin_uid, admin_21_uid, admin_23_uid, admin_28_uid,
        sevak_yugam_uid, sevak_nevil_uid, sevak_jainish_uid
    );

    INSERT INTO public.user_roles (user_id, role_id) VALUES
        (super_admin_uid,   role_super_admin_id),
        (admin_21_uid,      role_admin_id),
        (admin_23_uid,      role_admin_id),
        (admin_28_uid,      role_admin_id),
        (sevak_yugam_uid,   role_sevak_id),
        (sevak_nevil_uid,   role_sevak_id),
        (sevak_jainish_uid, role_sevak_id);

    -- 8. Clean up any leftover profiles that are not these 7 users
    DELETE FROM public.profiles WHERE id NOT IN (
        super_admin_uid, admin_21_uid, admin_23_uid, admin_28_uid,
        sevak_yugam_uid, sevak_nevil_uid, sevak_jainish_uid
    );

    RAISE NOTICE 'SUCCESS: Successfully configured all 7 users (1 Super Admin, 3 Area Admins, 3 Sevaks)!';
END $$;
