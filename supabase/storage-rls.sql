-- =============================================================================
-- Políticas RLS para o bucket "portal-files" (Portal do Cliente - Agência)
-- Cole este script no Editor SQL do Supabase (SQL Editor > New query) e execute.
--
-- Estrutura do bucket:
--   - agency-files/      → arquivos enviados pela agência (cliente só leitura)
--   - client-docs/       → documentos enviados pelo cliente (página Arquivos)
--   - onboarding/        → documentos do onboarding enviados pelo cliente
--   - creative-assets/   → criativos enviados por admin (Review Gallery)
--
-- Pré-requisito: crie o bucket "portal-files" no Storage (Dashboard > Storage).
-- Para a agência enviar arquivos em agency-files/, use a Service Role Key (bypass RLS).
-- =============================================================================

-- 1) Cliente pode LER arquivos da agência, próprios e criativos (agency-files, client-docs, onboarding, creative-assets)
CREATE POLICY "portal-files: cliente pode ler arquivos da agência e próprios"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'portal-files'
  AND (
    (storage.foldername(name))[1] = 'agency-files'
    OR (storage.foldername(name))[1] = 'client-docs'
    OR (storage.foldername(name))[1] = 'onboarding'
    OR (storage.foldername(name))[1] = 'creative-assets'
  )
);

-- 2) Cliente pode SUBIR arquivos em client-docs e onboarding (não pode subir em agency-files)
CREATE POLICY "portal-files: cliente pode subir em client-docs e onboarding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portal-files'
  AND (
    (storage.foldername(name))[1] = 'client-docs'
    OR (storage.foldername(name))[1] = 'onboarding'
  )
);

-- 2b) Admin envia criativos em creative-assets (controle de quem vê o botão é no app por role)
CREATE POLICY "portal-files: upload creative-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portal-files'
  AND (storage.foldername(name))[1] = 'creative-assets'
);

-- 3) Cliente pode REMOVER apenas os próprios envios (client-docs e onboarding)
CREATE POLICY "portal-files: cliente pode remover próprios envios"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'portal-files'
  AND (
    (storage.foldername(name))[1] = 'client-docs'
    OR (storage.foldername(name))[1] = 'onboarding'
  )
);

-- Opcional: se quiser que a agência use o mesmo projeto (role authenticated)
-- para enviar arquivos em agency-files, descomente a política abaixo.
-- Caso contrário, a agência deve usar a Service Role Key (backend/admin).
--
-- CREATE POLICY "portal-files: agência pode subir em agency-files"
-- ON storage.objects
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'portal-files'
--   AND (storage.foldername(name))[1] = 'agency-files'
-- );
