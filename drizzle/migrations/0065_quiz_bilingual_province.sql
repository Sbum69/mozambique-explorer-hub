-- 0065 — Quiz in PT/EN, by province, with a difficulty and a source on every question (Bloco B).
-- * game_quiz_questions: EN text, province (null = Mozambique in general), difficulty, source_url;
-- * the 10 existing questions get their EN version and a source; "prato nacional" (no official
--   national dish) and "Obrigado em Changana" (two defensible answers) are switched off; the
--   Bazaruto question now asks for an island (Benguerra is an island, not a beach);
-- * 34 new questions from quiz_mocambique_revisto.json (decisions in docs/data/quiz-decisoes.csv);
-- * start_game_quiz picks from the province of the game plus the general ones, mixing
--   difficulties, and shuffles the options per attempt ON THE SERVER; answers come back in the
--   language of the attempt. Pass mark (70 %), scoring and anti-cheat stay on the server.
-- * game_catalog.province_id: a game tied to a province (province quizzes, passports).

ALTER TABLE public.game_quiz_questions
  ADD COLUMN question_en text,
  ADD COLUMN options_en text[],
  ADD COLUMN explanation_en text,
  ADD COLUMN province_id uuid REFERENCES public.provinces(id),
  ADD COLUMN difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  ADD COLUMN source_url text CHECK (source_url IS NULL OR source_url ~ '^https://');

UPDATE public.game_quiz_questions q SET
  question_en = v.q, options_en = v.o, explanation_en = v.e, source_url = v.s, difficulty = v.d
FROM (VALUES
  (1, 'In which year did Mozambique become independent?', ARRAY['1965','1975','1980','1992'], 'Mozambique became independent on 25 June 1975.', 'https://en.wikipedia.org/wiki/Mozambican_War_of_Independence', 'easy'),
  (2, 'What is Mozambique''s official currency?', ARRAY['Kwanza','Metical','Rand','Escudo'], 'The official currency is the metical (MZN).', 'https://en.wikipedia.org/wiki/Mozambican_metical', 'easy'),
  (3, 'Who was the first President of Mozambique?', ARRAY['Eduardo Mondlane','Samora Machel','Joaquim Chissano','Armando Guebuza'], 'Samora Machel was the first President of independent Mozambique.', 'https://en.wikipedia.org/wiki/Samora_Machel', 'medium'),
  (4, 'What is the national dish?', ARRAY['Cachupa','Matapa with xima','Funje','Muamba'], 'Switched off: Mozambique has no official national dish.', 'https://en.wikipedia.org/wiki/Matapa', 'easy'),
  (5, 'Which animal is on the flag of Mozambique?', ARRAY['Lion','Eagle','None (it has an AK-47)','Elephant'], 'The flag has no animal: it has an AK-47, the only national flag with a modern rifle.', 'https://en.wikipedia.org/wiki/Flag_of_Mozambique', 'medium'),
  (6, 'Which is the best-known traditional music genre?', ARRAY['Kizomba','Marrabenta','Semba','Kuduro'], 'Marrabenta is the most emblematic urban music genre.', 'https://en.wikipedia.org/wiki/Marrabenta', 'medium'),
  (7, 'How many provinces does Mozambique have?', ARRAY['9','10','11','12'], 'Mozambique has 11 provinces, including Maputo City.', 'https://en.wikipedia.org/wiki/Provinces_of_Mozambique', 'easy'),
  (8, 'Which language is most spoken in northern Mozambique?', ARRAY['Changana','Sena','Makhuwa','Ronga'], 'Makhuwa is the most widely spoken Bantu language in the north.', 'https://en.wikipedia.org/wiki/Makhuwa_language', 'medium'),
  (9, 'How do you say "thank you" in Changana?', ARRAY['Asante','Kanimambo','Inkomu','Obrigadu'], 'Switched off: two of the options are used for "thank you".', 'https://xitsonga.org/machangani/', 'medium'),
  (10, 'Which of these is an island of the Bazaruto Archipelago?', ARRAY['Tofo','Wimbi','Benguerra','Ponta do Ouro'], 'Benguerra is one of the islands of the Bazaruto Archipelago.', 'https://en.wikipedia.org/wiki/Bazaruto_Archipelago', 'medium')
) AS v(pos, q, o, e, s, d)
WHERE q.position = v.pos;
UPDATE public.game_quiz_questions SET active = false WHERE position IN (4, 9);
UPDATE public.game_quiz_questions SET question_pt = 'Qual destas é uma ilha do arquipélago do Bazaruto?',
  province_id = (SELECT id FROM public.provinces WHERE code = 'inhambane') WHERE position = 10;

