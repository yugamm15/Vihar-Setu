-- Phase J.3 additive security correction.
-- Bind client emergency and location writes to the caller's Vihar scope.

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
        AND (
            vihar_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.vihars v
                WHERE v.id = emergencies.vihar_id
                  AND (
                      v.user_id = auth.uid()
                      OR EXISTS (
                          SELECT 1
                          FROM public.vihar_participants vp
                          WHERE vp.vihar_id = v.id
                            AND vp.user_id = auth.uid()
                            AND vp.left_at IS NULL
                      )
                  )
            )
        )
    );

DROP POLICY IF EXISTS "Users insert location for own vihar" ON public.vihar_locations;
CREATE POLICY "Users insert location for own vihar"
    ON public.vihar_locations FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND status = 'ACTIVE'
        )
        AND EXISTS (
            SELECT 1
            FROM public.vihars v
            WHERE v.id = vihar_locations.vihar_id
              AND (
                  v.user_id = auth.uid()
                  OR EXISTS (
                      SELECT 1
                      FROM public.vihar_participants vp
                      WHERE vp.vihar_id = v.id
                        AND vp.user_id = auth.uid()
                        AND vp.left_at IS NULL
                  )
              )
        )
    );
