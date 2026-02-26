-- Controle de verba e métricas por cliente (portal Dashboard)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS ad_budget_total NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS ad_budget_used NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS next_billing_date DATE,
  ADD COLUMN IF NOT EXISTS avg_cost_per_conversa NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS total_conversas INTEGER;

COMMENT ON COLUMN public.clients.ad_budget_total IS 'Verba total contratada (anúncios)';
COMMENT ON COLUMN public.clients.ad_budget_used IS 'Verba já gasta';
COMMENT ON COLUMN public.clients.next_billing_date IS 'Data da próxima fatura';
COMMENT ON COLUMN public.clients.avg_cost_per_conversa IS 'Custo médio por conversa/lead';
COMMENT ON COLUMN public.clients.total_conversas IS 'Total de leads/conversas';
