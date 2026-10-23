-- Bloco 8C: Experiências Comunitárias (gratuitas, sem reserva), separadas de public.experiences
CREATE TABLE IF NOT EXISTS public.community_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_pt text NOT NULL,
  title_en text NOT NULL,
  description_pt text NOT NULL,
  description_en text NOT NULL,
  province_id uuid NOT NULL REFERENCES public.provinces(id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (category IN ('beach','culture','food','nature','community','adventure')),
  location text NOT NULL DEFAULT '',
  lat numeric CHECK (lat BETWEEN -90 AND 90),
  lng numeric CHECK (lng BETWEEN -180 AND 180),
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_experiences_province_title_key UNIQUE (province_id, title_pt)
);

CREATE INDEX IF NOT EXISTS community_experiences_province_idx ON public.community_experiences (province_id);
CREATE INDEX IF NOT EXISTS community_experiences_category_idx ON public.community_experiences (category);

GRANT SELECT ON public.community_experiences TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_experiences TO authenticated;
GRANT ALL ON public.community_experiences TO service_role;

ALTER TABLE public.community_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active community experiences"
  ON public.community_experiences FOR SELECT TO anon, authenticated
  USING (active = true);
CREATE POLICY "Admins read all community experiences"
  ON public.community_experiences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert community experiences"
  ON public.community_experiences FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update community experiences"
  ON public.community_experiences FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete community experiences"
  ON public.community_experiences FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER community_experiences_set_updated_at
  BEFORE UPDATE ON public.community_experiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Importação dos dados reais fornecidos (idempotente: não duplica se correr outra vez)
INSERT INTO public.community_experiences
  (title_pt, title_en, description_pt, description_en, province_id, category, location, lat, lng)
