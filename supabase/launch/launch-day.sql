-- =====================================================================================
-- DIA DO LANÇAMENTO — remover as contas de teste e os seus dados.  NÃO CORRER ANTES DO DIA.
-- -------------------------------------------------------------------------------------
-- Aprovação explícita obrigatória (escrita destrutiva). Ver docs/LAUNCH.md, passo "Dia D".
--
-- 1. Gerar os hashes:  bun scripts/qa/launch-hashes.ts   (lê .env.test.local; não mostra emails)
-- 2. Colar as 3 linhas no lugar de <HASHES> abaixo (as contas são encontradas pelo SHA-256 do
--    email, para nenhum email ficar neste ficheiro nem nos registos).
-- 3. Ensaiar: correr tudo com a última linha ROLLBACK (já está). Ver o resultado do RAISE NOTICE.
-- 4. Aplicar: trocar ROLLBACK por COMMIT, correr de novo e depois a verificação (fim do ficheiro).
--
-- O que faz:
--   * encontra exatamente 3 contas de teste (pára se não forem 3);
--   * apaga o negócio "EKAYA Teste — não reservar" (só se for de uma dessas contas), as suas
--     atividades, horários, reservas, destaques, convites e recompensas;
--   * apaga as reservas, favoritos, publicações, progresso, pontos e notificações das contas;
--   * apaga as contas (auth.users → profiles em cascata). Uma conta referida por registos que só
--     se acrescentam (admin_audit, versões de configuração) é anonimizada em vez de apagada, como
--     faz delete_my_account, para não partir a auditoria;
--   * lista os ficheiros de Storage a apagar (o Supabase não deixa apagá-los por SQL): das contas de
--     teste e as provas de contas já apagadas. Apagar no Storage do Lovable Cloud (ver LAUNCH.md).
-- Conteúdo público aprovado (roteiros públicos aprovados) criado por estas contas fica, sem dono.
-- =====================================================================================
BEGIN;

