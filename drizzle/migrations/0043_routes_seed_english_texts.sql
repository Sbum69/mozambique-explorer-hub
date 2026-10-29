-- I18N-2 — English title and description of the two seeded catalogue routes (EK-INH001, EK-MAP002).
-- Only fills English columns that are empty or still equal to the Portuguese text; the Portuguese
-- columns and routes created by users are not touched.
UPDATE public.routes
   SET title_en = 'Inhambane Beaches'
 WHERE id = '11111111-1111-4111-8111-111111111111'
   AND (title_en IS NULL OR btrim(title_en) = '' OR title_en = title);

UPDATE public.routes
   SET description_en = 'Dive into Inhambane''s paradise beaches and coastal culture.'
 WHERE id = '11111111-1111-4111-8111-111111111111'
   AND (description_en IS NULL OR btrim(description_en) = '' OR description_en = description);

UPDATE public.routes
   SET title_en = 'Cultural Maputo'
 WHERE id = '22222222-2222-4222-8222-222222222222'
   AND (title_en IS NULL OR btrim(title_en) = '' OR title_en = title);

UPDATE public.routes
   SET description_en = 'Discover the colonial history and vibrant art of the capital.'
 WHERE id = '22222222-2222-4222-8222-222222222222'
   AND (description_en IS NULL OR btrim(description_en) = '' OR description_en = description);
