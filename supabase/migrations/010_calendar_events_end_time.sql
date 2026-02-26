-- Padronizar coluna de fim do evento para end_time
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE public.calendar_events RENAME COLUMN ends_at TO end_time;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE public.calendar_events ADD COLUMN end_time TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON COLUMN public.calendar_events.end_time IS 'Data/hora de término do evento';
