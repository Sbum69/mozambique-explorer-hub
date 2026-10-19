REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.points_ledger FROM authenticated, anon;
REVOKE ALL ON public.points_ledger FROM anon;