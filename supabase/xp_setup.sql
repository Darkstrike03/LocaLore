-- XP column for public.users
-- Your xp_events table already exists. Just run this one line to add the xp
-- column to your users table, then XP tracking will work.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
