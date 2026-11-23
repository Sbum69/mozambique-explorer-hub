-- 0076 — Descreve no repositório os buckets community-photos, route-proofs e game-proofs (PROPOSTA, não aplicada).
--
-- PROBLEMA
--   Os três buckets foram criados à mão (Lovable/painel). As políticas (0016, 0018, 0031, 0045) e o
--   UPDATE de tipos (0045) dependem deles, mas nenhuma migração os cria. Um projeto novo (teste,
--   restauro, outra região) fica sem eles. avatars (0046) e content-photos (0051) já têm o seu INSERT.
--
-- OBJETIVO
--   Idempotente e sem efeito na produção: se o bucket ou a política já existem, NÃO se mexe neles.
--   - buckets: INSERT … ON CONFLICT (id) DO NOTHING (não altera um bucket existente);
--   - políticas: só se criam se não houver nenhuma com o mesmo nome em storage.objects
--     (CREATE POLICY não tem IF NOT EXISTS).
--
-- O QUE FOI DEDUZIDO E DE ONDE
--   | Bucket           | Público | Limite         | Tipos                 | Políticas (nome exato)                         |
--   | community-photos | não     | 5 MB [CONF]    | imagens (0045)        | 0016 + 0045 (5 políticas)                      |
--   | route-proofs     | não     | 8 MB [CONF]    | imagens (0045)        | 0018 (3 políticas)                             |
--   | game-proofs      | não     | 8 MB [CONF]    | imagens (0045)        | 0031 (2 políticas: sem UPDATE nem DELETE)      |
--   - Público = não: docs/SECURITY.md §4, signed URLs no código (routes.ts, community-experiences.ts),
--     EKAYA_FIXES.md ("Storage privado community-photos").
--   - Limites: o cliente recusa acima de 5 MB (community-experiences.ts:140) e 8 MB (routes.ts:754,
--     games.ts:92); docs/SECURITY.md §4 dá os mesmos valores.
--   - Tipos: UPDATE storage.buckets da 0045 (JPEG, PNG, WebP, GIF, HEIC, HEIF; sem SVG).
--
-- POR CONFIRMAR NA PRODUÇÃO [CONF] (leituras, antes de aprovar)
--   1. Os buckets e as suas definições (o file_size_limit pode estar a NULL no bucket e o limite
--      ser só o do cliente; se for NULL, decidir se a migração deve pôr 5/8 MB ou deixar NULL):
--        SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets
--         WHERE id IN ('community-photos', 'route-proofs', 'game-proofs') ORDER BY id;
--   2. As políticas existentes (esperado: as 10 abaixo, com os mesmos nomes, comandos e papéis;
--      se houver outras criadas no painel, acrescentá-las aqui):
--        SELECT policyname, cmd, roles, qual, with_check FROM pg_policies
--         WHERE schemaname = 'storage' AND tablename = 'objects'
--           AND (qual ~ '(community-photos|route-proofs|game-proofs)'
--                OR with_check ~ '(community-photos|route-proofs|game-proofs)')
--         ORDER BY policyname;
--   3. O nome do bucket = id (o INSERT assume name = id, como na 0046 e na 0051).
--
-- O QUE NÃO MUDA (na produção)
--   Nada: os buckets e as políticas já existem, por isso cada passo é ignorado.
--   Nota: se uma política existir com o mesmo nome mas outro conteúdo, esta migração NÃO a corrige.
--
-- COMO REVERTER
--   Num projeto novo onde a migração criou os buckets: apagar as políticas pelo nome e
--   DELETE FROM storage.buckets WHERE id IN (…) (só com os buckets vazios). Na produção não há
--   nada a reverter (não muda nada).

-- 1) Buckets (privados, só imagens).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('community-photos', 'community-photos', false, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']),
  ('route-proofs', 'route-proofs', false, 8388608,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']),
  ('game-proofs', 'game-proofs', false, 8388608,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO NOTHING;

-- 2) Políticas (texto igual ao das migrações de origem; só se criam se faltarem).
DO $$
BEGIN
  -- community-photos (0016; leituras da 0045)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Community photos upload own folder') THEN
    CREATE POLICY "Community photos upload own folder"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'community-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Community photos read approved') THEN
    CREATE POLICY "Community photos read approved"
      ON storage.objects FOR SELECT TO anon, authenticated
      USING (
        bucket_id = 'community-photos'
        AND EXISTS (
          SELECT 1 FROM public.community_experiences ce
           WHERE ce.image_path = storage.objects.name AND ce.status = 'approved' AND ce.active = true
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Community photos read own or admin') THEN
    CREATE POLICY "Community photos read own or admin"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'community-photos'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Community photos admin update') THEN
    CREATE POLICY "Community photos admin update"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'community-photos' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Community photos delete own or admin') THEN
    CREATE POLICY "Community photos delete own or admin"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'community-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
  END IF;

  -- route-proofs (0018)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Route proofs upload own folder') THEN
    CREATE POLICY "Route proofs upload own folder" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'route-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Route proofs read own or admin') THEN
    CREATE POLICY "Route proofs read own or admin" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'route-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Route proofs delete own or admin') THEN
    CREATE POLICY "Route proofs delete own or admin" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'route-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
  END IF;

  -- game-proofs (0031: só a própria pasta; sem UPDATE nem DELETE)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Users upload own game proofs') THEN
    CREATE POLICY "Users upload own game proofs" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'game-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
                  AND policyname = 'Users read own game proofs') THEN
    CREATE POLICY "Users read own game proofs" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'game-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
  END IF;
END $$;
