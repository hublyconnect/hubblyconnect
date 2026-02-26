-- =============================================================================
-- WhatsApp Cloud API leads (CTWA ads - messages from ad clicks)
-- =============================================================================

CREATE TABLE public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_phone_id TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  ad_id TEXT,
  campaign_id TEXT,
  message_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_leads_business_phone_id ON public.whatsapp_leads(business_phone_id);
CREATE INDEX idx_whatsapp_leads_lead_phone ON public.whatsapp_leads(lead_phone);
CREATE INDEX idx_whatsapp_leads_ad_id ON public.whatsapp_leads(ad_id);
CREATE INDEX idx_whatsapp_leads_created_at ON public.whatsapp_leads(created_at DESC);

ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

-- Public inserts (webhook from Meta has no user auth)
CREATE POLICY "whatsapp_leads_insert_anon"
  ON public.whatsapp_leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated admins can do all (read, update, delete)
CREATE POLICY "whatsapp_leads_all_admin"
  ON public.whatsapp_leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.whatsapp_leads IS 'CTWA leads from WhatsApp Cloud API webhook. RLS: anon/service insert, admin all.';
