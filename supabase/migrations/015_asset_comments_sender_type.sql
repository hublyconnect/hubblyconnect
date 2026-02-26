-- Comentários de ajuste no portal: permitir sender_type 'client' | 'agency' e author_id opcional.
-- Inserções pelo portal (Server Action com service_role) usam sender_type = 'client' e author_id NULL.

ALTER TABLE public.asset_comments
  ADD COLUMN IF NOT EXISTS sender_type text;

-- Restrição para valores permitidos
ALTER TABLE public.asset_comments
  DROP CONSTRAINT IF EXISTS asset_comments_sender_type_check;

ALTER TABLE public.asset_comments
  ADD CONSTRAINT asset_comments_sender_type_check
  CHECK (sender_type IN ('client', 'agency'));

-- Comentários existentes (agência) ficam como 'agency'
UPDATE public.asset_comments
SET sender_type = 'agency'
WHERE sender_type IS NULL;

-- Default para novos inserts (dashboard)
ALTER TABLE public.asset_comments
  ALTER COLUMN sender_type SET DEFAULT 'agency';

-- author_id opcional para comentários do cliente (portal, sem auth)
ALTER TABLE public.asset_comments
  ALTER COLUMN author_id DROP NOT NULL;

-- Integridade: comentários da agência devem ter author_id
-- (opcional: trigger ou check; por simplicidade deixamos apenas sender_type)

COMMENT ON COLUMN public.asset_comments.sender_type IS 'Quem enviou: client (portal) ou agency (dashboard).';
