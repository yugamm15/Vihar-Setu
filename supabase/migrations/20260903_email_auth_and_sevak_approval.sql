-- ==============================================================================
-- JINAARYA VIHAR SETU — Email OTP Auth & Sevak Approval Migration
-- Migration: 20260903_email_auth_and_sevak_approval.sql
-- ==============================================================================

-- 1. Safely convert status column to TEXT with 'PENDING' default (eliminates enum limitations)
ALTER TABLE public.profiles ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'PENDING';

-- 2. Add missing columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN phone DROP NOT NULL;

-- 3. Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 4. Update the automatic trigger for new auth signups (Email-based)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id INT;
BEGIN
    -- 1. Insert into public.profiles with default 'PENDING' status
    INSERT INTO public.profiles (
        id,
        email,
        phone,
        full_name,
        preferred_language,
        status,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.phone, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'gu'),
        'PENDING',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = NOW();

    -- 2. Fetch default SEVAK role
    SELECT id INTO default_role_id FROM public.roles WHERE name = 'SEVAK' LIMIT 1;

    -- 3. Assign SEVAK role by default
    IF default_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id)
        VALUES (NEW.id, default_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can delete own pending/rejected profile" ON public.profiles;
CREATE POLICY "Users can delete own pending/rejected profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id AND (status = 'PENDING' OR status = 'REJECTED'));

-- 6. Enable Realtime updates on public.profiles table
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
