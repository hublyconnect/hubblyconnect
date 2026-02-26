-- Slug para URL do portal (ex: espaco-nobre)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_slug ON public.clients(slug) WHERE slug IS NOT NULL;

COMMENT ON COLUMN public.clients.slug IS 'Slug para URL do portal do cliente (ex: espaco-nobre)';

-- Backfill slug para clientes existentes sem slug
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  final_slug TEXT;
  suffix INT;
BEGIN
  FOR r IN SELECT id, name FROM public.clients WHERE slug IS NULL
  LOOP
    base_slug := lower(regexp_replace(
      regexp_replace(trim(r.name), '\s+', '-', 'g'),
      '[^a-z0-9-]', '', 'g'
    ));
    base_slug := COALESCE(NULLIF(base_slug, ''), 'cliente');
    final_slug := base_slug;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.clients WHERE slug = final_slug) LOOP
      suffix := suffix + 1;
      final_slug := base_slug || '-' || suffix;
    END LOOP;
    UPDATE public.clients SET slug = final_slug, updated_at = now() WHERE id = r.id;
  END LOOP;
END $$;
