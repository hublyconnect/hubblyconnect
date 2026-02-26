-- =============================================================================
-- WhatsApp CRM: conversations + messages (upgrade from flat whatsapp_leads)
-- =============================================================================

-- Allow mapping business_phone_id -> client for webhook lookup
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_business_phone_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_whatsapp_business_phone_id
  ON public.clients(whatsapp_business_phone_id)
  WHERE whatsapp_business_phone_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Conversations (one per client + lead_phone)
-- -----------------------------------------------------------------------------
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  business_phone_id TEXT NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open',
  ad_id TEXT,
  campaign_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, lead_phone)
);

CREATE INDEX idx_whatsapp_conversations_client_id ON public.whatsapp_conversations(client_id);
CREATE INDEX idx_whatsapp_conversations_lead_phone ON public.whatsapp_conversations(lead_phone);
CREATE INDEX idx_whatsapp_conversations_last_message_at ON public.whatsapp_conversations(last_message_at DESC);

-- -----------------------------------------------------------------------------
-- Messages (threaded per conversation)
-- -----------------------------------------------------------------------------
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('lead', 'agent')),
  message_body TEXT NOT NULL,
  wa_message_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_wa_message_id ON public.whatsapp_messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Webhook (anon) can INSERT
CREATE POLICY "whatsapp_conversations_insert_anon"
  ON public.whatsapp_conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "whatsapp_messages_insert_anon"
  ON public.whatsapp_messages FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role bypasses RLS; webhook uses admin client
-- Admins can full CRUD (agency-scoped via client)
CREATE POLICY "whatsapp_conversations_all_admin"
  ON public.whatsapp_conversations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid() AND p.role = 'admin' AND c.id = whatsapp_conversations.client_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.clients c ON c.agency_id = p.agency_id
      WHERE p.id = auth.uid() AND p.role = 'admin' AND c.id = whatsapp_conversations.client_id
    )
  );

CREATE POLICY "whatsapp_messages_all_admin"
  ON public.whatsapp_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations wc
      JOIN public.clients c ON c.id = wc.client_id
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE wc.id = whatsapp_messages.conversation_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations wc
      JOIN public.clients c ON c.id = wc.client_id
      JOIN public.profiles p ON p.agency_id = c.agency_id
      WHERE wc.id = whatsapp_messages.conversation_id AND p.id = auth.uid() AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.whatsapp_conversations IS 'WhatsApp CRM conversations. RLS: anon insert, admin CRUD.';
COMMENT ON TABLE public.whatsapp_messages IS 'WhatsApp CRM messages. RLS: anon insert, admin CRUD.';
