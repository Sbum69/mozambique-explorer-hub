-- Anonymous visitors cannot execute has_role(), so the public category policy
-- must not reference it. Split the read policy per role instead.
DROP POLICY "community categories readable" ON public.community_categories;

CREATE POLICY "anon reads active community categories"
  ON public.community_categories FOR SELECT TO anon
  USING (active);

CREATE POLICY "users read community categories"
  ON public.community_categories FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
