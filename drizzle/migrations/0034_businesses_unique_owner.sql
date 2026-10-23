-- SEG-1B: one business per account, enforced by the database (registerMyBusiness checks first,
-- but two concurrent requests could both pass that check). Owner-less catalogue rows
-- (owner_id IS NULL) remain allowed: NULLs never conflict in a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS businesses_owner_id_key ON public.businesses (owner_id);

-- The unique index serves the same owner_id lookups, so the plain index is redundant.
DROP INDEX IF EXISTS public.businesses_owner_id_idx;
