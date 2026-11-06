-- Legal texts of 06/11/2026: the Privacy Policy gets the full list of cookies and local storage, a
-- retention table, the 30-day reply period, the privacy contact, the processor list (Cloudflare in,
-- Unsplash out) and the assistant/AI note; the Terms point to /precos-e-reembolsos. Both versions
-- change, so every account is asked to accept again (LegalAcceptanceGate).
CREATE OR REPLACE FUNCTION public.current_legal_versions()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('terms', '2026-11-06', 'privacy', '2026-11-06'); $function$;
REVOKE ALL ON FUNCTION public.current_legal_versions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_legal_versions() TO authenticated;
