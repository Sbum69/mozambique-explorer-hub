-- 0082 — Destino para a Cidade de Maputo (PROPOSTA, não aplicada). Provavelmente SEM EFEITO na produção.
--
-- ANÁLISE
--   O pedido parte de docs/content/GUIA-CONTEUDO.md §6 ("não há nenhum destino nessa província").
--   Essa frase está desatualizada: a 0052 (aplicada, no journal) já passou o destino "Maputo"
--   (slug 'maputo': a capital, coordenadas -25.9692, 32.5732 = Wikidata Q3889, -25.96889, 32.57333)
--   para a província 'maputo-cidade'. O painel só deixa escolher destinos da província do negócio
--   (BusinessManagement.tsx filtra por province_id; o servidor recusa com INVALID_DESTINATION em
--   business-management.functions.ts), por isso um negócio da Cidade de Maputo JÁ consegue escolher
--   "Maputo".
--   Quem fica sem destino é a PROVÍNCIA de Maputo (0052: "left without a destination until a real
--   one is chosen"). Esta proposta não lhe cria nenhum: escolher o sítio é uma decisão [DECIDIR],
--   e as coordenadas teriam de vir de uma fonte verificável.
--
-- O QUE FAZ (idempotente)
--   Só se a província 'maputo-cidade' existir e não tiver NENHUM destino, cria o destino
--   "Cidade de Maputo" com as coordenadas que a 0052 documentou (Wikidata Q3889). Se o destino
--   'maputo' já lá estiver (o esperado), não faz nada.
--   Não preenche descrições, destaques, visitantes nem fotografias (sem dados inventados): o
--   destino fica sem texto até alguém o escrever com fonte.
--
-- [CONFIRMAR] ANTES DE APLICAR (leituras)
--   SELECT p.code, d.slug, d.name, d.lat, d.lng FROM public.provinces p
--     LEFT JOIN public.destinations d ON d.province_id = p.id
--    WHERE p.code LIKE 'maputo%' ORDER BY 1, 2;   -- [CONFIRMAR] o código da província de Maputo
--   Esperado: 'maputo-cidade' com o destino 'maputo'; 'maputo' (província) sem destino.
--   Se assim for, esta migração não é precisa.
--   Confirmar também as coordenadas na fonte (https://www.wikidata.org/wiki/Q3889) e o nome a mostrar.
--
-- COMO REVERTER (só se a migração tiver criado o destino)
--   DELETE FROM public.destinations WHERE slug = 'cidade-de-maputo'
--     AND NOT EXISTS (SELECT 1 FROM public.experiences e
--                      JOIN public.destinations d ON d.id = e.destination_id WHERE d.slug = 'cidade-de-maputo');
--
-- Teste: docs/security/testes/0082_maputo_city_destination.sql

INSERT INTO public.destinations (slug, name, province, province_id, lat, lng, category)
SELECT 'cidade-de-maputo', 'Cidade de Maputo', p.code, p.id, -25.96889, 32.57333, 'city'
  FROM public.provinces p
 WHERE p.code = 'maputo-cidade'
   AND NOT EXISTS (SELECT 1 FROM public.destinations d WHERE d.province_id = p.id)
ON CONFLICT (slug) DO NOTHING;
