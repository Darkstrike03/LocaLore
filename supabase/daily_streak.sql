-- Add daily claim tracking to the users table
-- Run this in the Supabase SQL editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS login_streak     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_claim timestamptz;

-- Atomic daily claim function.
-- Awards anima for the streak milestone hit on this claim.
-- Returns: { claimed: bool, streak: int, anima_awarded: int }
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_last_claim  timestamptz;
  v_streak      integer;
  v_reward      integer := 1;   -- base daily reward (1 anima)
  v_new_streak  integer;
  v_new_balance integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_daily_claim, login_streak
    INTO v_last_claim, v_streak
    FROM public.users
   WHERE id = v_user_id;

  -- Already claimed today (UTC)
  IF v_last_claim IS NOT NULL AND
     date_trunc('day', v_last_claim AT TIME ZONE 'UTC') = date_trunc('day', now() AT TIME ZONE 'UTC')
  THEN
    RETURN jsonb_build_object('claimed', false, 'streak', v_streak, 'anima_awarded', 0);
  END IF;

  -- Broke the streak (missed more than 1 day)
  IF v_last_claim IS NULL OR
     now() - v_last_claim > INTERVAL '48 hours'
  THEN
    v_new_streak := 1;
  ELSE
    v_new_streak := COALESCE(v_streak, 0) + 1;
  END IF;

  -- Milestone bonuses
  IF    v_new_streak >= 14 THEN v_reward := 40;
  ELSIF v_new_streak >= 7  THEN v_reward := 15;
  ELSIF v_new_streak >= 3  THEN v_reward :=  5;
  END IF;

  -- Update user row atomically
  UPDATE public.users
     SET anima_balance   = anima_balance + v_reward,
         login_streak    = v_new_streak,
         last_daily_claim = now()
   WHERE id = v_user_id
   RETURNING anima_balance INTO v_new_balance;

  -- Write ledger entry
  INSERT INTO public.anima_ledger (user_id, amount, balance_after, reason)
  VALUES (v_user_id, v_reward, v_new_balance,
          CASE
            WHEN v_new_streak >= 14 THEN 'daily_streak_14'
            WHEN v_new_streak >= 7  THEN 'daily_streak_7'
            WHEN v_new_streak >= 3  THEN 'daily_streak_3'
            ELSE                         'daily_login'
          END);

  RETURN jsonb_build_object('claimed', true, 'streak', v_new_streak, 'anima_awarded', v_reward);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_reward() TO authenticated;
