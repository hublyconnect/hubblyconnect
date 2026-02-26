-- Profile: client assignment for client role + notification preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);

COMMENT ON COLUMN public.profiles.client_id IS 'For client role: the single client this user is assigned to';
COMMENT ON COLUMN public.profiles.email_notifications IS 'Whether to send email notifications (e.g. new creative ready)';
COMMENT ON COLUMN public.profiles.whatsapp_alerts IS 'Whether to send WhatsApp alerts';
