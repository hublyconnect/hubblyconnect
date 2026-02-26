-- Status "Desistiu" e campos de contato no cliente (CRM)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Remover constraint antiga e adicionar nova incluindo 'churned'
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'inactive', 'onboarding', 'churned'));

COMMENT ON COLUMN public.clients.contact_email IS 'E-mail de contato do cliente (CRM)';
COMMENT ON COLUMN public.clients.instagram_url IS 'Link do Instagram';
COMMENT ON COLUMN public.clients.whatsapp IS 'WhatsApp/Telefone de contato';
