-- ============================================================
-- LocaLore — XP & Anima Diagnostic Script
-- Run this in your Supabase SQL Editor (all at once).
-- It is read-only — it will not change anything.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. COLUMN CHECK: do xp and anima_balance exist on public.users?
-- ─────────────────────────────────────────────────────────────
select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'users'
  and column_name  in ('xp', 'anima_balance')
order by column_name;
-- ✅ EXPECT: 2 rows — one for 'anima_balance' (integer), one for 'xp' (integer)
-- ❌ FIX: If 0 rows → run tier2_upgrade.sql and cards_migration.sql in Supabase SQL Editor


-- ─────────────────────────────────────────────────────────────
-- 2. TABLE CHECK: do xp_events and anima_ledger tables exist?
-- ─────────────────────────────────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('xp_events', 'anima_ledger', 'card_packs', 'user_cards')
order by table_name;
-- ✅ EXPECT: 4 rows
-- ❌ FIX: missing xp_events  → run tier2_upgrade.sql
--         missing anima_ledger / user_cards / card_packs → run cards_migration.sql


-- ─────────────────────────────────────────────────────────────
-- 3. FUNCTION CHECK: does increment_user_xp RPC exist?
-- ─────────────────────────────────────────────────────────────
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name   = 'increment_user_xp';
-- ✅ EXPECT: 1 row, security_type = 'DEFINER'
-- ❌ FIX: If 0 rows → run just the CREATE OR REPLACE FUNCTION block from tier2_upgrade.sql


-- ─────────────────────────────────────────────────────────────
-- 4. RLS POLICY CHECK: policies on xp_events and anima_ledger
-- ─────────────────────────────────────────────────────────────
select
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('xp_events', 'anima_ledger', 'users')
order by tablename, cmd;
-- ✅ EXPECT:
--   xp_events  → INSERT  with_check includes 'auth.uid() = user_id'
--   anima_ledger → INSERT with_check includes 'auth.uid() = user_id'
--   users      → UPDATE  should allow users to update their own row
-- ❌ PROBLEM: If users table has NO update policy → xp and anima_balance
--             writes are silently blocked by RLS. This is the most common cause.


-- ─────────────────────────────────────────────────────────────
-- 5. USERS TABLE UPDATE POLICY — detailed check
-- ─────────────────────────────────────────────────────────────
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename  = 'users'
  and cmd        = 'UPDATE';
-- ✅ EXPECT: at least 1 row where qual/with_check references auth.uid() = id
-- ❌ FIX: If empty → see "FIXES" section at the bottom of this file


-- ─────────────────────────────────────────────────────────────
-- 6. RECENT XP EVENTS: any rows written in the last 7 days?
-- ─────────────────────────────────────────────────────────────
select
  event_type,
  xp_amount,
  created_at
from public.xp_events
order by created_at desc
limit 20;
-- ✅ EXPECT: rows here if the table exists and events are being written
-- ❌ If table doesn't exist this query errors → xp_events not created yet
-- ❌ If 0 rows → events aren't being persisted (likely RLS blocking INSERT)


-- ─────────────────────────────────────────────────────────────
-- 7. RECENT ANIMA LEDGER: any rows written?
-- ─────────────────────────────────────────────────────────────
select
  reason,
  amount,
  balance_after,
  created_at
from public.anima_ledger
order by created_at desc
limit 20;
-- ✅ EXPECT: rows here if cards_migration.sql was run and anima flows
-- ❌ If 0 rows → anima_ledger INSERT is being silently swallowed
--    (either table missing or RLS blocking it)


-- ─────────────────────────────────────────────────────────────
-- 8. CURRENT USER BALANCES: what's in the users table right now?
-- ─────────────────────────────────────────────────────────────
select
  id,
  username,
  xp,
  anima_balance
from public.users
order by xp desc
limit 20;
-- ✅ Shows current state. If xp = 0 for everyone, writes are not reaching the table.


-- ─────────────────────────────────────────────────────────────
-- 9. CHECK: is RLS enabled on the users table?
-- ─────────────────────────────────────────────────────────────
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname      = 'users';
-- ✅ relrowsecurity = true means RLS is ON
-- If RLS is ON and there is no UPDATE policy → all UPDATE calls are silently denied
-- (Supabase does NOT return an error for RLS-blocked writes in client SDKs by default)


-- ─────────────────────────────────────────────────────────────
-- 10. CHECK: does increment_user_xp actually work?
--     (Safe test — run only if you want to quick-verify the function)
-- ─────────────────────────────────────────────────────────────
-- Uncomment and replace <YOUR_USER_UUID> with your actual user id to test:
-- select public.increment_user_xp('<YOUR_USER_UUID>'::uuid, 0);
-- Then check: select xp from public.users where id = '<YOUR_USER_UUID>';


-- ============================================================
-- FIXES — run whichever block applies
-- ============================================================

-- FIX A: Missing xp / anima_balance columns
-- ------------------------------------------------------------------
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS anima_balance integer NOT NULL DEFAULT 0;


-- FIX B: Missing increment_user_xp function
-- ------------------------------------------------------------------
-- CREATE OR REPLACE FUNCTION public.increment_user_xp(uid uuid, amount integer)
-- RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   UPDATE public.users SET xp = xp + amount WHERE id = uid;
-- END;
-- $$;


-- FIX C: No UPDATE policy on public.users (MOST LIKELY CAUSE)
-- ------------------------------------------------------------------
-- This is what blocks xp AND anima_balance writes silently.
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
-- CREATE POLICY "Users can update own profile"
--   ON public.users FOR UPDATE
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);


-- FIX D: No INSERT policy on anima_ledger
-- ------------------------------------------------------------------
-- DROP POLICY IF EXISTS "System inserts ledger" ON public.anima_ledger;
-- CREATE POLICY "System inserts ledger"
--   ON public.anima_ledger FOR INSERT
--   WITH CHECK (auth.uid() = user_id);


-- FIX E: No INSERT policy on xp_events
-- ------------------------------------------------------------------
-- DROP POLICY IF EXISTS "System inserts XP events" ON public.xp_events;
-- CREATE POLICY "System inserts XP events"
--   ON public.xp_events FOR INSERT
--   WITH CHECK (auth.uid() = user_id);