SELECT v.title_pt, v.title_en, v.description_pt, v.description_en, p.id, v.category, v.location, v.lat, v.lng
FROM (VALUES
  -- Maputo
  ('maputo','Praia de Ponta do Ouro','Ponta do Ouro Beach','Praia de areia branca junto à fronteira com a África do Sul, popular para caminhadas, observação de golfinhos e tartarugas.','White-sand beach near the South African border, popular for walks and for watching dolphins and turtles.','beach','Ponta do Ouro, sul de Maputo',-26.85,32.93),
  ('maputo','Estação Ferroviária de Maputo','Maputo Railway Station','Edifício histórico com arquitetura emblemática, aberto para visita e fotografia no centro da cidade.','Historic building with iconic architecture, open for visits and photography in the city centre.','culture','Baixa de Maputo',-25.965,32.573),
  ('maputo','Mercado Municipal de Maputo (Mercado do Peixe)','Maputo Municipal Market (Fish Market)','Mercado tradicional onde se observa a venda diária de peixe e produtos locais, sem custo para circular.','Traditional market where you can watch the daily sale of fish and local produce, free to walk around.','food','Avenida 24 de Julho, Maputo',-25.967,32.577),
  ('maputo','Reserva Especial de Maputo (áreas de acesso público)','Maputo Special Reserve (public access areas)','Zonas costeiras e dunas adjacentes à reserva com trilhos naturais e observação de aves.','Coastal areas and dunes next to the reserve with nature trails and birdwatching.','nature','Sul da província de Maputo',-26.10,32.80),
  ('maputo','Feira de Artesanato e Cultura (FEIMA)','Crafts and Culture Fair (FEIMA)','Feira semanal de artesanato, música e gastronomia com entrada livre em certos dias/áreas.','Weekly crafts, music and food fair with free entry on certain days/areas.','community','Maputo (local varia; frequentemente na marginal)',-25.96,32.58),
  ('maputo','Caminhada na Praia da Macaneta','Walk on Macaneta Beach','Longa faixa de areia entre o Oceano Índico e a Baía de Maputo, acessível para caminhadas e piqueniques.','Long stretch of sand between the Indian Ocean and Maputo Bay, open for walks and picnics.','adventure','Península da Macaneta',-25.88,32.70),
  -- Inhambane
  ('inhambane','Praia do Tofo','Tofo Beach','Praia famosa por águas calmas, observação de tubarões-baleia e raias (da areia).','Beach famous for calm waters and for spotting whale sharks and rays (from the shore).','beach','Tofo, Inhambane',-23.85,35.55),
  ('inhambane','Centro Histórico de Inhambane','Inhambane Historic Centre','Ruas com arquitetura colonial, igreja e palácio do governador para passeio a pé.','Streets with colonial architecture, a church and the governor''s palace for a walking tour.','culture','Cidade de Inhambane',-23.865,35.417),
  ('inhambane','Mercado de Inhambane','Inhambane Market','Mercado local com frutas, especiarias e peixe fresco, ótimo para observar a vida quotidiana.','Local market with fruit, spices and fresh fish, great for observing everyday life.','food','Centro de Inhambane',-23.866,35.418),
  ('inhambane','Dunas e mangais de Barra','Barra dunes and mangroves','Área natural com dunas, coqueiros e mangais, ideal para caminhadas e observação de aves.','Natural area with dunes, coconut palms and mangroves, ideal for walks and birdwatching.','nature','Barra, norte da península de Inhambane',-23.80,35.50),
  ('inhambane','Festival Chopi (Quissico)','Chopi Festival (Quissico)','Festival de música tradicional Chopi com mbila, danças e rituais comunitários (em datas específicas).','Traditional Chopi music festival with mbila, dances and community rituals (on specific dates).','community','Quissico, Inhambane',-24.70,35.20),
  ('inhambane','Snorkel livre na barreira de Tofo','Free snorkelling on the Tofo reef','Barreira de coral próxima à costa onde é possível fazer snorkel sem pagar (levando o próprio equipamento).','Coral reef close to the shore where you can snorkel for free (bring your own equipment).','adventure','Frente à Praia do Tofo',-23.84,35.56),
  -- Gaza
  ('gaza','Praia de Xai-Xai','Xai-Xai Beach','Longa praia com recife de coral e águas calmas, acessível para banho e caminhadas.','Long beach with a coral reef and calm waters, open for swimming and walks.','beach','Xai-Xai, Gaza',-25.05,33.64),
  ('gaza','Mercado de Xai-Xai','Xai-Xai Market','Mercado urbano com produtos agrícolas, peixe e artesanato local.','Urban market with farm produce, fish and local crafts.','food','Centro de Xai-Xai',-25.052,33.642),
  ('gaza','Igreja e arquitetura colonial de Xai-Xai','Xai-Xai church and colonial architecture','Pequeno circuito a pé pelo centro histórico com edifícios coloniais.','Short walking circuit through the historic centre with colonial buildings.','culture','Centro de Xai-Xai',-25.053,33.640),
  ('gaza','Lagoa de Xai-Xai e zonas húmidas do Limpopo','Xai-Xai lagoon and Limpopo wetlands','Área natural próxima à foz do Limpopo, boa para observação de aves e paisagens.','Natural area near the mouth of the Limpopo, good for birdwatching and scenery.','nature','Arredores de Xai-Xai',-25.07,33.60),
  ('gaza','Comunidades de pescadores na costa de Gaza','Fishing communities on the Gaza coast','Visita a aldeias de pescadores (ex.: Závora) para observar técnicas tradicionais e vida comunitária.','Visit fishing villages (e.g. Závora) to observe traditional techniques and community life.','community','Závora e arredores',-24.73,35.35),
  ('gaza','Caminhada nas dunas e falésias de Xai-Xai','Walk on the Xai-Xai dunes and cliffs','Trilho informal ao longo das dunas e falésias costeiras.','Informal trail along the coastal dunes and cliffs.','adventure','Praia de Xai-Xai',-25.04,33.65),
  -- Sofala
  ('sofala','Praia Nova (Beira)','Praia Nova (Beira)','Praia urbana da Beira, usada para caminhadas e contemplação do mar.','Urban beach in Beira, used for walks and enjoying the sea view.','beach','Beira, Sofala',-19.84,34.86),
  ('sofala','Catedral da Beira e Farol do Macuti','Beira Cathedral and Macuti Lighthouse','Pontos históricos para visita exterior e fotografia no centro da Beira.','Historic landmarks to visit from outside and photograph in central Beira.','culture','Beira',-19.843,34.838),
  ('sofala','Mercado da Beira','Beira Market','Mercado central com produtos frescos, especiarias e peixe.','Central market with fresh produce, spices and fish.','food','Centro da Beira',-19.845,34.840),
  ('sofala','Parque Nacional da Gorongosa (zonas de acesso comunitário)','Gorongosa National Park (community access areas)','Áreas periféricas e trilhos comunitários com observação de natureza e aves.','Outlying areas and community trails with nature and birdwatching.','nature','Serra da Gorongosa',-19.10,34.35),
  ('sofala','Festivais locais e celebrações na Beira','Local festivals and celebrations in Beira','Eventos culturais e religiosos com música e dança tradicional (datas variam).','Cultural and religious events with traditional music and dance (dates vary).','community','Beira e arredores',-19.84,34.84),
  ('sofala','Trilhos na Serra da Gorongosa','Trails on Mount Gorongosa','Caminhadas em trilhos comunitários na serra, com vistas e vegetação endémica.','Hikes on community trails in the mountains, with views and endemic vegetation.','adventure','Gorongosa',-19.05,34.40),
  -- Zambézia
  ('zambezia','Praias de Quelimane (zona costeira do delta do Zambeze)','Quelimane beaches (Zambezi delta coast)','Áreas de praia próximas à cidade para caminhada e observação do rio/mar.','Beach areas near the city for walking and watching the river and sea.','beach','Arredores de Quelimane',-17.88,36.88),
  ('zambezia','Centro histórico de Quelimane','Quelimane historic centre','Edifícios coloniais e ruas antigas para passeio a pé.','Colonial buildings and old streets for a walking tour.','culture','Quelimane',-17.878,36.888),
  ('zambezia','Mercado de Quelimane','Quelimane Market','Mercado vibrante com produtos locais, peixe do Zambeze e frutas tropicais.','Vibrant market with local produce, Zambezi fish and tropical fruit.','food','Centro de Quelimane',-17.879,36.889),
  ('zambezia','Delta do Zambeze (observação de aves)','Zambezi Delta (birdwatching)','Zonas húmidas e canais do delta, ricos em aves e paisagens naturais.','Wetlands and channels of the delta, rich in birdlife and natural scenery.','nature','Delta do Zambeze',-18.50,36.50),
  ('zambezia','Comunidades ribeirinhas do Zambeze','Zambezi riverside communities','Visita a aldeias de pescadores e agricultores ao longo do rio (acesso por caminhos locais).','Visit fishing and farming villages along the river (reached by local paths).','community','Margens do Zambeze',-17.90,36.90),
  ('zambezia','Caminhada nas margens do Zambeze','Walk along the Zambezi banks','Trilhos informais ao longo das margens do rio para observação da vida rural.','Informal trails along the riverbanks to observe rural life.','adventure','Arredores de Quelimane',-17.88,36.90),
  -- Tete
  ('tete','Praias fluviais do Zambeze (Tete)','Zambezi river beaches (Tete)','Áreas de areia junto ao rio Zambeze usadas para banho e piqueniques.','Sandy areas by the Zambezi River used for swimming and picnics.','beach','Tete cidade',-16.15,33.58),
  ('tete','Ponte Samora Machel e vistas do Zambeze','Samora Machel Bridge and Zambezi views','Ponto icónico para fotografia e observação do rio.','Iconic spot for photography and watching the river.','culture','Tete',-16.16,33.59),
  ('tete','Mercado de Tete','Tete Market','Mercado local com produtos agrícolas, caril e frutas da região.','Local market with farm produce, curry and regional fruit.','food','Centro de Tete',-16.156,33.586),
  ('tete','Zonas húmidas e ilhas do Zambeze','Zambezi wetlands and islands','Ilhas fluviais e zonas alagadiças com aves e vegetação ribeirinha.','River islands and floodplains with birds and riverside vegetation.','nature','Rio Zambeze, Tete',-16.20,33.60),
  ('tete','Comunidades locais de Tete','Local communities of Tete','Visita a bairros e aldeias para observar vida quotidiana e tradições.','Visit neighbourhoods and villages to observe everyday life and traditions.','community','Tete e arredores',-16.15,33.58),
  ('tete','Caminhada nas margens do Zambeze (Tete)','Walk along the Zambezi banks (Tete)','Trilhos informais ao longo do rio para observação da paisagem.','Informal trails along the river to take in the landscape.','adventure','Tete',-16.14,33.57),
  -- Nampula
  ('nampula','Ilha de Moçambique (praias)','Island of Mozambique (beaches)','Praias de areia branca e águas calmas na ilha patrimonial.','White-sand beaches and calm waters on the heritage island.','beach','Ilha de Moçambique',-15.03,40.73),
  ('nampula','Fortaleza de São Sebastião e Museu de Arte Sacra','Fort of São Sebastião and Museum of Sacred Art','Monumentos históricos da Ilha de Moçambique (visita exterior e alguns espaços gratuitos).','Historic monuments of the Island of Mozambique (outside visit and some free areas).','culture','Ilha de Moçambique',-15.035,40.735),
  ('nampula','Mercado da Ilha de Moçambique','Island of Mozambique Market','Mercado local com artesanato, especiarias e produtos frescos.','Local market with crafts, spices and fresh produce.','food','Ilha de Moçambique',-15.036,40.736),
  ('nampula','Reserva Natural da Ilha de Moçambique','Island of Mozambique Nature Reserve','Mangais, lagoas e dunas para observação de natureza e aves.','Mangroves, lagoons and dunes for nature and birdwatching.','nature','Ilha e arredores',-15.04,40.74),
  ('nampula','Trilhos no Monte Namuli','Trails on Mount Namuli','Caminhadas em trilhos comunitários na serra, com vistas e floresta.','Hikes on community trails in the mountains, with views and forest.','adventure','Monte Namuli, Nampula',-15.30,37.50),
  -- Cabo Delgado (inclui a correção: Festival Tambo pertence a Cabo Delgado)
  ('cabo-delgado','Festival Tambo (Pemba)','Tambo Festival (Pemba)','Festival de arte, música e teatro com participação comunitária (em julho).','Art, music and theatre festival with community participation (in July).','community','Pemba, Cabo Delgado',-12.97,40.52),
  ('cabo-delgado','Praia de Pemba','Pemba Beach','Praia urbana de águas cristalinas, boa para caminhadas e banho.','Urban beach with crystal-clear water, good for walks and swimming.','beach','Pemba',-12.97,40.52),
  ('cabo-delgado','Mercado Central de Pemba','Pemba Central Market','Mercado com peixe fresco, frutas e artesanato local.','Market with fresh fish, fruit and local crafts.','food','Pemba',-12.973,40.518),
  ('cabo-delgado','Arquipélago das Quirimbas (ilhas com acesso comunitário)','Quirimbas Archipelago (community-access islands)','Ilhas com comunidades swahili, praias e cultura local.','Islands with Swahili communities, beaches and local culture.','culture','Norte de Cabo Delgado',-12.30,40.60),
  ('cabo-delgado','Parque Nacional das Quirimbas (zonas de observação)','Quirimbas National Park (viewing areas)','Áreas marinhas e costeiras protegidas com observação de natureza.','Protected marine and coastal areas for nature watching.','nature','Quirimbas',-12.40,40.70),
  ('cabo-delgado','Comunidades das Quirimbas','Quirimbas communities','Visita a aldeias insulares para conhecer tradições swahili e pesca artesanal.','Visit island villages to learn about Swahili traditions and artisanal fishing.','community','Ilhas Quirimbas',-12.35,40.65),
  ('cabo-delgado','Snorkel livre nas Quirimbas','Free snorkelling in the Quirimbas','Áreas de recife acessíveis para snorkel sem custo (com equipamento próprio).','Reef areas open for free snorkelling (bring your own equipment).','adventure','Quirimbas',-12.40,40.70),
  -- Niassa
  ('niassa','Praias do Lago Niassa (Nkwichi)','Lake Niassa beaches (Nkwichi)','Praias de água doce cristalina no Lago Niassa (Malawi), ideais para banho.','Crystal-clear freshwater beaches on Lake Niassa (Malawi), ideal for swimming.','beach','Nkwichi, Niassa',-13.30,35.20),
  ('niassa','Comunidades do Lago Niassa','Lake Niassa communities','Aldeias de pescadores e agricultores junto ao lago, com vida comunitária tradicional.','Fishing and farming villages by the lake, with traditional community life.','community','Margens do Lago Niassa',-13.35,35.25),
  ('niassa','Mercados locais de Lichinga','Lichinga local markets','Mercados urbanos com produtos agrícolas e artesanato.','Urban markets with farm produce and crafts.','food','Lichinga',-13.31,35.24),
  ('niassa','Reserva do Niassa (zonas de observação)','Niassa Reserve (viewing areas)','Vastas áreas de natureza com fauna e flora (observação externa e trilhos comunitários).','Vast natural areas with wildlife and plants (outside viewing and community trails).','nature','Norte de Niassa',-12.50,36.50),
  ('niassa','Tradições locais de Niassa','Local traditions of Niassa','Eventos culturais e reuniões comunitárias em aldeias (datas variam).','Cultural events and community gatherings in villages (dates vary).','culture','Niassa rural',-13.30,35.20),
  ('niassa','Caminhadas no Lago Niassa','Walks at Lake Niassa','Trilhos informais ao longo da costa do lago, com vistas e contacto com a natureza.','Informal trails along the lakeshore, with views and close contact with nature.','adventure','Nkwichi e arredores',-13.30,35.20)
) AS v(province_code, title_pt, title_en, description_pt, description_en, category, location, lat, lng)
JOIN public.provinces p ON p.code = v.province_code
ON CONFLICT (province_id, title_pt) DO NOTHING;