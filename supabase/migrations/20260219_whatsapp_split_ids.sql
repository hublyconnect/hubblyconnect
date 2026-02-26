-- Split WhatsApp IDs: SEND (phone_number_id) vs WEBHOOK (waba_id)
-- whatsapp_business_phone_id = ID for SENDING messages via Meta API
-- whatsapp_waba_id = ID sent by Meta in webhook metadata (phone_number_id in webhook payload)

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_waba_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_whatsapp_waba_id
  ON public.clients(whatsapp_waba_id)
  WHERE whatsapp_waba_id IS NOT NULL;

COMMENT ON COLUMN public.clients.whatsapp_business_phone_id IS 'Phone Number ID for SENDING messages via Meta Graph API';
COMMENT ON COLUMN public.clients.whatsapp_waba_id IS 'WABA/Phone Number ID from webhook metadata - used to identify client on incoming messages';

-- Data sync: Update clients for agency with slug 'agencia-b9'
UPDATE public.clients
SET
  whatsapp_business_phone_id = '1063335686858744',
  whatsapp_waba_id = '1078459368673714',
  updated_at = now()
WHERE agency_id = (SELECT id FROM public.agencies WHERE slug = 'agencia-b9');

-- Backfill: Update existing conversations to use SEND id from their client
UPDATE public.whatsapp_conversations wc
SET business_phone_id = c.whatsapp_business_phone_id
FROM public.clients c
WHERE wc.client_id = c.id
  AND c.whatsapp_business_phone_id IS NOT NULL
  AND wc.business_phone_id IS DISTINCT FROM c.whatsapp_business_phone_id;