INSERT INTO public.game_quiz_questions
  (position, question_pt, options_pt, correct_index, explanation_pt, question_en, options_en, explanation_en, province_id, difficulty, source_url, active)
SELECT 10 + row_number() OVER (), t.*, true FROM (VALUES
('Qual é a capital de Moçambique?', ARRAY['Maputo','Beira','Nampula','Quelimane']::text[], 0, 'Maputo é a capital e maior cidade do país.', 'What is the capital of Mozambique?', ARRAY['Maputo','Beira','Nampula','Quelimane']::text[], 'Maputo is the country''s capital and largest city.', NULL, 'easy', 'https://en.wikipedia.org/wiki/Maputo'),
('Qual é a língua oficial de Moçambique?', ARRAY['Espanhol','Francês','Português','Inglês']::text[], 2, 'O português é a língua oficial do país.', 'What is the official language of Mozambique?', ARRAY['Spanish','French','Portuguese','English']::text[], 'Portuguese is the country''s official language.', NULL, 'easy', 'https://www.parlamento.mz/wp-content/uploads/2022/08/Constittuicao_Republica.pdf'),
('Em que província fica o Parque Nacional da Gorongosa?', ARRAY['Sofala','Manica','Tete','Zambézia']::text[], 0, 'A Gorongosa fica na província de Sofala.', 'In which province is Gorongosa National Park?', ARRAY['Sofala','Manica','Tete','Zambézia']::text[], 'Gorongosa is in Sofala province.', (SELECT id FROM public.provinces WHERE code='sofala'), 'easy', 'https://www.anac.gov.mz/parques/gorongosa/'),
('Em que província fica o Parque Nacional do Bazaruto?', ARRAY['Gaza','Inhambane','Maputo','Sofala']::text[], 1, 'O Bazaruto fica na província de Inhambane.', 'In which province is Bazaruto National Park?', ARRAY['Gaza','Inhambane','Maputo','Sofala']::text[], 'Bazaruto is in Inhambane province.', (SELECT id FROM public.provinces WHERE code='inhambane'), 'easy', 'https://www.anac.gov.mz/en/'),
('Qual oceano banha a costa de Moçambique?', ARRAY['Atlântico','Índico','Pacífico','Árctico']::text[], 1, 'Moçambique é banhado pelo Oceano Índico a leste.', 'Which ocean borders Mozambique''s coast?', ARRAY['Atlantic','Indian','Pacific','Arctic']::text[], 'Mozambique is bordered by the Indian Ocean to the east.', NULL, 'easy', 'https://www.britannica.com/place/Mozambique'),
('Qual é o país vizinho a norte de Moçambique?', ARRAY['Tanzânia','Zâmbia','Malawi','Zimbabwe']::text[], 0, 'A Tanzânia faz fronteira com Moçambique a norte.', 'Which country borders Mozambique to the north?', ARRAY['Tanzania','Zambia','Malawi','Zimbabwe']::text[], 'Tanzania borders Mozambique to the north.', NULL, 'easy', 'https://www.cia.gov/the-world-factbook/countries/mozambique/'),
('Qual destes é um prato tradicional moçambicano?', ARRAY['Sushi','Matapa','Paella','Tacos']::text[], 1, 'A matapa é um prato tradicional de folhas de mandioca com amendoim.', 'Which of these is a traditional Mozambican dish?', ARRAY['Sushi','Matapa','Paella','Tacos']::text[], 'Matapa is a traditional dish of cassava leaves with peanut.', NULL, 'easy', 'https://en.wikipedia.org/wiki/Matapa'),
('O que é uma capulana?', ARRAY['Um instrumento musical','Um tecido tradicional','Um prato de peixe','Uma dança']::text[], 1, 'A capulana é um tecido tradicional usado em todo o país.', 'What is a capulana?', ARRAY['A musical instrument','A traditional fabric','A fish dish','A dance']::text[], 'The capulana is a traditional fabric used across the country.', NULL, 'easy', 'https://en.wikipedia.org/wiki/Capulana'),
('A praia do Tofo fica perto de que cidade?', ARRAY['Vilanculos','Inhambane','Xai-Xai','Pemba']::text[], 1, 'Tofo fica perto de Inhambane cidade.', 'Tofo Beach is near which city?', ARRAY['Vilanculos','Inhambane','Xai-Xai','Pemba']::text[], 'Tofo is near Inhambane city.', (SELECT id FROM public.provinces WHERE code='inhambane'), 'medium', 'https://www.openstreetmap.org/node/2015107648'),
('Em que província fica a cidade da Beira?', ARRAY['Sofala','Manica','Zambézia','Gaza']::text[], 0, 'A Beira é a principal cidade da província de Sofala.', 'In which province is the city of Beira?', ARRAY['Sofala','Manica','Zambézia','Gaza']::text[], 'Beira is the main city of Sofala province.', (SELECT id FROM public.provinces WHERE code='sofala'), 'easy', 'https://en.wikipedia.org/wiki/Beira,_Mozambique'),
('Em que província fica a cidade de Pemba?', ARRAY['Cabo Delgado','Nampula','Niassa','Tete']::text[], 0, 'Pemba é a capital da província de Cabo Delgado.', 'In which province is the city of Pemba?', ARRAY['Cabo Delgado','Nampula','Niassa','Tete']::text[], 'Pemba is the capital of Cabo Delgado province.', (SELECT id FROM public.provinces WHERE code='cabo-delgado'), 'easy', 'https://en.wikipedia.org/wiki/Pemba,_Mozambique'),
('Qual é o principal rio de Moçambique?', ARRAY['Nilo','Zambeze','Congo','Níger']::text[], 1, 'O Zambeze é o maior rio que atravessa o país.', 'What is Mozambique''s main river?', ARRAY['Nile','Zambezi','Congo','Niger']::text[], 'The Zambezi is the largest river crossing the country.', NULL, 'easy', 'https://en.wikipedia.org/wiki/Zambezi'),
('O Lago Niassa é partilhado por Moçambique, a Tanzânia e que outro país?', ARRAY['Zimbabwe','Malawi','Zâmbia','Quénia']::text[], 1, 'O Lago Niassa é partilhado com o Malawi (onde é chamado Lago Malawi).', 'Lake Niassa is shared by Mozambique, Tanzania and which other country?', ARRAY['Zimbabwe','Malawi','Zambia','Kenya']::text[], 'Lake Niassa is shared with Malawi (where it''s called Lake Malawi).', (SELECT id FROM public.provinces WHERE code='niassa'), 'medium', 'https://www.britannica.com/place/Lake-Nyasa'),
('A marrabenta é um género musical típico de que região?', ARRAY['Norte','Centro','Sul','Leste']::text[], 2, 'A marrabenta nasceu na região sul, especialmente em Maputo.', 'Marrabenta is a music genre typical of which region?', ARRAY['North','Centre','South','East']::text[], 'Marrabenta originated in the south, especially Maputo.', (SELECT id FROM public.provinces WHERE code='maputo-cidade'), 'medium', 'https://en.wikipedia.org/wiki/Marrabenta'),
('O timbila é um instrumento típico de que província?', ARRAY['Zambézia','Cabo Delgado','Inhambane','Tete']::text[], 2, 'A timbila é tocada pelo povo chope, na província de Inhambane.', 'The timbila is a traditional instrument from which province?', ARRAY['Zambézia','Cabo Delgado','Inhambane','Tete']::text[], 'Timbila is played by the Chopi people of Inhambane province.', (SELECT id FROM public.provinces WHERE code='inhambane'), 'medium', 'https://ich.unesco.org/en/RL/chopi-timbila-00120'),
('Em que província fica a Ilha de Moçambique?', ARRAY['Nampula','Cabo Delgado','Sofala','Zambézia']::text[], 0, 'A Ilha de Moçambique fica na província de Nampula.', 'In which province is Mozambique Island?', ARRAY['Nampula','Cabo Delgado','Sofala','Zambézia']::text[], 'Mozambique Island is in Nampula province.', (SELECT id FROM public.provinces WHERE code='nampula'), 'easy', 'https://whc.unesco.org/en/statesparties/mz/'),
('Em que província fica o Arquipélago das Quirimbas?', ARRAY['Cabo Delgado','Nampula','Niassa','Zambézia']::text[], 0, 'As Quirimbas ficam na província de Cabo Delgado.', 'In which province is the Quirimbas Archipelago?', ARRAY['Cabo Delgado','Nampula','Niassa','Zambézia']::text[], 'The Quirimbas are in Cabo Delgado province.', (SELECT id FROM public.provinces WHERE code='cabo-delgado'), 'easy', 'https://www.anac.gov.mz/en/'),
('Em que província fica o Parque Nacional do Limpopo?', ARRAY['Gaza','Maputo','Inhambane','Sofala']::text[], 0, 'O Limpopo fica na província de Gaza.', 'In which province is Limpopo National Park?', ARRAY['Gaza','Maputo','Inhambane','Sofala']::text[], 'Limpopo is in Gaza province.', (SELECT id FROM public.provinces WHERE code='gaza'), 'medium', 'https://www.anac.gov.mz/en/'),
('Em que província fica a Reserva Especial de Maputo?', ARRAY['Maputo (província)','Maputo Cidade','Gaza','Inhambane']::text[], 0, 'A Reserva Especial de Maputo fica na província de Maputo.', 'In which province is Maputo Special Reserve?', ARRAY['Maputo (province)','Maputo City','Gaza','Inhambane']::text[], 'Maputo Special Reserve is in Maputo province.', (SELECT id FROM public.provinces WHERE code='maputo'), 'medium', 'https://www.anac.gov.mz/en/'),
('A Gorongosa é conhecida por quê?', ARRAY['Praias','Restauração de vida selvagem','Deserto','Montanhas nevadas']::text[], 1, 'A Gorongosa é um exemplo de sucesso na restauração de vida selvagem.', 'What is Gorongosa known for?', ARRAY['Beaches','Wildlife restoration','Desert','Snowy mountains']::text[], 'Gorongosa is a success story in wildlife restoration.', (SELECT id FROM public.provinces WHERE code='sofala'), 'easy', 'https://www.anac.gov.mz/parques/gorongosa/'),
('O Bazaruto é conhecido por quê?', ARRAY['Deserto','Dugongos e águas claras','Neve','Vulcões']::text[], 1, 'O Bazaruto é conhecido pelos dugongos e águas cristalinas.', 'What is Bazaruto known for?', ARRAY['Desert','Dugongs and clear waters','Snow','Volcanoes']::text[], 'Bazaruto is known for dugongs and clear waters.', (SELECT id FROM public.provinces WHERE code='inhambane'), 'medium', 'https://www.anac.gov.mz/en/'),
('O Parque Nacional do Limpopo faz fronteira com que parque sul-africano?', ARRAY['Kruger','Table Mountain','Addo','Kgalagadi']::text[], 0, 'O Limpopo faz fronteira com o Parque Nacional Kruger.', 'Limpopo National Park borders which South African park?', ARRAY['Kruger','Table Mountain','Addo','Kgalagadi']::text[], 'Limpopo borders Kruger National Park.', (SELECT id FROM public.provinces WHERE code='gaza'), 'medium', 'https://www.anac.gov.mz/en/'),
('Em que ano a Ilha de Moçambique foi inscrita na UNESCO?', ARRAY['1981','1991','2001','2011']::text[], 1, 'A Ilha de Moçambique foi inscrita em 1991.', 'In which year was Mozambique Island inscribed by UNESCO?', ARRAY['1981','1991','2001','2011']::text[], 'Mozambique Island was inscribed in 1991.', (SELECT id FROM public.provinces WHERE code='nampula'), 'hard', 'https://whc.unesco.org/en/statesparties/mz/'),
('A língua changana é falada sobretudo em que províncias?', ARRAY['Maputo e Gaza','Niassa e Cabo Delgado','Sofala e Manica','Tete e Zambézia']::text[], 0, 'O changana é falado sobretudo no sul, em Maputo e Gaza.', 'Changana is mainly spoken in which provinces?', ARRAY['Maputo and Gaza','Niassa and Cabo Delgado','Sofala and Manica','Tete and Zambézia']::text[], 'Changana is mainly spoken in the south, in Maputo and Gaza.', NULL, 'medium', 'https://en.wikipedia.org/wiki/Tsonga_language'),
('A Reserva do Niassa fica em que província?', ARRAY['Niassa','Cabo Delgado','Nampula','Tete']::text[], 0, 'A Reserva do Niassa fica na província do Niassa.', 'Niassa Reserve is in which province?', ARRAY['Niassa','Cabo Delgado','Nampula','Tete']::text[], 'Niassa Reserve is in Niassa province.', (SELECT id FROM public.provinces WHERE code='niassa'), 'easy', 'https://www.anac.gov.mz/en/'),
('O Parque Nacional das Quirimbas inclui quê?', ARRAY['Só ilhas','Ilhas e área marinha','Só montanhas','Só deserto']::text[], 1, 'O parque inclui ilhas e uma área marinha protegida.', 'What does Quirimbas National Park include?', ARRAY['Only islands','Islands and a marine area','Only mountains','Only desert']::text[], 'The park includes islands and a protected marine area.', (SELECT id FROM public.provinces WHERE code='cabo-delgado'), 'medium', 'https://www.anac.gov.mz/en/'),
('Qual é o ponto mais alto de Moçambique?', ARRAY['Monte Binga','Monte Namuli','Monte Mabu','Monte Gorongosa']::text[], 0, 'O Monte Binga, com 2.436 m, é o ponto mais alto.', 'What is Mozambique''s highest point?', ARRAY['Mount Binga','Mount Namuli','Mount Mabu','Mount Gorongosa']::text[], 'Mount Binga, at 2,436 m, is the highest point.', (SELECT id FROM public.provinces WHERE code='manica'), 'hard', 'https://en.wikipedia.org/wiki/Geography_of_Mozambique'),
('Em que ano a UNESCO proclamou a timbila chope Obra-Prima do Património Oral e Imaterial?', ARRAY['1995','2005','2015','2025']::text[], 1, 'Foi proclamada em 2005 e integrada na Lista Representativa em 2008.', 'In which year did UNESCO proclaim Chopi timbila a Masterpiece of the Oral and Intangible Heritage?', ARRAY['1995','2005','2015','2025']::text[], 'It was proclaimed in 2005 and added to the Representative List in 2008.', (SELECT id FROM public.provinces WHERE code='inhambane'), 'hard', 'https://ich.unesco.org/en/RL/chopi-timbila-00120'),
('Com quantos países Moçambique faz fronteira?', ARRAY['4','5','6','7']::text[], 2, 'Moçambique faz fronteira com 6 países.', 'How many countries does Mozambique border?', ARRAY['4','5','6','7']::text[], 'Mozambique borders 6 countries.', NULL, 'medium', 'https://www.cia.gov/the-world-factbook/countries/mozambique/'),
('Em que ano o metical substituiu o escudo?', ARRAY['1975','1980','1985','1990']::text[], 1, 'O metical foi introduzido em 1980, substituindo o escudo.', 'In which year did the metical replace the escudo?', ARRAY['1975','1980','1985','1990']::text[], 'The metical was introduced in 1980, replacing the escudo.', NULL, 'hard', 'https://en.wikipedia.org/wiki/Mozambican_metical'),
('Até que ano a Ilha de Moçambique foi capital colonial?', ARRAY['1898','1918','1938','1958']::text[], 0, 'A Ilha de Moçambique foi capital colonial até 1898.', 'Until which year was Mozambique Island the colonial capital?', ARRAY['1898','1918','1938','1958']::text[], 'Mozambique Island was the colonial capital until 1898.', (SELECT id FROM public.provinces WHERE code='nampula'), 'hard', 'https://en.wikipedia.org/wiki/Island_of_Mozambique'),
('Em que ano o Parque Nacional de Maputo entrou na lista UNESCO?', ARRAY['1999','2009','2019','2025']::text[], 3, 'O Parque Nacional de Maputo entrou na lista em 2025, como extensão do iSimangaliso.', 'In which year did Maputo National Park join the UNESCO list?', ARRAY['1999','2009','2019','2025']::text[], 'Maputo National Park joined the list in 2025, as an extension of iSimangaliso.', (SELECT id FROM public.provinces WHERE code='maputo'), 'hard', 'https://whc.unesco.org/en/statesparties/mz/'),
('A Gorongosa é por vezes comparada a quê?', ARRAY['Serengeti moçambicano','Sahara','Okavango','Kalahari']::text[], 0, 'A Gorongosa é por vezes chamada o "Serengeti moçambicano".', 'Gorongosa is sometimes compared to what?', ARRAY['Mozambican Serengeti','Sahara','Okavango','Kalahari']::text[], 'Gorongosa is sometimes called the "Mozambican Serengeti".', (SELECT id FROM public.provinces WHERE code='sofala'), 'medium', 'https://www.anac.gov.mz/parques/gorongosa/'),
('O que significa ANAC?', ARRAY['Agência Nacional de Aviação Civil','Administração Nacional das Áreas de Conservação','Associação Nacional de Agricultores','Agência Nacional de Cultura']::text[], 1, 'ANAC significa Administração Nacional das Áreas de Conservação.', 'What does ANAC stand for?', ARRAY['National Civil Aviation Agency','National Administration of Conservation Areas','National Farmers'' Association','National Culture Agency']::text[], 'ANAC stands for National Administration of Conservation Areas.', NULL, 'medium', 'https://www.anac.gov.mz/en/')
) AS t(question_pt, options_pt, correct_index, explanation_pt, question_en, options_en, explanation_en, province_id, difficulty, source_url);

