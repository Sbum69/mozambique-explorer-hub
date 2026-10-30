-- LEGAL-1: acceptance of the Terms of Use and the Privacy Policy, with version and date.
-- * legal_acceptances: one row per user, document and version (append-only; nobody writes from the client).
-- * current_legal_versions(): the versions in force. Bump it (new migration) whenever a text changes;
--   it must match LEGAL_VERSIONS in src/lib/legal/versions.ts.
-- * Sign-up: the account metadata carries the versions the person accepted on the form; a trigger
--   on auth.users records them with the server time, only if they are the versions in force.
-- * accept_legal_documents(): for accounts created before LEGAL-1 or after a version change
--   (the app asks before letting the person continue).
-- No changes to existing tables, data or policies.

CREATE TABLE public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document text NOT NULL CHECK (document IN ('terms', 'privacy')),
  version text NOT NULL CHECK (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('signup', 'prompt')),
  CONSTRAINT legal_acceptances_once UNIQUE (user_id, document, version)
);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_acceptances TO authenticated;

CREATE POLICY "Users read own legal acceptances" ON public.legal_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all legal acceptances" ON public.legal_acceptances
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Append-only, even for the table owner's functions: corrections are new rows, never edits.
CREATE OR REPLACE FUNCTION public.legal_acceptances_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'LEGAL_ACCEPTANCES_APPEND_ONLY';
END;
$function$;
CREATE TRIGGER legal_acceptances_no_update BEFORE UPDATE ON public.legal_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.legal_acceptances_immutable();

CREATE OR REPLACE FUNCTION public.current_legal_versions()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('terms', '2026-10-30', 'privacy', '2026-10-30'); $function$;
REVOKE ALL ON FUNCTION public.current_legal_versions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_legal_versions() TO authenticated;

-- Sign-up: records the acceptance given on the form (metadata), stamped with the server time.
CREATE OR REPLACE FUNCTION public.record_signup_legal_acceptance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb := public.current_legal_versions();
  m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  IF m ->> 'terms_version' = v ->> 'terms' AND m ->> 'privacy_version' = v ->> 'privacy' THEN
    INSERT INTO public.legal_acceptances (user_id, document, version, source)
    VALUES (NEW.id, 'terms', v ->> 'terms', 'signup'),
           (NEW.id, 'privacy', v ->> 'privacy', 'signup')
    ON CONFLICT ON CONSTRAINT legal_acceptances_once DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_signup_legal_acceptance() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_legal AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.record_signup_legal_acceptance();

-- Existing accounts and version changes: the signed-in person accepts the versions in force.
CREATE OR REPLACE FUNCTION public.accept_legal_documents(_terms_version text, _privacy_version text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v jsonb := public.current_legal_versions();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF _terms_version IS DISTINCT FROM v ->> 'terms' OR _privacy_version IS DISTINCT FROM v ->> 'privacy' THEN
    RAISE EXCEPTION 'LEGAL_VERSION_MISMATCH';
  END IF;
  INSERT INTO public.legal_acceptances (user_id, document, version, source)
  VALUES (auth.uid(), 'terms', v ->> 'terms', 'prompt'),
         (auth.uid(), 'privacy', v ->> 'privacy', 'prompt')
  ON CONFLICT ON CONSTRAINT legal_acceptances_once DO NOTHING;
END;
$function$;
REVOKE ALL ON FUNCTION public.accept_legal_documents(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_legal_documents(text, text) TO authenticated;
