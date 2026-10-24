-- 8E.5: new final booking state "no_show" (customer did not attend a confirmed booking).
-- Kept alone on purpose: a new enum value cannot be used in the transaction that adds it,
-- so everything that references it lives in 0037.
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'no_show';
