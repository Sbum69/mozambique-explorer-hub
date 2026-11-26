-- 0081 — Atividades com preço 0: já são aceites; esta proposta fecha o risco dos pontos (PROPOSTA, não aplicada).
--
-- ANÁLISE (pedido: "permitir atividades com preço 0; hoje a validação exige preço > 0")
--   O preço 0 JÁ É ACEITE em todo o lado. A frase "a validação exige preço maior que 0"
--   (docs/content/GUIA-CONTEUDO.md §6, repetida em docs/content/RECRUTAMENTO.md) está desatualizada:
--   - tabela: CHECK experiences_price_non_negative (price_mzn >= 0) (migração original);
--   - formulário do painel: activitySchema priceMzn z.number().min(0) (src/lib/business-management.ts);
--     campo com min = 0 (BusinessManagement.tsx);
--   - prontidão para ativar: só recusa price_mzn IS NULL OR < 0 (0051 experience_missing);
--   - importação CSV: só recusa price < 0 (0051 admin_import_content).
--   Por isso não é preciso mudar nenhuma validação.
--
-- IMPACTO DO PREÇO 0
--   - Reservas: total_mzn = price × pessoas = 0. CHECK bookings_total_mzn_non_negative (>= 0) aceita.
--     A capacidade, os horários e o fluxo pendente → confirmada → concluída são iguais.  OK
--   - Comissões: commission_quote aceita 0 (só recusa < 0); split 0/0/0 e o CHECK
--     snapshot_reconciles (gross = commission + fee + net) passa com 0 = 0 + 0 + 0.  OK
--   - Recibos: o recibo da app (/recibo/$id) é dos destaques (sponsored_placements), não das
--     reservas. Não depende do preço das atividades.  OK
--   - Preço mostrado: formatPrice(0) mostra "Grátis"/"Free" no catálogo e no detalhe (src/lib/price.ts).
--     MAS a lista de reservas (src/routes/bookings.tsx:336 e :384) e a confirmação da reserva
--     (src/routes/experiences.tsx:802) mostram "0 MZN" em vez de "Grátis".  COSMÉTICO (não muda aqui)
--   - **Pontos: PARTE.** points_on_booking dá 100 pontos (booking_completed) a cada reserva concluída,
--     seja qual for o preço. Com atividades a 0 MZN, um turista e um negócio podem juntar pontos
--     sem custo (reservar → o negócio confirma → conclui), e trocá-los por recompensas. A 0070 só
--     bloqueia o caso em que o cliente é o dono do negócio.  ← esta proposta
--
-- O QUE MUDA
--   points_on_booking: sem pontos quando NEW.total_mzn = 0 (atividade grátis). O resto da função é
--   igual à 0070 (sem pontos para o dono do próprio negócio; a reversão fica igual). Pontos já
--   atribuídos NÃO são apagados nem revertidos.
--
-- [DECIDIR] Alternativa: dar pontos a atividades grátis, mas com limite (ex.: 1 por dia por
-- turista). Esta proposta segue a regra mais simples (0 MZN = 0 pontos).
--
-- COMO REVERTER: correr de novo a definição de points_on_booking da
-- drizzle/migrations/0070_bookings_own_business_and_start_time.sql.
--
-- Teste: docs/security/testes/0081_free_activities.sql

CREATE OR REPLACE FUNCTION public.points_on_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    -- 0070: no points when the customer owns the business; 0081: no points for free activities.
    IF coalesce(NEW.total_mzn, 0) > 0 AND NOT EXISTS (
      SELECT 1 FROM public.businesses b
       WHERE b.id = NEW.business_id AND b.owner_id = NEW.customer_id
    ) THEN
      INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
      VALUES (NEW.customer_id, public.points_value('booking_completed'),'award','booking_completed','booking',NEW.id)
      ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
    END IF;
  ELSIF OLD.status='completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.points_ledger(user_id,points,kind,reason,source_type,source_id)
    SELECT l.user_id, -l.points,'reversal','booking_completed','booking',NEW.id FROM public.points_ledger l
     WHERE l.user_id=OLD.customer_id AND l.source_type='booking' AND l.source_id=NEW.id AND l.kind='award'
    ON CONFLICT ON CONSTRAINT points_ledger_once DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;
