alter table if exists public.agencies
  add column if not exists whatsapp_access_token text,
  add column if not exists whatsapp_phone_number_id text,
  add column if not exists whatsapp_waba_id text;

