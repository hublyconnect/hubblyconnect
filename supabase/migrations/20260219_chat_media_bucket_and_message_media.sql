-- chat-media bucket for CRM attachments (images, audio, documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "chat-media: admins can insert" ON storage.objects;
CREATE POLICY "chat-media: admins can insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "chat-media: admins can update" ON storage.objects;
CREATE POLICY "chat-media: admins can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "chat-media: admins can delete" ON storage.objects;
CREATE POLICY "chat-media: admins can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "chat-media: public read" ON storage.objects;
CREATE POLICY "chat-media: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Media columns for whatsapp_messages
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT;

COMMENT ON COLUMN public.whatsapp_messages.media_url IS 'Public URL of attached media (image, audio, document)';
COMMENT ON COLUMN public.whatsapp_messages.media_type IS 'Type: image, audio, document';
