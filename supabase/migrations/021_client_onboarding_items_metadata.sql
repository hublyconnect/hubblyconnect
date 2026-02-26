-- Metadata JSONB para itens de onboarding (ex.: credenciais de login/senha)
ALTER TABLE public.client_onboarding_items
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN public.client_onboarding_items.metadata IS 'Dados extras do item (ex.: credenciais para itens tipo login/senha, redes sociais).';
