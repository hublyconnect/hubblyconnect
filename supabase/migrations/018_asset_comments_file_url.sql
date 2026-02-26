-- Coluna para anexos em comentários (imagens, PDFs, áudio)
ALTER TABLE public.asset_comments
  ADD COLUMN IF NOT EXISTS file_url TEXT;

COMMENT ON COLUMN public.asset_comments.file_url IS 'URL pública do anexo (imagem, PDF ou áudio) no Supabase Storage.';

-- Crie o bucket "portal-attachments" no Supabase Dashboard (Storage) como público.
