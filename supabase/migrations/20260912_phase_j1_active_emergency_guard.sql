-- Phase J.1 additive security correction.
-- Require an active profile before a client can create an emergency.

DROP POLICY IF EXISTS "Users create emergency for self" ON public.emergencies;
CREATE POLICY "Users create emergency for self"
    ON public.emergencies FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND status = 'ACTIVE'
        )
    );
