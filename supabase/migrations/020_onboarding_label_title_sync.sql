-- Sincroniza schema de onboarding: garante que title seja a coluna canônica.
-- Compatível com schemas que têm label (005) e/ou title (017).

-- 1) Garantir que title existe
ALTER TABLE public.client_onboarding_items
  ADD COLUMN IF NOT EXISTS title TEXT;

-- 2) Backfill: copiar label para title onde title for null (se label existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_onboarding_items' AND column_name = 'label'
  ) THEN
    UPDATE public.client_onboarding_items
    SET title = COALESCE(title, label)
    WHERE title IS NULL;
    -- 3) Tornar label opcional (permite inserts só com title)
    ALTER TABLE public.client_onboarding_items ALTER COLUMN label DROP NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.client_onboarding_items.title IS 'Título do item (canônico). Preencher em inserts.';
