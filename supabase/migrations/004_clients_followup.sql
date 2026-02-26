-- Último contato e próximo follow-up para gestão de clientes
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

COMMENT ON COLUMN public.clients.last_contact_at IS 'Data do último contato com o cliente';
COMMENT ON COLUMN public.clients.next_follow_up_at IS 'Data sugerida para próximo follow-up';
