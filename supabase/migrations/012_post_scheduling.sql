-- Fila de posts agendados por cliente
CREATE TABLE IF NOT EXISTS public.post_scheduling (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  caption TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_reels BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_scheduling_agency_id ON public.post_scheduling(agency_id);
CREATE INDEX IF NOT EXISTS idx_post_scheduling_client_id ON public.post_scheduling(client_id);
CREATE INDEX IF NOT EXISTS idx_post_scheduling_scheduled_at ON public.post_scheduling(scheduled_at);

ALTER TABLE public.post_scheduling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_scheduling_own_agency"
  ON public.post_scheduling FOR ALL
  TO authenticated
  USING (agency_id = public.current_user_agency_id())
  WITH CHECK (agency_id = public.current_user_agency_id());

COMMENT ON TABLE public.post_scheduling IS 'Fila de posts agendados para publicação (Instagram/Reels)';
