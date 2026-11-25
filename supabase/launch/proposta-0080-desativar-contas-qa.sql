-- =====================================================================================
-- PROPOSTA 0080 — DESATIVAR (NÃO APAGAR) AS CONTAS QA E OS NEGÓCIOS DE TESTE.  NÃO APLICADA.
-- -------------------------------------------------------------------------------------
-- Aprovação explícita obrigatória (escrita). Substitui, para este fim, o launch-day.sql, que APAGA.
--
-- O que faz (idempotente: correr duas vezes dá o mesmo resultado):
--   1. Encontra as 3 contas QA pelos ids da migração 0047 (turista, negócio, admin), que estão
--      marcadas profiles.is_internal. Pára se não forem exatamente 3 contas internas.
--   2. Pára se, depois, não ficar pelo menos 1 administrador real (não interno, não apagado).
--   3. Contas: auth.users.banned_until = 'infinity'. O Auth recusa o login e a renovação da sessão.
--   4. Negócios "EKAYA Teste — não reservar" e "QA Negócio A — não reservar": status = 'suspended',
--      só se o dono for uma conta interna ou não houver dono.
--      Um negócio suspenso sai do catálogo público, não recebe reservas, as suas recompensas não
--      se resgatam e os destaques não aparecem.
--   5. Verificação final dentro da transação. Se alguma falhar, tudo é revertido (RAISE EXCEPTION).
--
-- O que NÃO faz: não apaga linhas. points_ledger, reservas, perfis, papéis, notificações,
-- provas, publicações e ficheiros ficam todos.
--   Também não apaga sessões: um token de acesso já emitido vale até expirar (por omissão 1 h)
--   [CONFIRMAR no painel do Auth].
--
-- Como correr (SQL da Lovable Cloud):
--   1. Ensaio: correr tudo como está (termina em ROLLBACK). Ver os NOTICE: "0080 OK …" e o estado
--      anterior de cada negócio.
--   2. Aplicar: trocar ROLLBACK por COMMIT e correr de novo; depois a verificação do fim do ficheiro.
--
-- [CONFIRMAR] antes: o nome exato do "QA Negócio A — não reservar" (não está no repositório):
--   SELECT b.id, b.name, b.status, b.owner_id, p.is_internal FROM public.businesses b
--     LEFT JOIN public.profiles p ON p.id = b.owner_id WHERE b.name ILIKE '%não reservar%';
--
-- Reverter (depois de um COMMIT):
--   UPDATE auth.users SET banned_until = NULL
--    WHERE id IN ('c87c29c3-24de-4f0a-ab3e-5dcb7c698c53', '76b48cf2-df8b-4bc9-9c83-aa89bfac1bfa',
--                 '0c05a5bc-1653-403c-81bb-57a14e83d52f');
--   UPDATE public.businesses SET status = '<estado do NOTICE>' WHERE id = '<id do NOTICE>';
--
-- Nota: o branch feat/suporte-recompensas tem drizzle/migrations/0080_disable_test_accounts.sql
-- com o mesmo fim (e também "QA Negócio B"). Fica só uma das duas [DECIDIR].
-- =====================================================================================
BEGIN;

DO $$
DECLARE
  qa uuid[] := ARRAY['c87c29c3-24de-4f0a-ab3e-5dcb7c698c53',   -- turista QA (0047)
                     '76b48cf2-df8b-4bc9-9c83-aa89bfac1bfa',   -- negócio QA (0047)
                     '0c05a5bc-1653-403c-81bb-57a14e83d52f']::uuid[];  -- admin QA (0047)
  names text[] := ARRAY['EKAYA Teste — não reservar', 'QA Negócio A — não reservar'];
  n int;
  r record;
  c_points int := (SELECT count(*) FROM public.points_ledger);
  s_points bigint := (SELECT coalesce(sum(points), 0) FROM public.points_ledger);
  c_bookings int := (SELECT count(*) FROM public.bookings);
  c_profiles int := (SELECT count(*) FROM public.profiles);
  c_users int := (SELECT count(*) FROM auth.users);
  c_businesses int := (SELECT count(*) FROM public.businesses);
