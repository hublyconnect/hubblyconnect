-- Permitir que admins da agência atualizem sua própria agência (nome, logo, slug)
CREATE POLICY "agencies_update_own_by_admin"
  ON public.agencies FOR UPDATE
  TO authenticated
  USING (id = public.current_user_agency_id())
  WITH CHECK (
    id = public.current_user_agency_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
