-- ==============================================================================
-- FIX: "Database error saving new user" during Email OTP Sign-up
-- File: 20260903_fix_database_error_saving_new_user.sql
-- ==============================================================================

-- 1. Remove phone NOT NULL and duplicate empty-string UNIQUE constraint
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;
DROP INDEX IF EXISTS idx_profiles_phone_unique;

-- Create partial unique index so multiple users without a phone yet don't collide
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
    ON public.profiles(phone) 
    WHERE phone IS NOT NULL AND phone != '';

-- 2. Ensure all profile columns exist with proper defaults
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Surat';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';

-- 3. Make handle_new_user() fail-safe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id INT;
BEGIN
    -- Insert / Upsert into public.profiles with default 'PENDING' status
    INSERT INTO public.profiles (
        id,
        email,
        phone,
        full_name,
        city,
        area,
        preferred_language,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        NULLIF(NEW.phone, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'Surat',
        '',
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'gu'),
        'PENDING',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = NOW();

    -- Fetch default SEVAK role
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'SEVAK' LIMIT 1;

    -- Assign SEVAK role
    IF default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, default_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Fail-safe: ensure auth user is always created successfully
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
