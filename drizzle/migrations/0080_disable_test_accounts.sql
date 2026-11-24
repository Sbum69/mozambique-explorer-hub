-- 0080 — Desativar (NÃO apagar) as contas de teste e os negócios de QA (PROPOSTA, não aplicada).
--
-- PORQUÊ
--   No lançamento, as 3 contas de teste (turista, negócio, admin QA) deixam de poder entrar, e os
--   negócios de teste deixam de aparecer. O supabase/launch/launch-day.sql NÃO serve para isto:
--   APAGA as contas, reservas, pontos e o negócio de teste. Esta migração não apaga nenhuma linha:
--   o histórico (points_ledger, reservas, admin_audit, notificações) fica como está.
--
-- O QUE FAZ
--   1. Confirma que as 3 contas existem e estão marcadas como internas (profiles.is_internal, 0047;
--      os ids são os da 0047). Se não forem exatamente 3, pára (TEST_ACCOUNTS_NOT_FOUND).
--   2. Confirma que fica pelo menos 1 administrador real (não interno, não apagado). Se não, pára.
--   3. Contas: auth.users.banned_until = 'infinity' (o Supabase Auth recusa o login e a renovação
--      da sessão). Os perfis, papéis e dados ficam.
--   4. Negócios "EKAYA Teste — não reservar", "QA Negócio A — não reservar" e
--      "QA Negócio B — não reservar": status = 'suspended', só se o dono for uma conta interna ou
--      não tiver dono (proteção contra um negócio real com o mesmo nome). Um negócio suspenso:
--      - sai do catálogo público (RLS: só os aprovados);
--      - não recebe reservas (commercial_booking_guard exige negócio aprovado);
--      - as suas recompensas não se resgatam (redeem_reward exige commercial_activity_public);
--      - os destaques não aparecem (active_sponsored exige b.status = 'approved').
--   O estado anterior de cada negócio sai num RAISE NOTICE (guardar para a reversão).
--
-- O QUE NÃO FAZ
--   - Não apaga contas, perfis, papéis, reservas, pontos, provas, publicações nem ficheiros.
--   - Não apaga as sessões abertas: um token de acesso já emitido continua válido até expirar
--     (por omissão 1 hora); a renovação é recusada. [CONFIRMAR] a duração do JWT no painel do Auth.
--   - Não retira o papel admin à conta de admin QA (banida, não consegue entrar nem usar o papel).
--
-- [CONFIRMAR] ANTES DE APLICAR (leituras)
--   - Os nomes exatos e os donos de "QA Negócio A/B — não reservar" (não aparecem no repositório):
--       SELECT b.id, b.name, b.status, b.owner_id, p.is_internal FROM public.businesses b
--         LEFT JOIN public.profiles p ON p.id = b.owner_id
--        WHERE b.name ILIKE '%não reservar%' ORDER BY b.name;
--   - As 3 contas internas: SELECT id, is_internal, deleted_at FROM public.profiles WHERE is_internal;
--
-- COMO REVERTER
--   UPDATE auth.users SET banned_until = NULL
--    WHERE id IN ('c87c29c3-24de-4f0a-ab3e-5dcb7c698c53', '76b48cf2-df8b-4bc9-9c83-aa89bfac1bfa',
--                 '0c05a5bc-1653-403c-81bb-57a14e83d52f');
--   UPDATE public.businesses SET status = '<estado do NOTICE>' WHERE id = '<id do NOTICE>';  -- um por negócio
--
-- Teste: docs/security/testes/0080_disable_test_accounts.sql

DO $$
DECLARE
  ids uuid[] := ARRAY['c87c29c3-24de-4f0a-ab3e-5dcb7c698c53',   -- test tourist (0047)
                      '76b48cf2-df8b-4bc9-9c83-aa89bfac1bfa',   -- test business (0047)
                      '0c05a5bc-1653-403c-81bb-57a14e83d52f']::uuid[];  -- test admin (0047)
  names text[] := ARRAY['EKAYA Teste — não reservar', 'QA Negócio A — não reservar',
                        'QA Negócio B — não reservar'];
  n int;
  r record;
BEGIN
  SELECT count(*) INTO n FROM public.profiles WHERE id = ANY (ids) AND is_internal;
  IF n <> 3 THEN RAISE EXCEPTION 'TEST_ACCOUNTS_NOT_FOUND: % of 3 internal', n; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
                  WHERE ur.role = 'admin' AND NOT p.is_internal AND p.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'NO_REAL_ADMIN_LEFT';
  END IF;

  FOR r IN
    SELECT b.id, b.name, b.status FROM public.businesses b
     WHERE b.name = ANY (names) AND b.status <> 'suspended'
       AND (b.owner_id IS NULL OR b.owner_id IN (SELECT id FROM public.profiles WHERE is_internal))
  LOOP
    RAISE NOTICE '0080 business % (%): % -> suspended', r.name, r.id, r.status;
  END LOOP;

  -- auth.uid() is NULL here: the businesses guard (0002) lets a privileged context change status.
  UPDATE public.businesses b SET status = 'suspended', updated_at = now()
   WHERE b.name = ANY (names) AND b.status <> 'suspended'
     AND (b.owner_id IS NULL OR b.owner_id IN (SELECT id FROM public.profiles WHERE is_internal));

  UPDATE auth.users SET banned_until = 'infinity' WHERE id = ANY (ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'TEST_ACCOUNTS_NOT_BANNED: %', n; END IF;
END $$;
