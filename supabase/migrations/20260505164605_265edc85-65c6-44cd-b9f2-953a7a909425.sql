ALTER TABLE public.livestock_batches ADD COLUMN IF NOT EXISTS feed_consumed numeric NOT NULL DEFAULT 0;
ALTER TABLE public.livestock_batches ADD COLUMN IF NOT EXISTS feed_unit text DEFAULT 'kg';