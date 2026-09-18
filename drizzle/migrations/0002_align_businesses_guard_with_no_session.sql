-- The experiences and availability guards already skip when there is no session
-- (auth.uid() IS NULL = privileged/migration context). The businesses guard did not,
-- so catalogue rows inserted by a migration were silently forced back to 'pending'
-- and became invisible to the public read policy. Align the three guards.
CREATE OR REPLACE FUNCTION public.businesses_guard_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.verified := false;
    RETURN NEW;
  END IF;

  NEW.owner_id := OLD.owner_id;
  NEW.status := OLD.status;
  NEW.verified := OLD.verified;
  RETURN NEW;
END;
$function$;