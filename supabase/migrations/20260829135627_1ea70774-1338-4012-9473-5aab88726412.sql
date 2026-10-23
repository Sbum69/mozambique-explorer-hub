REVOKE ALL ON TABLE public.businesses FROM anon;
REVOKE ALL ON TABLE public.businesses FROM authenticated;

GRANT SELECT ON TABLE public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.businesses TO authenticated;
GRANT ALL ON TABLE public.businesses TO service_role;