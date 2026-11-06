-- Privacy Policy of 07/11/2026: the list of external services changes (OSRM and Open-Meteo out;
-- MET Norway in, called by the server with destination coordinates only; Esri/ArcGIS map tiles
-- when enabled; directions open in Google Maps or OpenStreetMap). The Terms do not change. Only the
-- Privacy version moves, so accounts are asked to accept the Policy again (LegalAcceptanceGate).
CREATE OR REPLACE FUNCTION public.current_legal_versions()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('terms', '2026-11-07', 'privacy', '2026-11-07'); $function$;
REVOKE ALL ON FUNCTION public.current_legal_versions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_legal_versions() TO authenticated;
