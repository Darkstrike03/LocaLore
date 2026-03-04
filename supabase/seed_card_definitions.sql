-- ============================================================
-- LocaLore — Seed Card Definitions from Existing Creatures
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- It creates one card_definition per creature, assigning rarity
-- based on verification status and creature type.
-- Safe to run again — skips creatures that already have a card.
-- ============================================================

-- ─── Rarity assignment rules ──────────────────────────────────────────────
-- verified   + scary type  → awakened
-- verified   + any type    → manifestation
-- unverified + scary type  → remnant
-- unverified + any type    → whisper
-- (void_touched and ephemeral are reserved for events / special drops)

INSERT INTO public.card_definitions (
  creature_id,
  rarity,
  flavor_text,
  art_variant,
  is_event_exclusive,
  edition_size,
  copies_minted
)
SELECT
  c.id,
  CASE
    WHEN c.verified = true  AND c.creature_type IN ('demon','undead','shapeshifter') THEN 'awakened'
    WHEN c.verified = true                                                            THEN 'manifestation'
    WHEN c.verified = false AND c.creature_type IN ('demon','undead','shapeshifter') THEN 'remnant'
    ELSE 'whisper'
  END AS rarity,
  -- Prefer card_flavor (purpose-written for the card face).
  -- Never fall back to a raw origin_story truncation — use a generic line instead.
  COALESCE(
    NULLIF(TRIM(c.card_flavor), ''),
    'A presence recorded in the archive. Handle with caution.'
  ) AS flavor_text,
  'default'  AS art_variant,
  false      AS is_event_exclusive,
  NULL       AS edition_size,   -- unlimited
  0          AS copies_minted
FROM public.creatures c
WHERE NOT EXISTS (
  -- Don't duplicate if a definition already exists for this creature
  SELECT 1 FROM public.card_definitions cd WHERE cd.creature_id = c.id
);

-- ─── Verify the result ────────────────────────────────────────────────────
SELECT
  rarity,
  COUNT(*) AS card_count
FROM public.card_definitions
GROUP BY rarity
ORDER BY
  CASE rarity
    WHEN 'whisper'       THEN 1
    WHEN 'remnant'       THEN 2
    WHEN 'manifestation' THEN 3
    WHEN 'awakened'      THEN 4
    WHEN 'ephemeral'     THEN 5
    WHEN 'void_touched'  THEN 6
  END;
-- ✅ EXPECT: rows here with card counts per rarity tier
-- If 0 rows total → no creatures exist in the archive yet (submit some first)
