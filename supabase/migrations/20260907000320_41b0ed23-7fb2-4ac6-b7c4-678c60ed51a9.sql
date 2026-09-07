-- Correção 1: permitir que o owner edite o próprio business em qualquer estado
-- (o trigger businesses_guard_privileged_fields continua a impedir alterar owner_id, status e verified)
DROP POLICY IF EXISTS "Owners can update own businesses" ON public.businesses;

CREATE POLICY "Owners can update own businesses"
ON public.businesses FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Correção 2: least privilege em destinations/experiences
REVOKE ALL ON public.destinations FROM anon;
REVOKE ALL ON public.destinations FROM authenticated;
GRANT SELECT ON public.destinations TO anon;
GRANT SELECT ON public.destinations TO authenticated;

REVOKE ALL ON public.experiences FROM anon;
REVOKE ALL ON public.experiences FROM authenticated;
GRANT SELECT ON public.experiences TO anon;
GRANT SELECT, INSERT, UPDATE ON public.experiences TO authenticated;

GRANT ALL ON public.destinations TO service_role;
GRANT ALL ON public.experiences TO service_role;