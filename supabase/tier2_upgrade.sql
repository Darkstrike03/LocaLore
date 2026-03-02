-- ============================================================
-- LocaLore — Tier 2 upgrade migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. EXPAND REACTIONS ENUM ─────────────────────────────────
ALTER TABLE public.creature_reactions
  DROP CONSTRAINT IF EXISTS creature_reactions_reaction_check;

ALTER TABLE public.creature_reactions
  ADD CONSTRAINT creature_reactions_reaction_check
  CHECK (reaction IN (
    'seen','chilling','disbelief',
    'terrified','survived','cursed','revered','haunted','hunting'
  ));

-- ── 2. CREATURE BOOKMARKS (Grimoire) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.creature_bookmarks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creature_id  uuid NOT NULL REFERENCES public.creatures(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, creature_id)
);

ALTER TABLE public.creature_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks"
  ON public.creature_bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Bookmarks are public reads"
  ON public.creature_bookmarks
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── 3. CREATURE IMAGES (Gallery) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.creature_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id  uuid NOT NULL REFERENCES public.creatures(id) ON DELETE CASCADE,
  url          text NOT NULL,
  caption      text,
  uploaded_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creature_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creature images"
  ON public.creature_images
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload images"
  ON public.creature_images
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploader can delete own images"
  ON public.creature_images
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- ── 4. CREATURE RELATIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creature_relations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id uuid NOT NULL REFERENCES public.creatures(id) ON DELETE CASCADE,
  related_id  uuid NOT NULL REFERENCES public.creatures(id) ON DELETE CASCADE,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (creature_id <> related_id),
  UNIQUE (creature_id, related_id)
);

ALTER TABLE public.creature_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creature relations"
  ON public.creature_relations
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Moderators can manage relations"
  ON public.creature_relations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'moderator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'moderator'
    )
  );

-- ── 5. SIGHTING REPORTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sighting_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id  uuid NOT NULL REFERENCES public.creatures(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text,
  latitude     double precision NOT NULL,
  longitude    double precision NOT NULL,
  description  text CHECK (char_length(description) BETWEEN 5 AND 1000),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sighting_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sighting reports"
  ON public.sighting_reports
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can file sighting reports"
  ON public.sighting_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can delete own sighting reports"
  ON public.sighting_reports
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── 6. XP EVENTS + USER XP COLUMN ────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.xp_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type   text NOT NULL CHECK (event_type IN (
    'submit_creature','creature_verified','comment','react',
    'bookmark_received','sighting_filed'
  )),
  xp_amount    integer NOT NULL,
  reference_id uuid,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own XP events"
  ON public.xp_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System inserts XP events"
  ON public.xp_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 7. XP INCREMENT RPC ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_user_xp(uid uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users SET xp = xp + amount WHERE id = uid;
END;
$$;

-- ── 8. INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_creature_bookmarks_user   ON public.creature_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_creature_bookmarks_creature ON public.creature_bookmarks(creature_id);
CREATE INDEX IF NOT EXISTS idx_creature_images_creature  ON public.creature_images(creature_id);
CREATE INDEX IF NOT EXISTS idx_creature_relations_both   ON public.creature_relations(creature_id, related_id);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_creature ON public.sighting_reports(creature_id);
CREATE INDEX IF NOT EXISTS idx_sighting_reports_user     ON public.sighting_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user            ON public.xp_events(user_id);
