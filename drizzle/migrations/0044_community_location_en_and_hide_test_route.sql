-- I18N-2 — English location of community experiences, and hide the leftover test route "Shelbea".
-- 1) New nullable column location_en (no RLS or grant changes: it follows the table's policies).
-- 2) English text only where the Portuguese has descriptive words; proper names stay in Portuguese
--    except the well-known English names Lake Niassa and Zambezi. Rows that are only Portuguese
--    proper names keep location_en NULL (the interface then shows the Portuguese text).
--    Only empty location_en values are filled; the Portuguese column is not touched.
-- 3) Route EK-B0F618 "Shelbea" (public, no owner, no progress, no favourites) becomes private and
--    inactive. Nothing is deleted.
ALTER TABLE public.community_experiences ADD COLUMN IF NOT EXISTS location_en text;

UPDATE public.community_experiences ce
   SET location_en = v.en
  FROM (VALUES
    ('Arredores de Quelimane', 'Quelimane surroundings'),
    ('Arredores de Xai-Xai', 'Xai-Xai surroundings'),
    ('Barra, norte da península de Inhambane', 'Barra, north of the Inhambane peninsula'),
    ('Beira e arredores', 'Beira and surroundings'),
    ('Centro da Beira', 'Beira city centre'),
    ('Centro de Inhambane', 'Inhambane city centre'),
    ('Centro de Quelimane', 'Quelimane city centre'),
    ('Centro de Tete', 'Tete city centre'),
    ('Centro de Xai-Xai', 'Xai-Xai city centre'),
    ('Cidade de Inhambane', 'Inhambane city'),
    ('Delta do Zambeze', 'Zambezi Delta'),
    ('Frente à Praia do Tofo', 'In front of Praia do Tofo'),
    ('Ilha e arredores', 'The island and surroundings'),
    ('Maputo (local varia; frequentemente na marginal)', 'Maputo (venue varies; often on the seafront avenue)'),
    ('Margens do Lago Niassa', 'Shores of Lake Niassa'),
    ('Margens do Zambeze', 'Banks of the Zambezi'),
    ('Niassa rural', 'Rural Niassa'),
    ('Nkwichi e arredores', 'Nkwichi and surroundings'),
    ('Norte de Cabo Delgado', 'Northern Cabo Delgado'),
    ('Norte de Niassa', 'Northern Niassa'),
    ('Ponta do Ouro, sul de Maputo', 'Ponta do Ouro, south of Maputo'),
    ('Rio Zambeze, Tete', 'Zambezi River, Tete'),
    ('Sul da província de Maputo', 'Southern Maputo province'),
    ('Tete cidade', 'Tete city'),
    ('Tete e arredores', 'Tete and surroundings'),
    ('Závora e arredores', 'Závora and surroundings')
  ) AS v(pt, en)
 WHERE ce.location = v.pt
   AND (ce.location_en IS NULL OR btrim(ce.location_en) = '');

UPDATE public.routes
   SET is_public = false,
       status = 'inactive'
 WHERE id = '8a148d50-e306-4577-aa8f-804ac2052fd4'
   AND unique_code = 'EK-B0F618';
