-- Allow authenticated users to record route events for their own Vihars.
-- Administrators may record events for any Vihar they are authorized to manage.

DROP POLICY IF EXISTS "Users can insert route events for own Vihars" ON public.route_events;

CREATE POLICY "Users can insert route events for own Vihars"
    ON public.route_events FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.vihars
            WHERE public.vihars.id = route_events.vihar_id
              AND (
                  public.vihars.user_id = auth.uid()
                  OR public.is_admin_or_super()
              )
        )
    );