BEGIN
  -- 1. As 3 contas QA, internas.
  SELECT count(*) INTO n FROM public.profiles WHERE id = ANY (qa) AND is_internal;
  IF n <> 3 THEN RAISE EXCEPTION '0080: esperadas 3 contas QA internas, encontradas %', n; END IF;

  -- 2. Fica pelo menos 1 admin real.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
                  WHERE ur.role = 'admin' AND NOT p.is_internal AND p.deleted_at IS NULL) THEN
    RAISE EXCEPTION '0080: não fica nenhum administrador real';
  END IF;

  -- 3. Banir as contas (idempotente).
  UPDATE auth.users SET banned_until = 'infinity'
   WHERE id = ANY (qa) AND banned_until IS DISTINCT FROM 'infinity';

  -- 4. Suspender os negócios de teste (idempotente; o estado anterior sai no NOTICE).
  FOR r IN SELECT b.id, b.name, b.status FROM public.businesses b
            WHERE b.name = ANY (names) AND b.status <> 'suspended'
              AND (b.owner_id IS NULL OR b.owner_id IN (SELECT id FROM public.profiles WHERE is_internal))
  LOOP
    RAISE NOTICE '0080 negócio % (%): % -> suspended', r.name, r.id, r.status;
  END LOOP;
  -- Sem sessão (auth.uid() NULL): o guard de businesses (0002) deixa mudar o estado.
  UPDATE public.businesses b SET status = 'suspended', updated_at = now()
   WHERE b.name = ANY (names) AND b.status <> 'suspended'
     AND (b.owner_id IS NULL OR b.owner_id IN (SELECT id FROM public.profiles WHERE is_internal));

  -- 5. Verificação final (dentro da transação).
  SELECT count(*) INTO n FROM auth.users WHERE id = ANY (qa) AND banned_until = 'infinity';
  IF n <> 3 THEN RAISE EXCEPTION '0080 FALHA: % de 3 contas banidas', n; END IF;

  SELECT count(*) INTO n FROM public.businesses b
   WHERE b.name = ANY (names) AND b.status <> 'suspended'
     AND (b.owner_id IS NULL OR b.owner_id IN (SELECT id FROM public.profiles WHERE is_internal));
  IF n <> 0 THEN RAISE EXCEPTION '0080 FALHA: % negócio(s) de teste por suspender', n; END IF;

  IF (SELECT count(*) FROM public.points_ledger) <> c_points
     OR (SELECT coalesce(sum(points), 0) FROM public.points_ledger) <> s_points THEN
    RAISE EXCEPTION '0080 FALHA: points_ledger mudou';
  END IF;
  IF (SELECT count(*) FROM public.bookings) <> c_bookings
     OR (SELECT count(*) FROM public.profiles) <> c_profiles
     OR (SELECT count(*) FROM auth.users) <> c_users
     OR (SELECT count(*) FROM public.businesses) <> c_businesses THEN
    RAISE EXCEPTION '0080 FALHA: alguma linha foi apagada';
  END IF;

  RAISE NOTICE '0080 OK: 3 contas banidas; negócios de teste suspensos; points_ledger (% linhas, soma %) e restantes tabelas intactos',
    c_points, s_points;
END $$;

ROLLBACK;  -- ensaio. Para aplicar: trocar por COMMIT.

-- =====================================================================================
-- Verificação (só leitura), depois do COMMIT:
-- SELECT id, banned_until FROM auth.users WHERE id IN ('c87c29c3-24de-4f0a-ab3e-5dcb7c698c53',
--   '76b48cf2-df8b-4bc9-9c83-aa89bfac1bfa', '0c05a5bc-1653-403c-81bb-57a14e83d52f');   -- 3 × infinity
-- SELECT name, status FROM public.businesses WHERE name ILIKE '%não reservar%';         -- suspended
-- SELECT count(*), sum(points) FROM public.points_ledger;                               -- igual ao NOTICE
-- No browser: login com a conta QA recusado; /businesses (separador anónimo) sem os negócios de teste.
-- =====================================================================================
