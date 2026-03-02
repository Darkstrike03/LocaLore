-- Add 3D model URL column to creatures table
-- Run this in Supabase SQL Editor

ALTER TABLE public.creatures ADD COLUMN IF NOT EXISTS model_url text NULL;
