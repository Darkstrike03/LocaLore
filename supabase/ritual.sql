-- ─────────────────────────────────────────────────────────────────────────────
-- LocaLore — The Rite of Convergence  (run in Supabase SQL editor)
--
-- Community ritual: users sacrifice anima + cards as offerings.
-- Every week on Sunday ~02:00 UTC the Rite finalises:
--   • Groq generates a brand-new creature based on sacrificed ingredients
--   • Top 1-5  contributors  → EXCLUSIVE void_touched card of the new creature + 500 anima
--   • Top 6-20 contributors  → EXCLUSIVE ephemeral card of the new creature + 200 anima
--   • Rank 21-50             → 300 anima consolation (no creature card)
--   • Rank 51-100            → 150 anima consolation
--   • Rank 101+              → 50 anima consolation
--
-- Card sacrifice scoring is EXPONENTIAL (quality >> quantity):
--   50 whisper ≈ 1 remnant.  Sacrificing high-rarity cards is the path to void.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 1. Ritual sessions table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ritual_sessions (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  status            text         NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'finalizing', 'complete', 'cancelled')),
  starts_at         timestamptz  NOT NULL DEFAULT now(),
  ends_at           timestamptz  NOT NULL,           -- next Sunday 02:00 UTC
  title             text         NOT NULL DEFAULT 'The Rite of Convergence',
  lore_prompt_hint  text,                            -- optional seed for Groq
  total_anima_pool  integer      NOT NULL DEFAULT 0, -- running total
  total_cards_pool  integer      NOT NULL DEFAULT 0, -- total cards sacrificed
  creature_id       uuid         REFERENCES public.creatures (id),
  result_summary    jsonb,                           -- what Groq produced
  created_at        timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.ritual_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ritual_sessions"
  ON public.ritual_sessions FOR SELECT USING (true);
CREATE POLICY "Service role manages ritual_sessions"
  ON public.ritual_sessions FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── 2. Ritual contributions table ────────────────────────────────────────────
