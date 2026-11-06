-- Terms of 07/11/2026: highlight refunds are decided (full refund before the highlight goes live,
-- no refund once it is live). The Privacy Policy does not change. Only the Terms version moves, so
-- accounts are asked to accept the Terms again (LegalAcceptanceGate).
CREATE OR REPLACE FUNCTION public.current_legal_versions()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('terms', '2026-11-07', 'privacy', '2026-11-06'); $function$;
REVOKE ALL ON FUNCTION public.current_legal_versions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_legal_versions() TO authenticated;
