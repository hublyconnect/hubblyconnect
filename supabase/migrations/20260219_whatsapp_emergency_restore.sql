-- Emergency: Restore CRM visibility after ID split
-- 1. Force-update conversations: replace old WEBHOOK id with SEND id
-- 2. Ensure clients have correct IDs (agencia-b9 or any agency with these IDs)

-- Step 1: Update ALL conversations that have the old webhook ID
UPDATE public.whatsapp_conversations
SET business_phone_id = '1063335686858744'
WHERE business_phone_id = '1078459368673714';

-- Step 2: Sync clients - update any client that had the old webhook ID to have both correctly
UPDATE public.clients
SET
  whatsapp_business_phone_id = '1063335686858744',
  whatsapp_waba_id = '1078459368673714',
  updated_at = now()
WHERE whatsapp_business_phone_id = '1078459368673714'
   OR whatsapp_waba_id = '1078459368673714';

-- Step 3: Backfill conversations - ensure business_phone_id = client's whatsapp_business_phone_id
UPDATE public.whatsapp_conversations wc
SET business_phone_id = c.whatsapp_business_phone_id
FROM public.clients c
WHERE wc.client_id = c.id
  AND c.whatsapp_business_phone_id IS NOT NULL
  AND (wc.business_phone_id IS NULL OR wc.business_phone_id IS DISTINCT FROM c.whatsapp_business_phone_id);
