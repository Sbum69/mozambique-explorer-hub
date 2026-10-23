-- The verified project-owner account gets the admin role; remove the earlier guess.
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (SELECT id FROM auth.users WHERE email = 'sheldonjasse69@gmail.com');

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email = 'sheldonesmad@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;