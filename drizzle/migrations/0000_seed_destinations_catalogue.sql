-- Editorial fields the current frontend already shows for each destination.
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS region_pt text,
  ADD COLUMN IF NOT EXISTS region_en text,
  ADD COLUMN IF NOT EXISTS visitors_k integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS highlights jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Transport the six existing destinations. Idempotent: slug is UNIQUE.
INSERT INTO public.destinations
  (slug, name, province, lat, lng, category, description_pt, description_en,
   region_pt, region_en, visitors_k, badges, highlights)
VALUES
  ('maputo', 'Maputo', 'maputo', -25.9692, 32.5732, 'city',
   'A vibrante capital, mistura de história colonial e arte contemporânea.',
   'The vibrant capital — a blend of colonial history and contemporary art.',
   'Capital', 'Capital', 125, ARRAY['most-visited'],
   '[{"pt":"Mercado Central","en":"Central Market"},{"pt":"Fortaleza","en":"Fortress"},{"pt":"Marginal","en":"Marginal"}]'::jsonb),
  ('ilha', 'Ilha de Moçambique', 'nampula', -15.0333, 40.7333, 'heritage',
   'Património Mundial UNESCO, alma da costa swahili.',
   'UNESCO World Heritage Site — soul of the Swahili coast.',
   'Norte', 'North', 45, ARRAY['most-recommended'],
   '[{"pt":"Stone Town","en":"Stone Town"},{"pt":"Palácio de São Paulo","en":"São Paulo Palace"}]'::jsonb),
  ('inhambane', 'Inhambane', 'inhambane', -23.865, 35.3833, 'beach',
   'Praias paradisíacas em Tofo e Barra, mergulho de classe mundial.',
   'Paradise beaches at Tofo and Barra, world-class diving.',
   'Sul', 'South', 98, ARRAY['most-visited','most-recommended'],
   '[{"pt":"Praia do Tofo","en":"Tofo Beach"},{"pt":"Mergulho com manta","en":"Manta diving"}]'::jsonb),
  ('vilankulo', 'Vilankulo', 'inhambane', -22.0023, 35.3133, 'beach',
   'Porta de entrada para o arquipélago do Bazaruto.',
   'Gateway to the Bazaruto archipelago.',
   'Centro', 'Centre', 78, ARRAY['most-visited'],
   '[{"pt":"Bazaruto","en":"Bazaruto"},{"pt":"Passeio de dhow","en":"Dhow trips"}]'::jsonb),
  ('pemba', 'Pemba', 'cabo-delgado', -12.974, 40.5178, 'beach',
   'Águas turquesa e portal para as Quirimbas.',
   'Turquoise waters and portal to the Quirimbas.',
   'Norte', 'North', 32, ARRAY['most-recommended'],
   '[{"pt":"Quirimbas","en":"Quirimbas"},{"pt":"Recifes de coral","en":"Coral reefs"}]'::jsonb),
  ('gorongosa', 'Gorongosa', 'sofala', -18.8167, 34.5, 'nature',
   'Parque nacional renascido, biodiversidade incomparável.',
   'Reborn national park with unmatched biodiversity.',
   'Centro', 'Centre', 28, ARRAY[]::text[],
   '[{"pt":"Safari","en":"Safari"},{"pt":"Aves endémicas","en":"Endemic birds"}]'::jsonb)
ON CONFLICT (slug) DO NOTHING;