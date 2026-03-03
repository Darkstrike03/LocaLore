-- ============================================================
-- LocaLore — XP & Anima Policy Fix
-- Run this entire script in your Supabase SQL Editor.
-- ============================================================

-- ── 1. Allow users to update their own row in public.users ───
-- This is what was silently blocking ALL xp and anima_balance writes.
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 2. Allow users to insert into xp_events ──────────────────
DROP POLICY IF EXISTS "System inserts XP events" ON public.xp_events;
CREATE POLICY "System inserts XP events"
  ON public.xp_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Allow users to insert into anima_ledger ───────────────
DROP POLICY IF EXISTS "System inserts ledger" ON public.anima_ledger;
CREATE POLICY "System inserts ledger"
  ON public.anima_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Ensure increment_user_xp function exists ──────────────
-- SECURITY DEFINER bypasses RLS entirely so it always works.
CREATE OR REPLACE FUNCTION public.increment_user_xp(uid uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users SET xp = xp + amount WHERE id = uid;
END;
$$;

-- ── 5. Ensure increment_anima function exists ────────────────
-- Used by VaultPage / MarketplacePage for pack purchases etc.
CREATE OR REPLACE FUNCTION public.increment_anima(uid uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users SET anima_balance = anima_balance + amount WHERE id = uid;
END;
$$;

-- ── Verify the policies were created ─────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'xp_events', 'anima_ledger')
  AND cmd IN ('UPDATE', 'INSERT')
ORDER BY tablename, cmd;
-- ✅ EXPECT: 5 rows total
--   anima_ledger  INSERT  "System inserts ledger"
--   users         UPDATE  "Users can update own profile"
--   xp_events     INSERT  "System inserts XP events"