CREATE TEMP TABLE launch_hashes (h text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO launch_hashes (h) VALUES
<HASHES>;

CREATE TEMP TABLE launch_users ON COMMIT DROP AS
  SELECT u.id FROM auth.users u
   WHERE encode(extensions.digest(lower(btrim(u.email)), 'sha256'), 'hex') IN (SELECT h FROM launch_hashes);

CREATE TEMP TABLE launch_business ON COMMIT DROP AS
  SELECT b.id FROM public.businesses b
   WHERE b.name = 'EKAYA Teste — não reservar' AND b.owner_id IN (SELECT id FROM launch_users);

DO $$
DECLARE
  n int;
  keep uuid[];
  r record;
  -- Columns that point at a user with ON DELETE NO ACTION in tables that are not append-only:
  -- set to NULL so the account can be deleted.
  nullable_refs text[][] := ARRAY[
    ARRAY['public.businesses', 'decided_by'],
    ARRAY['public.reward_redemptions', 'used_by'],
    ARRAY['public.route_stop_progress', 'reviewed_by'],
    ARRAY['public.sponsored_placements', 'requested_by'],
    ARRAY['public.sponsored_placements', 'paid_marked_by'],
    ARRAY['public.assistant_faq_entries', 'updated_by']];
  -- Append-only tables that point at a user: an account referenced here is anonymised.
  append_refs text[][] := ARRAY[
    ARRAY['public.admin_audit', 'actor_id'],
    ARRAY['public.commercial_configs', 'created_by'],
    ARRAY['public.manual_payment_configs', 'created_by'],
    ARRAY['public.assistant_faq_versions', 'created_by']];
  ref text[];
BEGIN
  SELECT count(*) INTO n FROM launch_users;
  IF n <> 3 THEN RAISE EXCEPTION 'LAUNCH_EXPECTED_3_TEST_ACCOUNTS (found %)', n; END IF;
  SELECT count(*) INTO n FROM launch_business;
  IF n > 1 THEN RAISE EXCEPTION 'LAUNCH_EXPECTED_AT_MOST_1_TEST_BUSINESS (found %)', n; END IF;

  -- Privileged-field guards look at the JWT: run as the database, not as a user.
  PERFORM set_config('request.jwt.claims', '', true);

  -- ---- the test business ----
  DELETE FROM public.bookings WHERE business_id IN (SELECT id FROM launch_business);
  DELETE FROM public.reward_redemptions WHERE reward_id IN
    (SELECT id FROM public.rewards WHERE business_id IN (SELECT id FROM launch_business));
  DELETE FROM public.rewards WHERE business_id IN (SELECT id FROM launch_business);
  DELETE FROM public.experiences WHERE business_id IN (SELECT id FROM launch_business);
  DELETE FROM public.businesses WHERE id IN (SELECT id FROM launch_business);

  -- ---- data of the test accounts ----
  DELETE FROM public.bookings WHERE customer_id IN (SELECT id FROM launch_users);
  DELETE FROM public.business_invites WHERE created_by IN (SELECT id FROM launch_users)
                                         OR used_by IN (SELECT id FROM launch_users);
  DELETE FROM public.routes WHERE owner_id IN (SELECT id FROM launch_users)
                              AND NOT (is_public AND review_status = 'approved');
  FOREACH ref SLICE 1 IN ARRAY nullable_refs LOOP
    IF to_regclass(ref[1]) IS NOT NULL THEN
      EXECUTE format('UPDATE %s SET %I = NULL WHERE %I IN (SELECT id FROM launch_users)', ref[1], ref[2], ref[2]);
    END IF;
  END LOOP;

  -- ---- accounts: anonymise the ones kept by append-only records, delete the others ----
  keep := ARRAY[]::uuid[];
  FOREACH ref SLICE 1 IN ARRAY append_refs LOOP
    IF to_regclass(ref[1]) IS NOT NULL THEN
      EXECUTE format('SELECT array_agg(DISTINCT %I) FROM %s WHERE %I IN (SELECT id FROM launch_users)', ref[2], ref[1], ref[2])
        INTO r;
      keep := keep || coalesce(r.array_agg, ARRAY[]::uuid[]);
    END IF;
  END LOOP;

  FOR r IN SELECT id FROM launch_users WHERE id = ANY (keep) LOOP
    DELETE FROM public.favorites WHERE user_id = r.id;
    DELETE FROM public.notifications WHERE user_id = r.id;
    DELETE FROM public.community_post_reactions WHERE user_id = r.id;
    DELETE FROM public.community_posts WHERE author_id = r.id;
    DELETE FROM public.community_reports WHERE reporter_id = r.id;
    DELETE FROM public.destination_visits WHERE user_id = r.id;
    DELETE FROM public.news_likes WHERE user_id = r.id;
    DELETE FROM public.event_participations WHERE user_id = r.id;
    DELETE FROM public.profile_provinces WHERE profile_id = r.id;
    DELETE FROM public.route_progress WHERE user_id = r.id;
    DELETE FROM public.user_roles WHERE user_id = r.id;
    UPDATE public.profiles SET display_name = 'Conta apagada', avatar_url = NULL, phone = NULL, province = NULL,
           duration_days = NULL, interests = '{}', muted_notification_types = '{}', deleted_at = now()
     WHERE id = r.id;
    DELETE FROM auth.sessions WHERE user_id = r.id;
    DELETE FROM auth.refresh_tokens WHERE user_id = r.id::text;
    DELETE FROM auth.identities WHERE user_id = r.id;
    DELETE FROM auth.mfa_factors WHERE user_id = r.id;
    UPDATE auth.users SET email = 'deleted-' || r.id::text || '@ekaya.invalid', phone = NULL,
           encrypted_password = NULL, raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity'
     WHERE id = r.id;
  END LOOP;
  DELETE FROM auth.users WHERE id IN (SELECT id FROM launch_users) AND NOT (id = ANY (keep));

  IF (SELECT count(*) FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
       WHERE ur.role = 'admin' AND p.deleted_at IS NULL) < 1 THEN
    RAISE EXCEPTION 'LAUNCH_WOULD_LEAVE_NO_ADMIN';
  END IF;

  RAISE NOTICE 'LAUNCH: % account(s) deleted, % anonymised, % test business deleted',
    (SELECT count(*) FROM launch_users) - cardinality(keep), cardinality(keep), (SELECT count(*) FROM launch_business);
END $$;

-- Storage files to delete in the Storage screen (the database refuses SQL deletes on
-- storage.objects): files of the test accounts, and proofs of accounts deleted earlier.
SELECT o.bucket_id, o.name
  FROM storage.objects o
 WHERE o.bucket_id IN ('avatars', 'community-photos', 'route-proofs', 'game-proofs', 'content-photos')
   AND (o.owner IN (SELECT id FROM launch_users)
        OR split_part(o.name, '/', 1) IN (SELECT id::text FROM launch_users)
        OR split_part(o.name, '/', 1) IN (SELECT id::text FROM launch_business)
        OR (o.bucket_id IN ('route-proofs', 'game-proofs')
            AND NOT EXISTS (SELECT 1 FROM public.profiles p
                             WHERE p.deleted_at IS NULL
                               AND (p.id = o.owner OR p.id::text = split_part(o.name, '/', 1)))))
 ORDER BY 1, 2;

ROLLBACK;  -- ensaio. No dia: trocar por COMMIT.

-- =====================================================================================
-- Verificação (só leitura), depois do COMMIT:
-- SELECT count(*) FROM public.businesses WHERE name = 'EKAYA Teste — não reservar';      -- 0
-- SELECT count(*) FROM public.profiles WHERE is_internal AND deleted_at IS NULL;          -- contas de equipa que ficam
-- SELECT count(*) FROM public.bookings b LEFT JOIN public.profiles p ON p.id = b.customer_id
--  WHERE p.id IS NULL;                                                                    -- 0
-- SELECT count(*) FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
--  WHERE r.role = 'admin' AND p.deleted_at IS NULL;                                       -- >= 1 (admin real)
-- =====================================================================================
