alter table if exists public.whatsapp_conversations
  add column if not exists tags text[] not null default '{}';

