-- Pasta/Demanda por criativo (ex: Campanha Black Friday, Posts Janeiro)
ALTER TABLE public.creative_assets
  ADD COLUMN IF NOT EXISTS demand_name TEXT;

COMMENT ON COLUMN public.creative_assets.demand_name IS 'Nome da pasta/demanda (ex: Campanha Black Friday)';
