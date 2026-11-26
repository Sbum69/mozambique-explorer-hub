-- =====================================================================================
-- Guião de teste da PROPOSTA 0081 — atividades grátis sem pontos de reserva
-- -------------------------------------------------------------------------------------
-- PASSO 0 (só leitura): SELECT count(*) FROM public.points_ledger;  -- guardar (igual no fim)
--
-- Como correr: BEGIN; colar drizzle/migrations/0081_free_activities_no_booking_points.sql; colar o
-- bloco DO; ROLLBACK;   Termina SEMPRE com TEST_0081_ROLLBACK.
--
-- Usa uma reserva confirmada existente de uma conta de teste (interna) e simula, dentro da
-- transação, os dois casos mudando total_mzn antes de a concluir:
--   F1  reserva a 0 MZN concluída → 0 pontos booking_completed                    → [F1 OK]
--   P1  reserva paga (> 0) concluída → 100 pontos (comportamento de hoje)          → [P1 OK]
--   C1  commission_quote(_, 0) devolve 0 de comissão, sem erro                     → [C1 OK]
-- Se não houver reservas de contas internas, os casos F1/P1 ficam NÃO CORRIDOS.
-- =====================================================================================
DO $$
DECLARE
  r text := '';
  n int;
  b public.bookings;
  q jsonb;
BEGIN
  SELECT bk.* INTO b FROM public.bookings bk
    JOIN public.profiles p ON p.id = bk.customer_id AND p.is_internal
   WHERE bk.status IN ('pending', 'confirmed')
   ORDER BY bk.created_at LIMIT 1;

  IF b.id IS NULL THEN
    r := r || '[F1/P1 NÃO CORRIDOS: sem reserva pendente/confirmada de conta interna] ';
  ELSE
    -- F1: free booking (privileged context: guards let the status change through).
    UPDATE public.bookings SET total_mzn = 0, status = 'confirmed' WHERE id = b.id;
    UPDATE public.bookings SET status = 'completed' WHERE id = b.id;
    SELECT count(*) INTO n FROM public.points_ledger
     WHERE source_type = 'booking' AND source_id = b.id AND kind = 'award';
    r := r || CASE WHEN n = 0 THEN '[F1 OK] ' ELSE '[F1 ERRO ' || n || ' pontos] ' END;

    -- P1: paid booking — back to confirmed, a price, completed again.
    UPDATE public.bookings SET status = 'confirmed', total_mzn = 100 WHERE id = b.id;
    UPDATE public.bookings SET status = 'completed' WHERE id = b.id;
    SELECT count(*) INTO n FROM public.points_ledger
     WHERE source_type = 'booking' AND source_id = b.id AND kind = 'award' AND points = 100;
    r := r || CASE WHEN n = 1 THEN '[P1 OK] ' ELSE '[P1 ERRO ' || n || '] ' END;
  END IF;

  SELECT public.commission_quote(bz.id, 0) INTO q FROM public.businesses bz WHERE bz.status = 'approved' LIMIT 1;
  r := r || CASE WHEN (q ->> 'commission_cents')::bigint = 0 THEN '[C1 OK] ' ELSE '[C1 ERRO ' || coalesce(q::text, 'null') || '] ' END;

  RAISE EXCEPTION 'TEST_0081_ROLLBACK %', r;
END $$;
-- [CONFIRMAR] os guards de bookings (0026/0037/0070) deixam mudar total_mzn e o estado num
-- contexto sem sessão; se recusarem, o guião mostra o erro e o caso tem de ser simulado com uma
-- reserva criada pela conta de teste (ver supabase/tests/seg-2_bookings_integrity.sql).
