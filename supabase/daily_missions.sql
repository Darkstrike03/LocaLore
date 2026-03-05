-- ─────────────────────────────────────────────────────────────────────────────
-- LocaLore — Daily Missions  (run in Supabase SQL editor)
--
-- 3 rotating missions refresh every UTC midnight.
-- Each mission has a type, a target count, and an anima reward.
-- Completing all 3 in one day grants a bonus.
--
-- Mission types:
--   react_creatures   — react to N different creature profiles
--   file_sighting     — file N sightings
--   bookmark_creature — bookmark N creatures
--   open_library      — view the library (tracked by completion, count=1)
--   visit_leaderboard — visit the leaderboard (count=1)
--   buy_pack          — open a card pack (count=1)
--   trade_card        — complete a trade (count=1)
--   submit_creature   — submit a creature (count=1)
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. Mission definitions table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mission_definitions (
  id          serial      PRIMARY KEY,
  mission_key text        NOT NULL UNIQUE,
  label       text        NOT NULL,
  description text        NOT NULL,
  reward      integer     NOT NULL,   -- anima reward on completion
  target      integer     NOT NULL DEFAULT 1,
  is_active   boolean     NOT NULL DEFAULT true
);

ALTER TABLE public.mission_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read mission_definitions"
  ON public.mission_definitions FOR SELECT USING (true);

-- Seed missions
INSERT INTO public.mission_definitions (mission_key, label, description, reward, target) VALUES
  ('react_3',            'First Reactions',       'React to 3 creature profiles',        8,  3),
  ('react_5',            'Emotional Archivist',   'React to 5 creature profiles',        15, 5),
  ('bookmark_2',         'Bookmark Keeper',        'Bookmark 2 creatures',                10, 2),
  ('bookmark_5',         'Grimoire Builder',       'Bookmark 5 creatures',                20, 5),
  ('file_sighting',      'Field Reporter',         'File 1 sighting report',              15, 1),
  ('file_2_sightings',   'Keen Observer',          'File 2 sightings today',              30, 2),
  ('submit_creature',    'Folklore Scribe',        'Submit a new creature',               50, 1),
  ('open_pack',          'Fate & Fortune',         'Open a card pack',                    25, 1),
  ('complete_trade',     'Merchant of Myths',      'Complete a card trade',               30, 1),
  ('visit_library',      'Scholar''s Watch',       'Browse the creature library',          5, 1),
  ('visit_leaderboard',  'Order Observer',         'Check the Order of the Witnessed',    5,  1),
  ('win_auction',        'Auction Victor',         'Win an auction bid',                  40, 1),
  ('list_market',        'Market Vendor',          'List a card on the marketplace',      15, 1)
ON CONFLICT (mission_key) DO NOTHING;


-- ─── 2. User daily missions table ────────────────────────────────────────────
-- One row per user per UTC date per mission slot (slots 1-3).
CREATE TABLE IF NOT EXISTS public.user_daily_missions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  mission_def_id integer     NOT NULL REFERENCES public.mission_definitions (id),
  slot           integer     NOT NULL CHECK (slot BETWEEN 1 AND 3),
  mission_date   date        NOT NULL DEFAULT (current_date AT TIME ZONE 'UTC'),
  progress       integer     NOT NULL DEFAULT 0,
  completed      boolean     NOT NULL DEFAULT false,
  claimed        boolean     NOT NULL DEFAULT false,
  bonus_claimed  boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_date, slot)
);

ALTER TABLE public.user_daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own missions"
  ON public.user_daily_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System manages missions"
  ON public.user_daily_missions FOR ALL
  USING (true) WITH CHECK (true);

-- Index for common query pattern
CREATE INDEX IF NOT EXISTS idx_user_daily_missions_user_date
  ON public.user_daily_missions (user_id, mission_date);


