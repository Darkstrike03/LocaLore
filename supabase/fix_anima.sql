-- ============================================================
-- LocaLore — Anima Fix Script
-- Run this in your Supabase SQL Editor.
-- Safe to run multiple times (all statements are idempotent).
-- ============================================================

-- ── 1. Ensure anima_balance column exists on users ───────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS anima_balance integer NOT NULL DEFAULT 0;

-- ── 2. Ensure anima_ledger table exists ──────────────────────
CREATE TABLE IF NOT EXISTS public.anima_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        integer NOT NULL,
  balance_after integer NOT NULL,
  reason        text NOT NULL,
  reference_id  uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.anima_ledger ENABLE ROW LEVEL SECURITY;

-- ── 3. Policies on anima_ledger ──────────────────────────────
DROP POLICY IF EXISTS "Users read own ledger"   ON public.anima_ledger;
DROP POLICY IF EXISTS "System inserts ledger"   ON public.anima_ledger;

CREATE POLICY "Users read own ledger"
  ON public.anima_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts ledger"
  ON public.anima_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Create increment_anima SECURITY DEFINER function ──────
-- SECURITY DEFINER bypasses RLS — same pattern as increment_user_xp.
-- This is what awardAnima() will call instead of a raw UPDATE.
CREATE OR REPLACE FUNCTION public.increment_anima(uid uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users SET anima_balance = anima_balance + amount WHERE id = uid;
END;
$$;

-- ── 5. Verify everything ─────────────────────────────────────
SELECT 'anima_balance column' AS check_item,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'anima_balance'
       ) THEN '✅ exists' ELSE '❌ missing' END AS result
UNION ALL
SELECT 'anima_ledger table',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'anima_ledger'
       ) THEN '✅ exists' ELSE '❌ missing' END
UNION ALL
SELECT 'increment_anima function',
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.routines
         WHERE routine_schema = 'public' AND routine_name = 'increment_anima'
       ) THEN '✅ exists' ELSE '❌ missing' END;
-- ✅ EXPECT: all 3 rows show "✅ exists"
