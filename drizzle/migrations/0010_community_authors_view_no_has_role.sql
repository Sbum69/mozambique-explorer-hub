-- Anonymous visitors cannot execute has_role(); rewrite the public author view
-- without it. It still exposes only display name + avatar of users who posted.
CREATE OR REPLACE VIEW public.community_post_authors
WITH (security_invoker = off) AS
SELECT p.id, p.display_name, p.avatar_url
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.community_posts cp WHERE cp.author_id = p.id);

GRANT SELECT ON public.community_post_authors TO anon, authenticated;
