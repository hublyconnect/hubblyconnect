-- Integrações OAuth por agência (Instagram/Facebook para Hubly Connect)
CREATE TABLE IF NOT EXISTS public.agency_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('instagram', 'facebook')),
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_agency_integrations_agency_id ON public.agency_integrations(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_integrations_provider ON public.agency_integrations(provider);

ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;

-- Apenas usuários da mesma agência podem ver (via policy ou admin). Para callback server-side usamos service_role.
CREATE POLICY "agency_integrations_agency_read"
  ON public.agency_integrations FOR SELECT
  TO authenticated
  USING (agency_id = public.current_user_agency_id());

COMMENT ON TABLE public.agency_integrations IS 'Tokens OAuth por agência (Instagram/Facebook) para Hubly Connect';
