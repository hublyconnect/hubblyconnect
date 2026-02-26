-- =============================================================================
-- Short tracking links (e.g. /go/zap-clinica -> WhatsApp)
-- =============================================================================

CREATE TABLE public.tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_links_slug ON public.tracking_links(slug);
CREATE INDEX idx_tracking_links_client_id ON public.tracking_links(client_id);

ALTER TABLE public.tracking_links ENABLE ROW LEVEL SECURITY;

-- Public (anon) can SELECT to resolve redirects
CREATE POLICY "tracking_links_select_anon"
  ON public.tracking_links FOR SELECT
  TO anon
  USING (true);

-- Authenticated admins can full CRUD
CREATE POLICY "tracking_links_all_admin"
  ON public.tracking_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND c.id = tracking_links.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND c.id = tracking_links.client_id
    )
  );

COMMENT ON TABLE public.tracking_links IS 'Short links for ad tracking. RLS: anon SELECT, admin CRUD.';
