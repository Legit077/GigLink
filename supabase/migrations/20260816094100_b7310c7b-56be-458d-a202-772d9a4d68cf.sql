ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[];