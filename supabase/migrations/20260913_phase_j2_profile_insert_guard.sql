-- Phase J.2 additive security correction.
-- Client-created profiles must begin in the approval workflow.

DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
CREATE POLICY "Allow pending profile creation on signup"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
        AND status = 'PENDING'
    );
