-- Add status column for message delivery/read receipts from Meta webhook.
-- Values: sent, delivered, read (Meta statuses); default 'sent' for new/legacy rows.

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

COMMENT ON COLUMN public.whatsapp_messages.status IS 'Delivery status from Meta: sent, delivered, read. Only applies to agent-sent messages.';
