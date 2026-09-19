-- Public-safe author identity for the community feed.
-- Exposes ONLY display name + avatar of users who have community posts.
-- No email, no phone, no locale, no private profile fields.
CREATE VIEW public.community_post_authors
WITH (security_invoker = off) AS
SELECT p.id, p.display_name, p.avatar_url
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.community_posts cp
  WHERE cp.author_id = p.id
    AND (cp.status = 'published' OR public.has_role(auth.uid(), 'admin') OR cp.author_id = auth.uid())
);

GRANT SELECT ON public.community_post_authors TO anon, authenticated;
