-- ─────────────────────────────────────────────
-- Tier 1 upgrade: danger_rating, reactions, comments
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────

-- 1. Danger rating (1–5) on creatures
ALTER TABLE public.creatures
  ADD COLUMN IF NOT EXISTS danger_rating int CHECK (danger_rating BETWEEN 1 AND 5);

-- 2. Reactions table (unique per user + creature + reaction type)
CREATE TABLE IF NOT EXISTS public.creature_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id uuid NOT NULL REFERENCES public.creatures(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reaction    text NOT NULL CHECK (reaction IN ('seen', 'chilling', 'disbelief')),
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (creature_id, user_id, reaction)
);

ALTER TABLE public.creature_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reactions"
  ON public.creature_reactions FOR SELECT USING (true);

CREATE POLICY "Auth users can react"
  ON public.creature_reactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can remove own reaction"
  ON public.creature_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Witness accounts / comments
CREATE TABLE IF NOT EXISTS public.creature_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id  uuid NOT NULL REFERENCES public.creatures(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text,
  content      text NOT NULL CHECK (char_length(content) BETWEEN 5 AND 500),
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.creature_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.creature_comments FOR SELECT USING (true);

CREATE POLICY "Auth users can comment"
  ON public.creature_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment"
  ON public.creature_comments FOR DELETE
  USING (auth.uid() = user_id);
