-- =====================================================================================
-- CONTENT-2 — políticas do bucket content-photos (0059)
-- -------------------------------------------------------------------------------------
-- O que testa (a pasta é o id do negócio: "<business_id>/<ficheiro>"):
--   * o dono envia para a pasta do seu negócio → aceite;
--   * o dono envia para a pasta de outro negócio → recusado;
--   * um turista → recusado;
--   * o admin (aal2) → aceite;
--   * o dono não move um ficheiro para a pasta de outro negócio (WITH CHECK do UPDATE).
-- Utilizadores escolhidos pelo papel. Nenhum ficheiro real é criado: só a linha em
-- storage.objects, revertida no fim.
-- Como correr: colar no SQL da Lovable Cloud, DEPOIS da 0059. Resultado: TEST_CONTENT2_ROLLBACK.
-- Confirmar: SELECT count(*) FROM storage.objects WHERE name LIKE '%content2-test%'; -- 0
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  adm uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' ORDER BY ur.user_id LIMIT 1);
  biz uuid; own uuid; other_biz uuid;
  tour uuid := (SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'tourist'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles a WHERE a.user_id = ur.user_id AND a.role <> 'tourist')
     AND NOT EXISTS (SELECT 1 FROM public.businesses x WHERE x.owner_id = ur.user_id) ORDER BY ur.user_id LIMIT 1);
BEGIN
  SELECT b.id, b.owner_id INTO biz, own FROM public.businesses b WHERE b.owner_id IS NOT NULL ORDER BY b.name LIMIT 1;
  SELECT b.id INTO other_biz FROM public.businesses b WHERE b.id <> biz AND b.owner_id IS DISTINCT FROM own ORDER BY b.name LIMIT 1;
  IF biz IS NULL OR other_biz IS NULL OR tour IS NULL OR adm IS NULL THEN
    RAISE EXCEPTION 'TEST_CONTENT2_SETUP biz=% other=% tourist=% admin=%', biz, other_biz, tour, adm;
  END IF;

  -- Owner, own folder
  PERFORM set_config('request.jwt.claims', json_build_object('sub', own, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('content-photos', biz::text || '/content2-test-own.jpg', own);
    r := r || ' A-owner-own-folder:PASS';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' A-owner-own-folder:FAIL(refused)';
  END;
  -- Owner, other business's folder
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('content-photos', other_biz::text || '/content2-test-other.jpg', own);
    r := r || ' B-owner-other-folder:FAIL(accepted)';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' B-owner-other-folder:PASS';
  END;
  -- Owner cannot move an own file into another business's folder
  BEGIN
    UPDATE storage.objects SET name = other_biz::text || '/content2-test-moved.jpg'
     WHERE bucket_id = 'content-photos' AND name = biz::text || '/content2-test-own.jpg';
    GET DIAGNOSTICS n = ROW_COUNT;
    r := r || CASE WHEN n = 0 THEN ' C-owner-move-out:PASS(0 rows)' ELSE ' C-owner-move-out:FAIL(moved)' END;
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' C-owner-move-out:PASS';
  END;
  RESET ROLE;

  -- Tourist
  PERFORM set_config('request.jwt.claims', json_build_object('sub', tour, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('content-photos', biz::text || '/content2-test-tourist.jpg', tour);
    r := r || ' D-tourist:FAIL(accepted)';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' D-tourist:PASS';
  END;
  RESET ROLE;

  -- Admin with two-step verification
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('content-photos', other_biz::text || '/content2-test-admin.jpg', adm);
    r := r || ' E-admin:PASS';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' E-admin:FAIL(refused)';
  END;
  RESET ROLE;

  -- Admin without two-step verification is not admin
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated', 'aal', 'aal1')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('content-photos', other_biz::text || '/content2-test-admin-aal1.jpg', adm);
    r := r || ' F-admin-aal1:FAIL(accepted)';
  EXCEPTION WHEN insufficient_privilege THEN r := r || ' F-admin-aal1:PASS';
  END;
  RESET ROLE;

  RAISE EXCEPTION 'TEST_CONTENT2_ROLLBACK %', r;
END $$;
