-- Acessos por cliente (Instagram, Facebook BM, Google Ads, identidade visual)
CREATE TABLE IF NOT EXISTS public.client_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'google', 'assets')),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_client_access_client_id ON public.client_access(client_id);
CREATE INDEX IF NOT EXISTS idx_client_access_platform ON public.client_access(platform);

ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_access_own_agency"
  ON public.client_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_access.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_access.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  );

COMMENT ON TABLE public.client_access IS 'Credenciais e dados de acesso por cliente (Instagram, Facebook BM, Google Ads, assets/identidade)';
