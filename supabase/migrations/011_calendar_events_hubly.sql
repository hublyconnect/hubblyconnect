-- Hubly Connect: novos campos para Agenda Global
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS event_color TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'pending';

-- Ampliar event_type (manter valores antigos + novos)
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_event_type_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_event_type_check
  CHECK (event_type IN ('meeting', 'recording', 'call', 'onboarding', 'daily', 'review'));

ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_whatsapp_status_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_whatsapp_status_check
  CHECK (whatsapp_status IN ('pending', 'sent', 'confirmed'));

COMMENT ON COLUMN public.calendar_events.event_color IS 'Cor da tag em hex (ex: #3B82F6)';
COMMENT ON COLUMN public.calendar_events.meeting_url IS 'Link do Google Meet';
COMMENT ON COLUMN public.calendar_events.duration_minutes IS 'Duração estimada em minutos';
COMMENT ON COLUMN public.calendar_events.whatsapp_status IS 'Status da notificação WhatsApp: pending, sent, confirmed';
