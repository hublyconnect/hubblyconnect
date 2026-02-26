-- Número do WhatsApp no perfil (preferências do cliente)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

COMMENT ON COLUMN public.profiles.whatsapp_number IS 'Número do WhatsApp do cliente para notificações';
