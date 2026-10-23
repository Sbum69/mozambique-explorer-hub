-- ============ BLOCK 6H — REAL COMMUNITY ============

CREATE TABLE public.community_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_pt text NOT NULL,
  name_en text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.community_categories (slug, name_pt, name_en, sort_order) VALUES
  ('travel-tips',  'Dicas de Viagem', 'Travel Tips',  1),
  ('destinations', 'Destinos',        'Destinations', 2),
  ('food',         'Gastronomia',     'Food',         3),
  ('culture',      'Cultura',         'Culture',      4),
  ('experiences',  'Experiências',    'Experiences',  5),
  ('routes',       'Roteiros',        'Routes',       6),
  ('questions',    'Perguntas',       'Questions',    7),
  ('photography',  'Fotografias',     'Photography',  8);

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  category_id uuid NOT NULL REFERENCES public.community_categories(id),
  province_id uuid REFERENCES public.provinces(id),
  destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  experience_id uuid REFERENCES public.experiences(id) ON DELETE SET NULL,
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_posts_status_check CHECK (status IN ('pending','published','rejected','hidden')),
  CONSTRAINT community_posts_title_check CHECK (char_length(btrim(title)) BETWEEN 3 AND 160),
  CONSTRAINT community_posts_content_check CHECK (char_length(btrim(content)) BETWEEN 3 AND 4000)
);
CREATE INDEX community_posts_feed_idx ON public.community_posts(status, created_at DESC);
CREATE INDEX community_posts_author_idx ON public.community_posts(author_id);
CREATE INDEX community_posts_category_idx ON public.community_posts(category_id);
CREATE INDEX community_posts_province_idx ON public.community_posts(province_id);

CREATE TABLE public.community_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_reactions_value_check CHECK (reaction IN ('like','dislike')),
  UNIQUE (user_id, post_id)
);
CREATE INDEX community_reactions_post_idx ON public.community_post_reactions(post_id);

CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT community_reports_reason_check CHECK (reason IN ('spam','inappropriate','misleading','offensive','other')),
  CONSTRAINT community_reports_status_check CHECK (status IN ('pending','reviewed','dismissed','action_taken')),
  UNIQUE (post_id, reporter_id)
);
CREATE INDEX community_reports_status_idx ON public.community_reports(status, created_at DESC);

-- ============ GRANTS ============
GRANT SELECT ON public.community_categories TO anon;
GRANT SELECT ON public.community_categories TO authenticated;
GRANT ALL ON public.community_categories TO service_role;

GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

GRANT SELECT ON public.community_post_reactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_reactions TO authenticated;
GRANT ALL ON public.community_post_reactions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;

-- ============ GUARD TRIGGERS ============
CREATE OR REPLACE FUNCTION public.community_posts_prepare_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.author_id := auth.uid();
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      NEW.status := 'published';
    END IF;
  END IF;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_posts_prepare_insert
BEFORE INSERT ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.community_posts_prepare_insert();

CREATE OR REPLACE FUNCTION public.community_posts_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.author_id := OLD.author_id;
    NEW.status := OLD.status;
  END IF;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_posts_guard_update
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.community_posts_guard_update();

CREATE OR REPLACE FUNCTION public.community_reactions_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_reactions_guard
BEFORE INSERT OR UPDATE ON public.community_post_reactions
FOR EACH ROW EXECUTE FUNCTION public.community_reactions_guard();

CREATE OR REPLACE FUNCTION public.community_reports_prepare_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.reporter_id := auth.uid();
  END IF;
  NEW.status := 'pending';
  NEW.resolved_at := NULL;
  NEW.resolved_by := NULL;
  NEW.created_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_reports_prepare_insert
BEFORE INSERT ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.community_reports_prepare_insert();

CREATE OR REPLACE FUNCTION public.community_reports_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.post_id := OLD.post_id;
  NEW.reporter_id := OLD.reporter_id;
  NEW.reason := OLD.reason;
  NEW.description := OLD.description;
  NEW.created_at := OLD.created_at;
  IF NEW.status <> OLD.status AND NEW.status <> 'pending' THEN
    NEW.resolved_at := now();
    NEW.resolved_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_reports_guard_update
BEFORE UPDATE ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.community_reports_guard_update();

-- ============ RLS ============
ALTER TABLE public.community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community categories readable"
  ON public.community_categories FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage community categories"
  ON public.community_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "published posts are public"
  ON public.community_posts FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "authors and admins read own posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated users create own posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authors and admins update posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authors and admins delete posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "reactions on visible posts are readable"
  ON public.community_post_reactions FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = post_id));

CREATE POLICY "users insert own reaction"
  ON public.community_post_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own reaction"
  ON public.community_post_reactions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own reaction"
  ON public.community_post_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users create own reports"
  ON public.community_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "reporters and admins read reports"
  ON public.community_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins resolve reports"
  ON public.community_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