-- ─── 3. get_or_create_daily_missions() ──────────────────────────────────────
--
--  Returns today's 3 mission rows for the calling user, creating them if they
--  don't exist yet (picks 3 random active missions without repeating).
--
--  Returns: json array of mission rows joined with definition data.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_daily_missions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_today    date := (now() AT TIME ZONE 'UTC')::date;
  v_count    integer;
  v_def_ids  integer[];
  v_result   jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if missions already exist for today
  SELECT COUNT(*) INTO v_count
    FROM public.user_daily_missions
   WHERE user_id = v_user_id AND mission_date = v_today;

  IF v_count < 3 THEN
    -- Pick 3 random active mission definitions not already assigned today
    SELECT ARRAY(
      SELECT id
        FROM public.mission_definitions
       WHERE is_active = true
         AND id NOT IN (
           SELECT mission_def_id
             FROM public.user_daily_missions
            WHERE user_id = v_user_id AND mission_date = v_today
         )
       ORDER BY random()
       LIMIT (3 - v_count)
    ) INTO v_def_ids;

    -- Insert the missing slots
    INSERT INTO public.user_daily_missions (user_id, mission_def_id, slot, mission_date)
    SELECT v_user_id,
           v_def_ids[i],
           v_count + i,
           v_today
      FROM generate_series(1, array_length(v_def_ids, 1)) AS gs(i)
     ON CONFLICT (user_id, mission_date, slot) DO NOTHING;
  END IF;

  -- Return today's missions with definition data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',          m.id,
      'slot',        m.slot,
      'progress',    m.progress,
      'completed',   m.completed,
      'claimed',     m.claimed,
      'key',         d.mission_key,
      'label',       d.label,
      'description', d.description,
      'reward',      d.reward,
      'target',      d.target
    ) ORDER BY m.slot
  )
  INTO v_result
  FROM public.user_daily_missions m
  JOIN public.mission_definitions d ON d.id = m.mission_def_id
  WHERE m.user_id = v_user_id AND m.mission_date = v_today;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_daily_missions() TO authenticated;


-- ─── 4. increment_mission_progress(mission_key) ──────────────────────────────
--
--  Called server-side (or from anima award hooks) to tick progress on a
--  matching active mission for today. Safe to call even if no mission matches.
--
--  Returns: jsonb { matched: bool, completed: bool, mission_id: uuid|null }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_mission_progress(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_today    date := (now() AT TIME ZONE 'UTC')::date;
  v_mission  record;
  v_def      record;
BEGIN
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('matched', false); END IF;

  -- Find the relevant open mission for today
  SELECT m.id, m.progress, m.completed, d.target, d.mission_key
    INTO v_mission
    FROM public.user_daily_missions m
    JOIN public.mission_definitions d ON d.id = m.mission_def_id
   WHERE m.user_id    = v_user_id
     AND m.mission_date = v_today
     AND d.mission_key  = p_key
     AND m.completed    = false
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false);
  END IF;

  UPDATE public.user_daily_missions
     SET progress  = LEAST(progress + 1, v_mission.target),
         completed = (progress + 1 >= v_mission.target)
   WHERE id = v_mission.id
   RETURNING completed INTO v_mission.completed;

  RETURN jsonb_build_object(
    'matched',    true,
    'completed',  v_mission.completed,
    'mission_id', v_mission.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_mission_progress(text) TO authenticated;


-- ─── 5. claim_mission_reward(mission_id) ─────────────────────────────────────
--
--  Awards anima for a completed, unclaimed mission.
--  If ALL 3 missions are now claimed, also gives a +50⬡ all-complete bonus.
--
--  Returns: { success, reward, bonus, balance_after }
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid    := auth.uid();
  v_today       date    := (now() AT TIME ZONE 'UTC')::date;
  v_mission     record;
  v_reward      integer;
  v_bonus       integer := 0;
  v_new_balance integer;
  v_all_claimed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.id, m.completed, m.claimed, m.bonus_claimed, d.reward, d.label
    INTO v_mission
    FROM public.user_daily_missions m
    JOIN public.mission_definitions d ON d.id = m.mission_def_id
   WHERE m.id      = p_mission_id
     AND m.user_id = v_user_id
     AND m.mission_date = v_today;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found';
  END IF;
  IF NOT v_mission.completed THEN
    RAISE EXCEPTION 'Mission not yet completed';
  END IF;
  IF v_mission.claimed THEN
    RAISE EXCEPTION 'Reward already claimed';
  END IF;

  v_reward := v_mission.reward;

  -- Mark as claimed
  UPDATE public.user_daily_missions SET claimed = true WHERE id = p_mission_id;

  -- Check if all 3 missions for today are now claimed → grant bonus
  SELECT bool_and(claimed) INTO v_all_claimed
    FROM public.user_daily_missions
   WHERE user_id = v_user_id AND mission_date = v_today;

  IF v_all_claimed THEN
    v_bonus := 50;
    -- Mark bonus_claimed on all 3 so it isn't double-awarded
    UPDATE public.user_daily_missions
       SET bonus_claimed = true
     WHERE user_id = v_user_id AND mission_date = v_today;
  END IF;

  -- Award anima (balance + ledger)
  UPDATE public.users
     SET anima_balance = anima_balance + v_reward + v_bonus
   WHERE id = v_user_id
   RETURNING anima_balance INTO v_new_balance;

  INSERT INTO public.anima_ledger (user_id, amount, balance_after, reason)
  VALUES (v_user_id, v_reward + v_bonus, v_new_balance,
          'mission_reward:' || v_mission.label);

  RETURN jsonb_build_object(
    'success',       true,
    'reward',        v_reward,
    'bonus',         v_bonus,
    'balance_after', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_mission_reward(uuid) TO authenticated;
