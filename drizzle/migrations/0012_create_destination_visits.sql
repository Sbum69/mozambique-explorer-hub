CREATE TABLE public.destination_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, destination_id)
);
GRANT SELECT, INSERT, DELETE ON public.destination_visits TO authenticated;
GRANT ALL ON public.destination_visits TO service_role;
ALTER TABLE public.destination_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own visits" ON public.destination_visits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own visits" ON public.destination_visits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own visits" ON public.destination_visits FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX destination_visits_user_idx ON public.destination_visits(user_id);