ALTER TABLE public.game_quiz_questions
  ALTER COLUMN question_en SET NOT NULL,
  ALTER COLUMN options_en SET NOT NULL,
  ALTER COLUMN explanation_en SET NOT NULL,
  ALTER COLUMN source_url SET NOT NULL,
  ADD CONSTRAINT game_quiz_questions_options_match CHECK (cardinality(options_en) = cardinality(options_pt));

ALTER TABLE public.game_catalog ADD COLUMN province_id uuid REFERENCES public.provinces(id);

ALTER TABLE public.game_quiz_attempts
  ADD COLUMN option_orders jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN lang text NOT NULL DEFAULT 'pt' CHECK (lang IN ('pt', 'en'));

DROP FUNCTION public.start_game_quiz(text);
CREATE FUNCTION public.start_game_quiz(_game_key text, _lang text DEFAULT 'pt')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE g public.game_catalog; ids uuid[]; aid uuid; orders jsonb := '{}'::jsonb; qid uuid; n int; lg text;
BEGIN
  g := public.game_assert_playable(_game_key);
  IF g.verification <> 'quiz' THEN RAISE EXCEPTION 'not_a_quiz'; END IF;
  lg := CASE WHEN _lang = 'en' THEN 'en' ELSE 'pt' END;
  -- Province games: that province plus the general questions. Mixed difficulty: one of each
  -- level in turn (random inside each level), province questions first on ties.
  SELECT array_agg(id) INTO ids FROM (
    SELECT x.id FROM (
      SELECT q.id, q.province_id,
             row_number() OVER (PARTITION BY q.difficulty ORDER BY random()) AS rn
        FROM public.game_quiz_questions q
       WHERE q.active AND (g.province_id IS NULL OR q.province_id IS NULL OR q.province_id = g.province_id)
    ) x ORDER BY x.rn, (x.province_id IS NOT DISTINCT FROM g.province_id) DESC, random() LIMIT 7) s;
  IF ids IS NULL THEN RAISE EXCEPTION 'no_questions'; END IF;
  -- Shuffle the options of every question on the server; the client never sees the original order.
  FOREACH qid IN ARRAY ids LOOP
    SELECT cardinality(options_pt) INTO n FROM public.game_quiz_questions WHERE id = qid;
    orders := orders || jsonb_build_object(qid::text,
      (SELECT jsonb_agg(i - 1 ORDER BY random()) FROM generate_series(1, n) i));
  END LOOP;
  INSERT INTO public.game_quiz_attempts(user_id, game_key, question_ids, option_orders, lang)
  VALUES (auth.uid(), _game_key, ids, orders, lg) RETURNING id INTO aid;
  RETURN jsonb_build_object('attempt_id', aid, 'questions',
    (SELECT jsonb_agg(jsonb_build_object(
        'id', q.id,
        'question', CASE WHEN lg = 'en' THEN q.question_en ELSE q.question_pt END,
        'options', (SELECT jsonb_agg(CASE WHEN lg = 'en' THEN q.options_en[o.v::int + 1] ELSE q.options_pt[o.v::int + 1] END ORDER BY o.k)
                      FROM jsonb_array_elements_text(orders -> q.id::text) WITH ORDINALITY o(v, k))
      ) ORDER BY t.ord)
       FROM unnest(ids) WITH ORDINALITY t(qid, ord) JOIN public.game_quiz_questions q ON q.id = t.qid));
