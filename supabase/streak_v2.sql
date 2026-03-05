-- ─────────────────────────────────────────────────────────────────────────────
-- LocaLore — Streak v2  (run in Supabase SQL editor)
--
-- Changes from v1:
--   • Much richer milestone schedule: 7, 14, 28, 30, 50, 100, 200, 300, 500
--   • Every multiple-of-10 day earns an extra +50⬡ continuous bonus
--   • Streak Freeze: purchasable insurance — auto-consumed if you miss 1 day
--   • claim_daily_reward() now returns richer JSON incl. bonus breakdown
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. Add streak_freeze_count column ───────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS streak_freeze_count integer NOT NULL DEFAULT 0;


-- ─── 2. claim_daily_reward()  (replaces the v1 function) ─────────────────────
--
--  Base daily rewards by tier:
--    1-2  days  →  2 ⬡
--    3-6  days  →  8 ⬡
--    7-13 days  →  20 ⬡
--   14-27 days  →  50 ⬡
--   28+   days  →  80 ⬡
--
--  One-time named milestone bonuses (on top of base):
--    day   7  →  +100 ⬡
--    day  14  →  +250 ⬡
--    day  28  →  +500 ⬡
--    day  30  →  +750 ⬡
--    day  50  →  +1 500 ⬡
--    day 100  →  +4 000 ⬡
--    day 200  →  +10 000 ⬡
--    day 300  →  +25 000 ⬡
--    day 500  →  +60 000 ⬡
--
--  Every multiple-of-10 day: +50 ⬡ (stacks with all bonuses above)
--
--  Streak Freeze:
--    If you missed exactly 1 day (days_gap = 2) AND have freeze(s), one is
--    consumed and your streak is preserved.
--
--  Returns jsonb:
--    claimed       bool
--    streak        int
--    anima_awarded int   (total = base + bonus)
--    base_reward   int
--    bonus         int
--    is_milestone  bool
--    used_freeze   bool
--    freeze_count  int   (remaining after this claim)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid    := auth.uid();
  v_last_claim   timestamptz;
  v_streak       integer;
  v_freeze_count integer;
  v_days_gap     integer;
  v_new_streak   integer;
  v_used_freeze  boolean := false;
  v_base_reward  integer;
  v_bonus        integer := 0;
  v_total_reward integer;
  v_new_balance  integer;
  v_reason_str   text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_daily_claim,
         COALESCE(login_streak, 0),
         COALESCE(streak_freeze_count, 0)
    INTO v_last_claim, v_streak, v_freeze_count
    FROM public.users
   WHERE id = v_user_id;

  -- ── Already claimed today (UTC) ────────────────────────────────────────────
  IF v_last_claim IS NOT NULL AND
     date_trunc('day', v_last_claim AT TIME ZONE 'UTC') =
     date_trunc('day', now()        AT TIME ZONE 'UTC')
  THEN
    RETURN jsonb_build_object(
      'claimed',       false,
      'streak',        v_streak,
      'anima_awarded', 0,
      'base_reward',   0,
      'bonus',         0,
      'is_milestone',  false,
      'used_freeze',   false,
      'freeze_count',  v_freeze_count
    );
  END IF;

  -- ── Days since last claim ──────────────────────────────────────────────────
  -- 0 = first ever claim, 1 = yesterday, 2 = missed 1 day, etc.
  v_days_gap := CASE
    WHEN v_last_claim IS NULL THEN 0
    ELSE (
      date_trunc('day', now()          AT TIME ZONE 'UTC') -
      date_trunc('day', v_last_claim   AT TIME ZONE 'UTC')
    )::integer
  END;

  -- ── Determine new streak ───────────────────────────────────────────────────
  IF v_days_gap <= 1 THEN
    -- Normal: first claim ever, or claimed yesterday
    v_new_streak := v_streak + 1;

  ELSIF v_days_gap = 2 AND v_freeze_count > 0 THEN
    -- Missed exactly 1 day — consume a freeze and preserve streak
    v_used_freeze  := true;
    v_new_streak   := v_streak + 1;
    v_freeze_count := v_freeze_count - 1;

  ELSE
    -- Streak broken (missed 2+ days, or no freeze available for 1 miss)
    v_new_streak := 1;
  END IF;

  -- ── Base daily reward by tier ──────────────────────────────────────────────
  v_base_reward :=
    CASE
      WHEN v_new_streak >= 28 THEN 80
      WHEN v_new_streak >= 14 THEN 50
      WHEN v_new_streak >= 7  THEN 20
      WHEN v_new_streak >= 3  THEN  8
      ELSE                          2
    END;

  -- ── One-time named milestone bonus ────────────────────────────────────────
  v_bonus := v_bonus +
    CASE v_new_streak
      WHEN   7 THEN     100
      WHEN  14 THEN     250
      WHEN  28 THEN     500
      WHEN  30 THEN     750
      WHEN  50 THEN    1500
      WHEN 100 THEN    4000
      WHEN 200 THEN   10000
      WHEN 300 THEN   25000
      WHEN 500 THEN   60000
      ELSE 0
    END;

  -- ── Every-10-day continuous bonus ─────────────────────────────────────────
  IF v_new_streak % 10 = 0 THEN
    v_bonus := v_bonus + 50;
  END IF;

  v_total_reward := v_base_reward + v_bonus;

  -- ── Reason label for ledger ───────────────────────────────────────────────
  v_reason_str :=
    CASE v_new_streak
      WHEN 500 THEN 'streak_milestone_500'
      WHEN 300 THEN 'streak_milestone_300'
      WHEN 200 THEN 'streak_milestone_200'
      WHEN 100 THEN 'streak_milestone_100'
      WHEN  50 THEN 'streak_milestone_50'
      WHEN  30 THEN 'streak_milestone_30'
      WHEN  28 THEN 'streak_milestone_28'
      WHEN  14 THEN 'streak_milestone_14'
      WHEN   7 THEN 'streak_milestone_7'
      ELSE
        CASE
          WHEN v_new_streak % 10 = 0 THEN 'streak_10x_bonus'
          WHEN v_new_streak >= 28    THEN 'daily_streak_28plus'
          WHEN v_new_streak >= 14    THEN 'daily_streak_14'
          WHEN v_new_streak >= 7     THEN 'daily_streak_7'
          WHEN v_new_streak >= 3     THEN 'daily_streak_3'
          ELSE                            'daily_login'
        END
    END;

  -- ── Atomic update ─────────────────────────────────────────────────────────
  UPDATE public.users
     SET anima_balance        = anima_balance + v_total_reward,
         login_streak         = v_new_streak,
         last_daily_claim     = now(),
         streak_freeze_count  = v_freeze_count
   WHERE id = v_user_id
   RETURNING anima_balance INTO v_new_balance;

  -- ── Ledger entry ──────────────────────────────────────────────────────────
  INSERT INTO public.anima_ledger (user_id, amount, balance_after, reason)
  VALUES (v_user_id, v_total_reward, v_new_balance, v_reason_str);

  RETURN jsonb_build_object(
    'claimed',       true,
    'streak',        v_new_streak,
    'anima_awarded', v_total_reward,
    'base_reward',   v_base_reward,
    'bonus',         v_bonus,
    'is_milestone',  v_bonus > 0,
    'used_freeze',   v_used_freeze,
    'freeze_count',  v_freeze_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;


-- ─── 3. buy_streak_freeze(quantity) ──────────────────────────────────────────
--
--  Purchase streak freezes for 50 ⬡ each (max 5 held at once).
--  A freeze is silently consumed inside claim_daily_reward when you miss
--  exactly 1 day, preserving your streak.
--
--  Returns jsonb:
--    success       bool
--    freeze_count  int  (new total)
--    balance_after int
--    cost          int  (anima actually deducted — may be < quantity*50 if cap hit)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.buy_streak_freeze(quantity integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid              := auth.uid();
  v_balance      integer;
  v_freeze_count integer;
  v_max_freezes  constant integer  := 5;
  v_freeze_price constant integer  := 50;
  v_can_add      integer;
  v_actual_qty   integer;
  v_cost         integer;
  v_new_count    integer;
  v_new_balance  integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF quantity < 1 OR quantity > 5 THEN
    RAISE EXCEPTION 'quantity must be 1–5';
  END IF;

  SELECT anima_balance, COALESCE(streak_freeze_count, 0)
    INTO v_balance, v_freeze_count
    FROM public.users
   WHERE id = v_user_id;

  v_can_add   := GREATEST(0, v_max_freezes - v_freeze_count);
  v_actual_qty := LEAST(quantity, v_can_add);

  IF v_actual_qty = 0 THEN
    RAISE EXCEPTION 'Streak freeze storage is full (max %)', v_max_freezes;
  END IF;

  v_cost := v_actual_qty * v_freeze_price;

  IF v_balance < v_cost THEN
    RAISE EXCEPTION 'Insufficient anima (need %, have %)', v_cost, v_balance;
  END IF;

  v_new_count := v_freeze_count + v_actual_qty;

  UPDATE public.users
     SET anima_balance       = anima_balance - v_cost,
         streak_freeze_count = v_new_count
   WHERE id = v_user_id
   RETURNING anima_balance INTO v_new_balance;

  INSERT INTO public.anima_ledger (user_id, amount, balance_after, reason)
  VALUES (v_user_id, -v_cost, v_new_balance, 'streak_freeze_purchase');

  RETURN jsonb_build_object(
    'success',       true,
    'freeze_count',  v_new_count,
    'balance_after', v_new_balance,
    'cost',          v_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buy_streak_freeze(integer) TO authenticated;
