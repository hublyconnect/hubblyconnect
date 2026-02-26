-- Campo para vincular o cliente ao perfil no Asaas (financeiro automático)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

COMMENT ON COLUMN public.clients.asaas_customer_id IS 'ID do cliente no Asaas para integração de cobrança e financeiro automático.';
