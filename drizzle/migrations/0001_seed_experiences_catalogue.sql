ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS rating numeric,
  ADD COLUMN IF NOT EXISTS reviews integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS experiences_slug_key ON public.experiences (slug);

ALTER TABLE public.businesses ALTER COLUMN owner_id DROP NOT NULL;

INSERT INTO public.businesses (owner_id, name, slug, type, category, province, status, verified)
VALUES
  (NULL, 'Capitão Sálvio', 'capitao-salvio', 'experiences', 'beach', 'Inhambane', 'approved', true),
  (NULL, 'Tofo Dive Co-op', 'tofo-dive-coop', 'experiences', 'adventure', 'Inhambane', 'approved', true),
  (NULL, 'Aissa', 'aissa-guia-ilha', 'experiences', 'culture', 'Nampula', 'approved', true),
  (NULL, 'Banca da Maria', 'banca-da-maria', 'experiences', 'food', 'Maputo', 'approved', true),
  (NULL, 'Gorongosa Rangers', 'gorongosa-rangers', 'experiences', 'nature', 'Sofala', 'approved', true),
  (NULL, 'Cooperativa Wimbi', 'cooperativa-wimbi', 'experiences', 'community', 'Cabo Delgado', 'approved', true),
  (NULL, 'Casa Cultural Xilunguine', 'casa-cultural-xilunguine', 'experiences', 'culture', 'Maputo', 'approved', true),
  (NULL, 'Quirimbas Wild', 'quirimbas-wild', 'experiences', 'adventure', 'Cabo Delgado', 'approved', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.experiences (
  slug, business_id, destination_id, title_pt, title_en, description_pt, description_en,
  province, location, category, price_mzn, duration_hours, capacity, rating, reviews, active
)
SELECT v.slug, b.id, d.id, v.title_pt, v.title_en, v.description_pt, v.description_en,
       d.province, v.location, v.category, v.price_mzn, v.duration_hours, v.capacity,
       v.rating, v.reviews, true
FROM (
  VALUES
    ('dhow-bazaruto', 'capitao-salvio', 'vilankulo',
     'Passeio de Dhow em Bazaruto', 'Dhow trip around Bazaruto',
     'Velejar num dhow tradicional pelas águas turquesa do arquipélago com pescadores locais.',
     'Sail a traditional dhow across the turquoise archipelago waters with local fishermen.',
     'Vilankulo', 'beach', 2500::numeric, 6::numeric, 10, 4.9::numeric, 184),
    ('tofo-diving', 'tofo-dive-coop', 'inhambane',
     'Mergulho com mantas no Tofo', 'Manta diving in Tofo',
     'Mergulho guiado em pontos famosos do Tofo, com hipótese de encontrar mantas e tubarões-baleia.',
     'Guided dive at Tofo''s famous sites with the chance to spot mantas and whale sharks.',
     'Inhambane', 'adventure', 3200::numeric, 4::numeric, 10, 4.8::numeric, 312),
    ('ilha-walk', 'aissa-guia-ilha', 'ilha',
     'Caminhada cultural em Stone Town', 'Cultural walk in Stone Town',
     'Descobre a Ilha de Moçambique pelos olhos de um guia local: arquitetura swahili, fortaleza e museus.',
     'Discover Ilha de Moçambique through a local guide: Swahili architecture, fortress and museums.',
     'Ilha de Moçambique', 'culture', 800::numeric, 3::numeric, 10, 4.9::numeric, 96),
    ('maputo-food', 'banca-da-maria', 'maputo',
     'Tour gastronómico no Mercado Central', 'Food tour at the Central Market',
     'Prova matapa, pãezinhos, peixe grelhado e rissóis num percurso pelas bancas mais autênticas.',
     'Taste matapa, fresh bread, grilled fish and rissóis on a route through the most authentic stalls.',
     'Maputo', 'food', 1200::numeric, 2::numeric, 10, 4.7::numeric, 251),
    ('gorongosa-safari', 'gorongosa-rangers', 'gorongosa',
     'Safari ao nascer do sol em Gorongosa', 'Sunrise safari in Gorongosa',
     'Game drive de 3 horas com ranger local pela savana renascida — elefantes, leões e aves endémicas.',
     '3-hour game drive with a local ranger across the reborn savanna — elephants, lions and endemic birds.',
     'Parque Nacional de Gorongosa', 'nature', 4500::numeric, 3::numeric, 10, 5.0::numeric, 142),
    ('pemba-community', 'cooperativa-wimbi', 'pemba',
     'Visita à comunidade pesqueira de Wimbi', 'Visit to Wimbi fishing community',
     'Conhece pescadores macuas, aprende a preparar matapa de siri-siri e ajuda a puxar a rede ao fim da tarde.',
     'Meet Makua fishermen, learn to cook matapa siri-siri and help pull in the net at sunset.',
     'Pemba', 'community', 1800::numeric, 5::numeric, 10, 4.9::numeric, 67),
    ('marrabenta-night', 'casa-cultural-xilunguine', 'maputo',
     'Noite de Marrabenta em Maputo', 'Marrabenta night in Maputo',
     'Concerto íntimo de marrabenta numa casa cultural com jantar moçambicano incluído.',
     'Intimate marrabenta concert at a cultural house, Mozambican dinner included.',
     'Maputo', 'culture', 1500::numeric, 4::numeric, 10, 4.8::numeric, 89),
    ('quirimbas-kayak', 'quirimbas-wild', 'pemba',
     'Kayak nas Quirimbas', 'Kayaking the Quirimbas',
     'Aventura de meio-dia entre ilhotas, mangais e recifes virgens do arquipélago das Quirimbas.',
     'Half-day adventure between islets, mangroves and virgin reefs of the Quirimbas archipelago.',
     'Pemba', 'adventure', 2200::numeric, 4::numeric, 10, 4.8::numeric, 54)
) AS v(slug, business_slug, destination_slug, title_pt, title_en, description_pt, description_en,
       location, category, price_mzn, duration_hours, capacity, rating, reviews)
JOIN public.businesses b ON b.slug = v.business_slug
JOIN public.destinations d ON d.slug = v.destination_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.experience_availability (experience_id, day_of_week, start_time, end_time, capacity, active)
SELECT e.id, dow, time '09:00', (time '09:00' + (e.duration_hours * interval '1 hour')), COALESCE(e.capacity, 10), true
FROM public.experiences e
CROSS JOIN generate_series(1, 6) AS dow
WHERE e.slug IS NOT NULL
ON CONFLICT (experience_id, day_of_week, start_time) DO NOTHING;