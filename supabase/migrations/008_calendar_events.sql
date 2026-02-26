-- Eventos do calendário (preparado para Google Calendar sync)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'recording', 'call')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  google_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_agency_id ON public.calendar_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_starts_at ON public.calendar_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON public.calendar_events(google_event_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_agency"
  ON public.calendar_events FOR ALL
  TO authenticated
  USING (agency_id = public.current_user_agency_id())
  WITH CHECK (agency_id = public.current_user_agency_id());

COMMENT ON COLUMN public.calendar_events.google_event_id IS 'ID do evento no Google Calendar (sync futuro)';
