-- =====================================================================================
-- ADM-3 — admin_set_user_role grava a sua própria linha em admin_audit (0060)
-- -------------------------------------------------------------------------------------
-- O que testa:
--   * A: dar um papel (business_small) grava role.grant com os papéis antes e depois;
--   * B: dar de novo o mesmo papel não muda nada e não grava linha;
--   * C: retirar o papel grava role.revoke e o utilizador volta a turista;
--   * D: um não-admin (o próprio turista) é recusado (FORBIDDEN) e não grava linha;
--   * E: admin sem 2FA (aal1) é recusado e não grava linha;
--   * F: o actor_id é o admin, o entity_id é o utilizador e o reason é o papel.
-- Utilizadores escolhidos pelo papel, só contas internas (de teste); sem emails.
-- Tudo é revertido no fim (RAISE EXCEPTION).
-- Como correr: colar inteiro no SQL da Lovable Cloud (query_database), DEPOIS da 0060.
-- Resultado esperado: erro TEST_ADM3_ROLLBACK com [… PASS …] e nenhum FAIL.
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  roles text[];
  a record;
  adm uuid := (SELECT ur.user_id FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
                WHERE ur.role = 'admin' AND p.is_internal ORDER BY ur.user_id LIMIT 1);
  tgt uuid := (SELECT p.id FROM public.profiles p
                WHERE p.is_internal
                  AND EXISTS (SELECT 1 FROM public.user_roles t WHERE t.user_id = p.id AND t.role = 'tourist')
                  AND NOT EXISTS (SELECT 1 FROM public.user_roles o WHERE o.user_id = p.id AND o.role <> 'tourist')
                  AND NOT EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = p.id)
                ORDER BY p.id LIMIT 1);
  base int := (SELECT count(*) FROM public.admin_audit);
BEGIN
  IF adm IS NULL OR tgt IS NULL THEN RAISE EXCEPTION 'TEST_ADM3_SETUP adm=% tgt=%', adm, tgt; END IF;

  -- ---------- A: grant ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  roles := public.admin_set_user_role(tgt, 'business_small', true);
  RESET ROLE;
  SELECT * INTO a FROM public.admin_audit WHERE created_at = now() AND action = 'role.grant' LIMIT 1;
  r := r || CASE WHEN (SELECT count(*) FROM public.admin_audit) = base + 1 AND a.action = 'role.grant'
                  AND a.before = '{"roles":["tourist"]}'::jsonb AND a.after = '{"roles":["business_small"]}'::jsonb
                 THEN ' A-grant:PASS' ELSE ' A-grant:FAIL(' || coalesce(a.action, '-') || ')' END;
  r := r || CASE WHEN a.actor_id = adm AND a.entity = 'user_roles' AND a.entity_id = tgt::text
                  AND a.reason = 'business_small' THEN ' F-fields:PASS' ELSE ' F-fields:FAIL' END;

  -- ---------- B: grant again, no change ----------
  SET LOCAL ROLE authenticated;
  roles := public.admin_set_user_role(tgt, 'business_small', true);
  RESET ROLE;
  r := r || CASE WHEN (SELECT count(*) FROM public.admin_audit) = base + 1 THEN ' B-no-change:PASS' ELSE ' B-no-change:FAIL' END;

  -- ---------- C: revoke ----------
  SET LOCAL ROLE authenticated;
  roles := public.admin_set_user_role(tgt, 'business_small', false);
  RESET ROLE;
  SELECT * INTO a FROM public.admin_audit WHERE created_at = now() AND action = 'role.revoke' LIMIT 1;
  r := r || CASE WHEN (SELECT count(*) FROM public.admin_audit) = base + 2 AND a.action = 'role.revoke'
                  AND a.after = '{"roles":["tourist"]}'::jsonb AND roles = ARRAY['tourist']
                 THEN ' C-revoke:PASS' ELSE ' C-revoke:FAIL' END;

  -- ---------- D: not an admin ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tgt, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    roles := public.admin_set_user_role(tgt, 'admin', true);
    r := r || ' D-forbidden:FAIL';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' D-forbidden:PASS' ELSE ' D-forbidden:FAIL(' || SQLERRM || ')' END;
  END;
  RESET ROLE;

  -- ---------- E: admin without 2FA ----------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    roles := public.admin_set_user_role(tgt, 'business_small', true);
    r := r || ' E-aal1:FAIL';
  EXCEPTION WHEN OTHERS THEN
    r := r || CASE WHEN SQLERRM = 'FORBIDDEN' THEN ' E-aal1:PASS' ELSE ' E-aal1:FAIL(' || SQLERRM || ')' END;
  END;
  RESET ROLE;
  SELECT count(*) INTO n FROM public.admin_audit;
  r := r || CASE WHEN n = base + 2 THEN ' DE-no-rows:PASS' ELSE ' DE-no-rows:FAIL' END;

  RAISE EXCEPTION 'TEST_ADM3_ROLLBACK [%]', r;
END $$;