END $function$;
REVOKE ALL ON FUNCTION public.start_game_quiz(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_game_quiz(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.answer_game_quiz(_attempt_id uuid, _question_id uuid, _choice integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE a public.game_quiz_attempts; q public.game_quiz_questions; ok boolean; perm jsonb; original int; shown_correct int;
BEGIN
  SELECT * INTO a FROM public.game_quiz_attempts WHERE id=_attempt_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_attempt'; END IF;
  IF a.finished_at IS NOT NULL THEN RAISE EXCEPTION 'attempt_finished'; END IF;
  IF NOT (_question_id = ANY(a.question_ids)) THEN RAISE EXCEPTION 'question_not_in_attempt'; END IF;
  IF a.answers ? _question_id::text THEN RAISE EXCEPTION 'already_answered'; END IF;
  SELECT * INTO q FROM public.game_quiz_questions WHERE id=_question_id;
  perm := a.option_orders -> _question_id::text;
  IF perm IS NULL THEN
    original := _choice; shown_correct := q.correct_index; -- attempts started before 0065
  ELSE
    IF _choice < 0 OR _choice >= jsonb_array_length(perm) THEN RAISE EXCEPTION 'invalid_choice'; END IF;
    original := (perm ->> _choice)::int;
    SELECT (e.k - 1)::int INTO shown_correct FROM jsonb_array_elements_text(perm) WITH ORDINALITY e(v, k)
     WHERE e.v::int = q.correct_index;
  END IF;
  ok := (original = q.correct_index);
  UPDATE public.game_quiz_attempts SET answers = answers || jsonb_build_object(_question_id::text,_choice),
    correct_count = correct_count + CASE WHEN ok THEN 1 ELSE 0 END WHERE id=_attempt_id;
  RETURN jsonb_build_object('correct', ok, 'correct_index', shown_correct,
    'explanation', CASE WHEN a.lang = 'en' THEN q.explanation_en ELSE q.explanation_pt END,
    'source_url', q.source_url);
END $function$;
