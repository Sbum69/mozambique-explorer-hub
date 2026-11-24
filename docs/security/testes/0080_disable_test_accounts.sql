-- =====================================================================================
-- Guião de teste da PROPOSTA 0080 — desativar as contas de teste sem apagar nada
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura, ANTES de aplicar): correr as consultas [CONFIRMAR] do cabeçalho da 0080 e
-- guardar estas contagens (têm de ser iguais no fim):
--   SELECT count(*) FROM public.points_ledger;   SELECT count(*) FROM public.bookings;
--   SELECT count(*) FROM public.profiles;        SELECT count(*) FROM auth.users;
--
-- Como correr: BEGIN; colar só o bloco DO abaixo (já inclui as escritas da 0080); ROLLBACK;
-- Termina SEMPRE com TEST_0080_ROLLBACK.
--
-- Casos (depois da 0080, dentro da transação):
--   B1  as 3 contas de teste têm banned_until = infinity                        → [B1 OK]
--   B2  nenhuma outra conta ficou banida por esta migração                       → [B2 OK]
--   S1  os negócios de teste de contas internas estão suspensos                  → [S1 OK]
--   S2  o anon já não vê nenhum negócio "… não reservar"                         → [S2 OK]
--   K1  nada foi apagado: points_ledger, bookings, profiles e auth.users iguais  → [K1 OK]
--   P1  o perfil e os papéis das contas de teste continuam a existir             → [P1 OK]
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  ids uuid[] := ARRAY['c87c29c3-24de-4f0a-ab3e-5dcb7c698c53', '76b48cf2-df8b-4bc9-9c83-aa89bfac1bfa',
                      '0c05a5bc-1653-403c-81bb-57a14e83d52f']::uuid[];
  c_points int; c_bookings int; c_profiles int; c_users int; c_banned int;
BEGIN
  -- Estado antes (a 0080 tem de ser colada DEPOIS destas contagens: ver nota no fim).
  SELECT count(*) INTO c_points FROM public.points_ledger;
  SELECT count(*) INTO c_bookings FROM public.bookings;
  SELECT count(*) INTO c_profiles FROM public.profiles;
  SELECT count(*) INTO c_users FROM auth.users;
  SELECT count(*) INTO c_banned FROM auth.users WHERE banned_until = 'infinity' AND NOT (id = ANY (ids));

  -- Corpo da 0080 (igual ao ficheiro; repetido aqui para as contagens "antes" ficarem certas).
  PERFORM 1 FROM public.profiles WHERE id = ANY (ids) AND is_internal;
  UPDATE public.businesses b SET status = 'suspended', updated_at = now()
   WHERE b.name IN ('EKAYA Teste — não reservar', 'QA Negócio A — não reservar', 'QA Negócio B — não reservar')
     AND b.status <> 'suspended'
     AND (b.owner_id IS NULL OR b.owner_id IN (SELECT id FROM public.profiles WHERE is_internal));
  UPDATE auth.users SET banned_until = 'infinity' WHERE id = ANY (ids);

  SELECT count(*) INTO n FROM auth.users WHERE id = ANY (ids) AND banned_until = 'infinity';
  r := r || CASE WHEN n = 3 THEN '[B1 OK] ' ELSE '[B1 ERRO ' || n || '] ' END;
  SELECT count(*) INTO n FROM auth.users WHERE banned_until = 'infinity' AND NOT (id = ANY (ids));
  r := r || CASE WHEN n = c_banned THEN '[B2 OK] ' ELSE '[B2 ERRO] ' END;

  SELECT count(*) INTO n FROM public.businesses b
   WHERE b.name ILIKE '%não reservar%' AND b.status <> 'suspended'
     AND (b.owner_id IS NULL OR b.owner_id IN (SELECT id FROM public.profiles WHERE is_internal));
  r := r || CASE WHEN n = 0 THEN '[S1 OK] ' ELSE '[S1 ERRO ' || n || ' por suspender] ' END;

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO n FROM public.businesses WHERE name ILIKE '%não reservar%';
  RESET ROLE;
  r := r || CASE WHEN n = 0 THEN '[S2 OK] ' ELSE '[S2 ERRO anon vê ' || n || '] ' END;

  r := r || CASE WHEN (SELECT count(*) FROM public.points_ledger) = c_points
                  AND (SELECT count(*) FROM public.bookings) = c_bookings
                  AND (SELECT count(*) FROM public.profiles) = c_profiles
                  AND (SELECT count(*) FROM auth.users) = c_users
                 THEN '[K1 OK] ' ELSE '[K1 ERRO algo foi apagado] ' END;

  SELECT count(*) INTO n FROM public.user_roles WHERE user_id = ANY (ids);
  r := r || CASE WHEN n >= 3 THEN '[P1 OK] ' ELSE '[P1 ERRO ' || n || '] ' END;

  RAISE EXCEPTION 'TEST_0080_ROLLBACK %', r;
END $$;
-- Nota: este guião repete as duas escritas da 0080 para medir o "antes". Correr também, noutra
-- transação com ROLLBACK, o ficheiro da 0080 tal como está, para confirmar as verificações
-- TEST_ACCOUNTS_NOT_FOUND e NO_REAL_ADMIN_LEFT (devem passar sem erro na produção).
