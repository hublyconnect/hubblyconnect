-- published_at e error_log para fila de agendamento (cron)
ALTER TABLE public.post_scheduling
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_log TEXT;

COMMENT ON COLUMN public.post_scheduling.published_at IS 'Data/hora em que o post foi publicado no Instagram';
COMMENT ON COLUMN public.post_scheduling.error_log IS 'Mensagem de erro da API (Meta) em caso de falha na publicação';
