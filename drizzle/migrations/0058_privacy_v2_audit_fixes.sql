-- Final audit (04/11/2026).
-- * Privacy Policy, new version 2026-11-04 (requests to join, highlights, help assistant, error log).
--   The Terms do not change. Signed-in people are asked to accept the new version
--   (LegalAcceptanceGate), as LEGAL-1 planned for any text change.
-- * commission_quote() is no longer callable by visitors: the public pages compute examples in the
--   browser from the public settings, and the quote told anyone whether a business is a Founder.
CREATE OR REPLACE FUNCTION public.current_legal_versions()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('terms', '2026-10-30', 'privacy', '2026-11-04'); $function$;
REVOKE ALL ON FUNCTION public.current_legal_versions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_legal_versions() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.commission_quote(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commission_quote(uuid, bigint) TO authenticated;
