-- =============================================================================
-- Ad Tracking: clicks from Meta Ads before redirect to WhatsApp
-- =============================================================================

CREATE TABLE public.tracking_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'clicked'
);

CREATE INDEX idx_tracking_clicks_client_id ON public.tracking_clicks(client_id);
CREATE INDEX idx_tracking_clicks_created_at ON public.tracking_clicks(created_at DESC);
CREATE INDEX idx_tracking_clicks_status ON public.tracking_clicks(status);

ALTER TABLE public.tracking_clicks ENABLE ROW LEVEL SECURITY;

-- Anonymous users (public) can insert when they click tracking links
CREATE POLICY "tracking_clicks_insert_anon"
  ON public.tracking_clicks FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated admins can read tracking data for their agency's clients
CREATE POLICY "tracking_clicks_select_admin"
  ON public.tracking_clicks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND c.id = tracking_clicks.client_id
    )
  );

COMMENT ON TABLE public.tracking_clicks IS 'Ad click tracking - logs before redirect to WhatsApp/landing. RLS: anon insert, authenticated agency read.';
