-- Create bot-avatars bucket for WhatsApp Bot profile pictures.
-- Admins upload via server actions (createAdminClient bypasses RLS).
-- Structure: {agency_id}/{client_id}/{timestamp}.{ext}
-- If bucket already exists (e.g. created via Dashboard), policies will still be applied.

INSERT INTO storage.buckets (id, name, public)
VALUES ('bot-avatars', 'bot-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated admins to manage objects (via RLS if using anon key).
-- Service role bypasses RLS; uploads from server use createAdminClient.
DROP POLICY IF EXISTS "bot-avatars: admins can insert" ON storage.objects;
CREATE POLICY "bot-avatars: admins can insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bot-avatars'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "bot-avatars: admins can update" ON storage.objects;
CREATE POLICY "bot-avatars: admins can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'bot-avatars'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "bot-avatars: admins can delete" ON storage.objects;
CREATE POLICY "bot-avatars: admins can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bot-avatars'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Public read for avatar URLs (bucket is public)
DROP POLICY IF EXISTS "bot-avatars: public read" ON storage.objects;
CREATE POLICY "bot-avatars: public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bot-avatars');
