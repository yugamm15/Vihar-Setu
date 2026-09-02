-- ==============================================================================
-- JINAARYA VIHAR SETU — Super Admin Creation & Role Assignment
-- File: 20260903_super_admin_setup.sql
-- ==============================================================================

-- 1. Ensure SUPER_ADMIN role exists in public.roles
INSERT INTO public.roles (name, description)
VALUES ('SUPER_ADMIN', 'Super Administrator with full platform authority')
ON CONFLICT (name) DO NOTHING;

-- 2. Ensure ADMIN role exists in public.roles
INSERT INTO public.roles (name, description)
VALUES ('ADMIN', 'Administrator with approval and vihar management authority')
ON CONFLICT (name) DO NOTHING;

-- 3. If bhemanibhemani@gmail.com is already in auth.users, promote to SUPER_ADMIN
DO $$
DECLARE
    super_admin_uid UUID;
    super_admin_role_id INT;
BEGIN
    -- Get user id if exists
    SELECT id INTO super_admin_uid FROM auth.users WHERE email = 'bhemanibhemani@gmail.com' LIMIT 1;
    
    -- Get role id
    SELECT id INTO super_admin_role_id FROM public.roles WHERE name = 'SUPER_ADMIN' LIMIT 1;

    IF super_admin_uid IS NOT NULL THEN
        -- Upsert profile as ACTIVE Super Administrator
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            city,
            area,
            status,
            created_at,
            updated_at
        )
        VALUES (
            super_admin_uid,
            'bhemanibhemani@gmail.com',
            'Super Administrator',
            'Surat',
            'Surat',
            'ACTIVE',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            status = 'ACTIVE',
            full_name = 'Super Administrator',
            updated_at = NOW();

        -- Assign SUPER_ADMIN role
        IF super_admin_role_id IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role_id)
            VALUES (super_admin_uid, super_admin_role_id)
            ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
        
        RAISE NOTICE 'Super Admin role successfully assigned to bhemanibhemani@gmail.com!';
    ELSE
        RAISE NOTICE 'User bhemanibhemani@gmail.com not created yet in auth.users. Please create the user in Supabase Authentication -> Users.';
    END IF;
END $$;
