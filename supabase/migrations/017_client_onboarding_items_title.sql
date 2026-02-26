-- Permite que o dashboard use a coluna "title" em client_onboarding_items (portal usa label ?? title)
ALTER TABLE public.client_onboarding_items
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Backfill: se title for null, use label para exibição no portal (portal-data já faz label ?? title)
COMMENT ON COLUMN public.client_onboarding_items.title IS 'Título do item (dashboard). Portal exibe label ?? title.';
