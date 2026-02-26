-- Checklist de onboarding por cliente (checkboxes persistentes)
CREATE TABLE IF NOT EXISTS public.client_onboarding_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_onboarding_items_client_id ON public.client_onboarding_items(client_id);

ALTER TABLE public.client_onboarding_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_onboarding_items_select_own_agency"
  ON public.client_onboarding_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_onboarding_items.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  );

CREATE POLICY "client_onboarding_items_all_own_agency"
  ON public.client_onboarding_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_onboarding_items.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_onboarding_items.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  );

COMMENT ON TABLE public.client_onboarding_items IS 'Itens de checklist de onboarding por cliente (persistência de checkboxes)';