-- Each row = one offering by one user in a given ritual.
-- A user can offer multiple times; their score is the SUM.
CREATE TABLE IF NOT EXISTS public.ritual_contributions (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id       uuid         NOT NULL REFERENCES public.ritual_sessions (id) ON DELETE CASCADE,
  user_id         uuid         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  anima_offered   integer      NOT NULL DEFAULT 0 CHECK (anima_offered >= 0),
  card_score      integer      NOT NULL DEFAULT 0, -- rarity-weighted value of sacrificed cards
  cards_offered   jsonb        NOT NULL DEFAULT '[]', -- [{ user_card_id, card_name, rarity, rarity_score }]
  total_score     integer      GENERATED ALWAYS AS (anima_offered + card_score) STORED,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.ritual_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ritual_contributions"
  ON public.ritual_contributions FOR SELECT USING (true);
CREATE POLICY "Auth users insert own contributions"
  ON public.ritual_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fast leaderboard query
CREATE INDEX IF NOT EXISTS idx_ritual_contributions_ritual_user
  ON public.ritual_contributions (ritual_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ritual_contributions_score
  ON public.ritual_contributions (ritual_id, total_score DESC);


-- ─── 3. Ritual reward grants table ────────────────────────────────────────────
-- Written by the Edge Function once the Rite is complete.
CREATE TABLE IF NOT EXISTS public.ritual_rewards (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id       uuid        NOT NULL REFERENCES public.ritual_sessions (id),
  user_id         uuid        NOT NULL REFERENCES auth.users (id),
  rank            integer     NOT NULL,
  rarity_granted  text        NOT NULL,
  user_card_id    uuid        REFERENCES public.user_cards (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ritual_id, user_id)
);

ALTER TABLE public.ritual_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ritual_rewards"
  ON public.ritual_rewards FOR SELECT USING (true);


-- ─── 4. Helper: next Sunday 02:00 UTC ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.next_ritual_end()
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    date_trunc('week', now() AT TIME ZONE 'UTC')
    + INTERVAL '7 days'    -- next Sunday midnight UTC
    + INTERVAL '2 hours'   -- 02:00 UTC
    AT TIME ZONE 'UTC'
$$;


-- ─── 5. bootstrap_ritual() ───────────────────────────────────────────────────
-- Creates a new active ritual if none is currently active.
-- Safe to call repeatedly (idempotent).
CREATE OR REPLACE FUNCTION public.bootstrap_ritual()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_id       uuid;
BEGIN
  SELECT id INTO v_existing
    FROM public.ritual_sessions
   WHERE status = 'active'
   LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.ritual_sessions (ends_at)
  VALUES (public.next_ritual_end())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_ritual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_ritual() TO anon;


-- ─── 6. offer_to_ritual(ritual_id, anima_amount, card_ids[]) ─────────────────
--
-- Atomically:
--   1. Validates ritual is active & not expired
--   2. Deducts anima from user balance
--   3. Burns (locks + marks) each card, ensuring the user owns it
--   4. Inserts a contribution row
--   5. Updates ritual totals
--
-- Rarity scores (exponential — 50 whisper ≈ 1 remnant, etc.):
--   whisper=10  remnant=500  manifestation=2500
--   awakened=10000  ephemeral=30000  void_touched=80000
CREATE OR REPLACE FUNCTION public.offer_to_ritual(
  p_ritual_id    uuid,
  p_anima        integer    DEFAULT 0,
  p_card_ids     uuid[]     DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid    := auth.uid();
  v_ritual       record;
  v_balance      integer;
  v_cid          uuid;          -- loop variable for card ids
  v_card         record;
  v_card_score   integer := 0;
  v_cards_json   jsonb   := '[]';
  v_card_obj     jsonb;
  v_total_score  integer;
  v_new_bal      integer;
  v_rarity_score integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_anima < 0 THEN RAISE EXCEPTION 'Anima amount cannot be negative'; END IF;
  IF p_anima = 0 AND array_length(p_card_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Must offer at least some anima or one card';
  END IF;

  -- Fetch & validate ritual
  SELECT id, status, ends_at, total_anima_pool, total_cards_pool
    INTO v_ritual
    FROM public.ritual_sessions
   WHERE id = p_ritual_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Ritual not found'; END IF;
  IF v_ritual.status <> 'active' THEN RAISE EXCEPTION 'Ritual is not active'; END IF;
  IF now() >= v_ritual.ends_at THEN RAISE EXCEPTION 'Ritual has ended'; END IF;

  -- Fetch user balance
  SELECT anima_balance INTO v_balance FROM public.users WHERE id = v_user_id;
  IF v_balance < p_anima THEN
    RAISE EXCEPTION 'Insufficient anima (need %, have %)', p_anima, v_balance;
  END IF;

  -- Process cards
  IF p_card_ids IS NOT NULL THEN
    FOREACH v_cid IN ARRAY p_card_ids LOOP
      SELECT uc.id AS id, uc.user_id AS user_id,
             uc.is_locked AS is_locked,
             uc.is_listed_market AS is_listed_market,
             uc.is_listed_auction AS is_listed_auction,
             cd.rarity AS rarity, cr.name AS creature_name
        INTO v_card
        FROM public.user_cards       uc
        JOIN public.card_definitions cd ON cd.id = uc.card_def_id
        JOIN public.creatures        cr ON cr.id = cd.creature_id
       WHERE uc.id = v_cid;

      IF NOT FOUND THEN RAISE EXCEPTION 'Card % not found', v_cid; END IF;
      IF v_card.user_id <> v_user_id THEN RAISE EXCEPTION 'Card % is not yours', v_cid; END IF;
      IF v_card.is_locked THEN RAISE EXCEPTION 'Card % is locked', v_cid; END IF;
      IF v_card.is_listed_market OR v_card.is_listed_auction THEN
        RAISE EXCEPTION 'Card % is currently listed — delist before offering', v_cid;
      END IF;

      -- Exponential scoring: quality >> quantity
      v_rarity_score := CASE v_card.rarity
        WHEN 'whisper'        THEN     10
        WHEN 'remnant'        THEN    500
        WHEN 'manifestation'  THEN   2500
        WHEN 'awakened'       THEN  10000
        WHEN 'ephemeral'      THEN  30000
        WHEN 'void_touched'   THEN  80000
        ELSE 10
      END;

      v_card_score := v_card_score + v_rarity_score;

      v_card_obj := jsonb_build_object(
        'user_card_id',  v_cid,
        'card_name',     v_card.creature_name,
        'rarity',        v_card.rarity,
        'rarity_score',  v_rarity_score
      );
      v_cards_json := v_cards_json || jsonb_build_array(v_card_obj);

      -- Burn the card: lock + mark as ritually sacrificed
      UPDATE public.user_cards
         SET is_locked    = true,
             acquired_via = 'ritual'
       WHERE id = v_cid;
    END LOOP;
  END IF;

  v_total_score := p_anima + v_card_score;

  -- Deduct anima
  IF p_anima > 0 THEN
    UPDATE public.users
       SET anima_balance = anima_balance - p_anima
     WHERE id = v_user_id
     RETURNING anima_balance INTO v_new_bal;

    INSERT INTO public.anima_ledger (user_id, amount, balance_after, reason)
    VALUES (v_user_id, -p_anima, v_new_bal, 'ritual_offering');
  END IF;

  -- Record contribution
  INSERT INTO public.ritual_contributions
    (ritual_id, user_id, anima_offered, card_score, cards_offered)
  VALUES
    (p_ritual_id, v_user_id, p_anima, v_card_score, v_cards_json);

  -- Update ritual aggregate totals
  UPDATE public.ritual_sessions
     SET total_anima_pool = total_anima_pool + p_anima,
         total_cards_pool = total_cards_pool + COALESCE(array_length(p_card_ids, 1), 0)
   WHERE id = p_ritual_id;

  RETURN jsonb_build_object(
    'success',      true,
    'anima_given',  p_anima,
    'card_score',   v_card_score,
    'total_score',  v_total_score
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.offer_to_ritual(uuid, integer, uuid[]) TO authenticated;


-- ─── 7. get_ritual_leaderboard(ritual_id) ─────────────────────────────────────
-- Returns ranked contributors with aggregated score + per-rarity sacrifice breakdown.
CREATE OR REPLACE FUNCTION public.get_ritual_leaderboard(p_ritual_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb; BEGIN
  WITH card_rarities AS (
    -- Flatten all cards_offered JSON arrays into individual rarity values
    SELECT rc.user_id, elem->>'rarity' AS rarity
      FROM public.ritual_contributions rc
      CROSS JOIN LATERAL jsonb_array_elements(rc.cards_offered) AS elem
     WHERE rc.ritual_id = p_ritual_id
  ),
  rarity_counts AS (
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE rarity = 'whisper')        AS cnt_whisper,
      COUNT(*) FILTER (WHERE rarity = 'remnant')        AS cnt_remnant,
      COUNT(*) FILTER (WHERE rarity = 'manifestation')  AS cnt_manifestation,
      COUNT(*) FILTER (WHERE rarity = 'awakened')       AS cnt_awakened,
      COUNT(*) FILTER (WHERE rarity = 'ephemeral')      AS cnt_ephemeral,
      COUNT(*) FILTER (WHERE rarity = 'void_touched')   AS cnt_void_touched
    FROM card_rarities
    GROUP BY user_id
  )
  SELECT jsonb_agg(row ORDER BY row.rank) INTO v_result
  FROM (
    SELECT
      u.id           AS user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      SUM(rc.anima_offered)          AS anima_given,
      SUM(rc.card_score)             AS card_score,
      SUM(rc.total_score)            AS total_score,
      RANK() OVER (ORDER BY SUM(rc.total_score) DESC) AS rank,
      jsonb_build_object(
        'whisper',        COALESCE(MAX(rx.cnt_whisper),        0),
        'remnant',        COALESCE(MAX(rx.cnt_remnant),        0),
        'manifestation',  COALESCE(MAX(rx.cnt_manifestation),  0),
        'awakened',       COALESCE(MAX(rx.cnt_awakened),       0),
        'ephemeral',      COALESCE(MAX(rx.cnt_ephemeral),      0),
        'void_touched',   COALESCE(MAX(rx.cnt_void_touched),   0)
      ) AS rarity_breakdown
    FROM public.ritual_contributions rc
    JOIN public.users                u  ON u.id = rc.user_id
    LEFT JOIN rarity_counts          rx ON rx.user_id = rc.user_id
    WHERE rc.ritual_id = p_ritual_id
    GROUP BY u.id, u.username, u.display_name, u.avatar_url
    ORDER BY total_score DESC
    LIMIT 100
  ) row;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ritual_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ritual_leaderboard(uuid) TO anon;

-- ─── increment_copies_minted (called by finalize-ritual Edge Function) ─────────
CREATE OR REPLACE FUNCTION public.increment_copies_minted(p_def_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.card_definitions
    SET copies_minted = copies_minted + 1
  WHERE id = p_def_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_copies_minted(uuid) TO service_role;
