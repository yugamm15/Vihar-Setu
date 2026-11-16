-- ==============================================================================
-- JINAARYA VIHAR SETU — Configure 4 New Users: 2 Admins & 2 Sevaks
-- File: 20260908_add_four_users_two_admins_two_sevaks.sql
-- ==============================================================================
-- 1. Admin (23): 23bmiit091@gmail.com       -> Role: ADMIN (Assigned to: Adajan & Pal)
-- 2. Admin (28): 26bmiitmscit28@gmail.com   -> Role: ADMIN (Assigned to: Vesu & Althan)
-- 3. Sevak:      nevilshah587@gmail.com     -> Role: SEVAK (Nevil Shah)
-- 4. Sevak:      jainishpatel1972@gmail.com -> Role: SEVAK (Jainish Patel)
-- ==============================================================================

DO $$
DECLARE
    -- User IDs from auth.users
    admin_23_uid      UUID;
    admin_28_uid      UUID;
    sevak_nevil_uid   UUID;
    sevak_jainish_uid UUID;

    -- Roles
    role_admin_id INT;
    role_sevak_id INT;

    -- Area IDs
    area_adajan_id UUID;
    area_vesu_id   UUID;
BEGIN
    -- 1. Fetch User IDs from auth.users
    SELECT id INTO admin_23_uid      FROM auth.users WHERE email = '23bmiit091@gmail.com' LIMIT 1;
    SELECT id INTO admin_28_uid      FROM auth.users WHERE email = '26bmiitmscit28@gmail.com' LIMIT 1;
    SELECT id INTO sevak_nevil_uid   FROM auth.users WHERE email = 'nevilshah587@gmail.com' LIMIT 1;
    SELECT id INTO sevak_jainish_uid FROM auth.users WHERE email = 'jainishpatel1972@gmail.com' LIMIT 1;

    -- Guard: verify all 4 users exist
    IF admin_23_uid IS NULL THEN
        RAISE EXCEPTION 'User 23bmiit091@gmail.com not found in auth.users. Please create it in Supabase Auth first.';
    END IF;
    IF admin_28_uid IS NULL THEN
        RAISE EXCEPTION 'User 26bmiitmscit28@gmail.com not found in auth.users. Please create it in Supabase Auth first.';
    END IF;
    IF sevak_nevil_uid IS NULL THEN
        RAISE EXCEPTION 'User nevilshah587@gmail.com not found in auth.users. Please create it in Supabase Auth first.';
    END IF;
    IF sevak_jainish_uid IS NULL THEN
        RAISE EXCEPTION 'User jainishpatel1972@gmail.com not found in auth.users. Please create it in Supabase Auth first.';
    END IF;

    -- 2. Fetch Role IDs
    SELECT id INTO role_admin_id FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
    SELECT id INTO role_sevak_id FROM public.roles WHERE name = 'SEVAK' LIMIT 1;

    -- 3. Confirm emails in auth.users so OTP login works immediately
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id IN (admin_23_uid, admin_28_uid, sevak_nevil_uid, sevak_jainish_uid);

    -- 4. Create / Ensure Operational Areas for the new Admins
    -- Area for Admin 23: Adajan & Pal
    SELECT id INTO area_adajan_id FROM public.areas WHERE name = 'Adajan & Pal' LIMIT 1;
    IF area_adajan_id IS NULL THEN
        INSERT INTO public.areas (name, city, state, admin_name, admin_phone, admin_email, is_active)
        VALUES ('Adajan & Pal', 'Surat', 'Gujarat', 'Admin (23)', '+919876543223', '23bmiit091@gmail.com', true)
        RETURNING id INTO area_adajan_id;
    ELSE
        UPDATE public.areas
        SET admin_name  = 'Admin (23)',
            admin_phone = '+919876543223',
            admin_email = '23bmiit091@gmail.com',
            is_active   = true
        WHERE id = area_adajan_id;
    END IF;

    -- Area for Admin 28: Vesu & Althan
    SELECT id INTO area_vesu_id FROM public.areas WHERE name = 'Vesu & Althan' LIMIT 1;
    IF area_vesu_id IS NULL THEN
        INSERT INTO public.areas (name, city, state, admin_name, admin_phone, admin_email, is_active)
        VALUES ('Vesu & Althan', 'Surat', 'Gujarat', 'Admin (28)', '+919876543228', '26bmiitmscit28@gmail.com', true)
        RETURNING id INTO area_vesu_id;
    ELSE
        UPDATE public.areas
        SET admin_name  = 'Admin (28)',
            admin_phone = '+919876543228',
            admin_email = '26bmiitmscit28@gmail.com',
            is_active   = true
        WHERE id = area_vesu_id;
    END IF;

    -- 5. Upsert Profiles for the 4 Users
    -- 5A. Admin 23 Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, status, preferred_language, created_at, updated_at
    )
    VALUES (
        admin_23_uid, '23bmiit091@gmail.com', '+919876543223', 'Admin 23', 'Surat', 'Adajan & Pal', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        full_name  = COALESCE(NULLIF(public.profiles.full_name, ''), 'Admin 23'),
        area       = 'Adajan & Pal',
        status     = 'ACTIVE',
        updated_at = NOW();

    -- 5B. Admin 28 Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, status, preferred_language, created_at, updated_at
    )
    VALUES (
        admin_28_uid, '26bmiitmscit28@gmail.com', '+919876543228', 'Admin 28', 'Surat', 'Vesu & Althan', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        full_name  = COALESCE(NULLIF(public.profiles.full_name, ''), 'Admin 28'),
        area       = 'Vesu & Althan',
        status     = 'ACTIVE',
        updated_at = NOW();

    -- 5C. Sevak Nevil Shah Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, blood_group, emergency_contact_name, emergency_contact_phone, status, preferred_language, created_at, updated_at
    )
    VALUES (
        sevak_nevil_uid, 'nevilshah587@gmail.com', '+919876543230', 'Nevil Shah', 'Surat', 'Adajan & Pal', 'A+', 'Emergency Contact', '+919876543211', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        full_name  = COALESCE(NULLIF(public.profiles.full_name, ''), 'Nevil Shah'),
        status     = 'ACTIVE',
        updated_at = NOW();

    -- 5D. Sevak Jainish Patel Profile
    INSERT INTO public.profiles (
        id, email, phone, full_name, city, area, blood_group, emergency_contact_name, emergency_contact_phone, status, preferred_language, created_at, updated_at
    )
    VALUES (
        sevak_jainish_uid, 'jainishpatel1972@gmail.com', '+919876543231', 'Jainish Patel', 'Surat', 'Vesu & Althan', 'O+', 'Emergency Contact', '+919876543211', 'ACTIVE', 'gu', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        full_name  = COALESCE(NULLIF(public.profiles.full_name, ''), 'Jainish Patel'),
        status     = 'ACTIVE',
        updated_at = NOW();

    -- 6. Assign Roles in public.user_roles
    DELETE FROM public.user_roles WHERE user_id IN (admin_23_uid, admin_28_uid, sevak_nevil_uid, sevak_jainish_uid);

    INSERT INTO public.user_roles (user_id, role_id) VALUES
        (admin_23_uid,      role_admin_id),
        (admin_28_uid,      role_admin_id),
        (sevak_nevil_uid,   role_sevak_id),
        (sevak_jainish_uid, role_sevak_id);

    -- 7. Link the 2 new Admins to their respective Areas in public.administrators
    INSERT INTO public.administrators (user_id, area_id, permissions, is_active)
    VALUES
        (admin_23_uid, area_adajan_id, '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": true}'::jsonb, true),
        (admin_28_uid, area_vesu_id,   '{"can_manage_sevaks": true, "can_monitor_vihars": true, "can_call_police": true, "can_edit_area": true}'::jsonb, true)
    ON CONFLICT (user_id) DO UPDATE SET
        area_id   = EXCLUDED.area_id,
        is_active = true,
        updated_at = NOW();

    RAISE NOTICE 'SUCCESS: Configured 2 new Admins (23 & 28) and 2 new Sevaks (Nevil Shah & Jainish Patel)!';
END $$;
