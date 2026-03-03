-- ============================================================
-- LocaLore — Regional Collections Setup
-- Run in Supabase SQL Editor AFTER seed_card_definitions.sql
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ── 1. Set edition sizes on existing card_definitions ──────
-- These limits make every card truly scarce.
-- void_touched : max 5  (one-of-a-kind tier)
-- ephemeral    : max 15 (near-impossible)
-- awakened     : max 50 (rare, tradeable)
-- manifestation: max 200
-- remnant      : max 750
-- whisper      : unlimited (null)

UPDATE public.card_definitions SET edition_size =   5 WHERE rarity = 'void_touched' AND edition_size IS NULL;
UPDATE public.card_definitions SET edition_size =  15 WHERE rarity = 'ephemeral'    AND edition_size IS NULL;
UPDATE public.card_definitions SET edition_size =  50 WHERE rarity = 'awakened'     AND edition_size IS NULL;
UPDATE public.card_definitions SET edition_size = 200 WHERE rarity = 'manifestation' AND edition_size IS NULL;
UPDATE public.card_definitions SET edition_size = 750 WHERE rarity = 'remnant'      AND edition_size IS NULL;
-- whisper stays NULL (unlimited)

-- ── 2. Prevent minting beyond edition_size ─────────────────
-- Function used by VaultPage's pack-opening RPC guard (optional, informational)
CREATE OR REPLACE FUNCTION public.card_slots_remaining(def_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT CASE
    WHEN cd.edition_size IS NULL THEN 999999
    ELSE GREATEST(0, cd.edition_size - cd.copies_minted)
  END
  FROM public.card_definitions cd
  WHERE cd.id = def_id;
$$;

-- ── 3. Seed regional packs ─────────────────────────────────
-- Each pack draws from a specific country's creatures.
-- region_filter must match creature.country values in your DB.

INSERT INTO public.card_packs (
  name, slug, description, cost_anima, card_count,
  weight_whisper, weight_remnant, weight_manifestation,
  weight_awakened, weight_ephemeral, weight_void_touched,
  region_filter, is_active
) VALUES
  -- East Asia
  ('Nihon Codex',      'nihon-codex',
   'Sealed records from the shrines and forests of Japan. Kappa, Kitsune, Oni await.',
   400, 4, 40, 30, 18, 9, 2, 1, 'Japan', true),

  ('Middle Kingdom Scroll', 'middle-kingdom-scroll',
   'Entries drawn from ancient Chinese folklore — dragons, hungry ghosts, and fox spirits.',
   400, 4, 40, 30, 18, 9, 2, 1, 'China', true),

  ('Joseon Codex',     'joseon-codex',
   'Records from the Korean peninsula. Dokkaebi and Gumiho hide within these pages.',
   400, 4, 42, 30, 17, 8, 2, 1, 'Korea', true),

  -- South & Southeast Asia
  ('Vedic Folio',      'vedic-folio',
   'Pulled from the deep roots of Indian myth. Rakshasa, Naga, Vetala.',
   400, 4, 40, 30, 18, 9, 2, 1, 'India', true),

  ('Nusantara Pack',   'nusantara-pack',
   'The archipelago speaks. Kuntilanak, Pocong, and Wewe Gombel are among the recorded.',
   380, 4, 44, 30, 16, 7, 2, 1, 'Indonesia', true),

  -- Europe & British Isles
  ('Celtic Grimoire',  'celtic-grimoire',
   'From the bogs, barrows, and standing stones. The Fae do not forgive intrusion.',
   400, 4, 38, 32, 18, 9, 2, 1, 'Ireland', true),

  ('Albion Archive',   'albion-archive',
   'British Isles entries. Black Shuck, Jenny Greenteeth, Spring-Heeled Jack.',
   400, 4, 38, 32, 18, 9, 2, 1, 'UK', true),

  ('Slavic Folio',     'slavic-folio',
   'From the deep east. Domovoi, Rusalka, Leshy — the old world watches.',
   380, 4, 42, 30, 17, 8, 2, 1, 'Russia', true),

  -- Americas
  ('Mesoamerican Codex','mesoamerican-codex',
   'Creatures of Aztec and Maya origin. The Nahual walks where the sun sets.',
   400, 4, 40, 30, 18, 9, 2, 1, 'Mexico', true),

  -- Africa & Middle East
  ('Pharaonic Scroll', 'pharaonic-scroll',
   'Egyptian entities: Ammit, the Devourer, and older things with no name.',
   380, 4, 42, 28, 18, 9, 2, 1, 'Egypt', true)

ON CONFLICT (slug) DO NOTHING;

-- ── 4. Verify ──────────────────────────────────────────────
SELECT
  rarity,
  COUNT(*) AS total_defs,
  MIN(edition_size) AS min_edition,
  MAX(edition_size) AS max_edition,
  SUM(CASE WHEN edition_size IS NULL THEN 1 ELSE 0 END) AS unlimited_count
FROM public.card_definitions
GROUP BY rarity
ORDER BY CASE rarity
  WHEN 'whisper' THEN 1 WHEN 'remnant' THEN 2 WHEN 'manifestation' THEN 3
  WHEN 'awakened' THEN 4 WHEN 'ephemeral' THEN 5 WHEN 'void_touched' THEN 6
END;

SELECT name, region_filter, cost_anima, card_count, is_active
FROM public.card_packs
ORDER BY region_filter NULLS FIRST, cost_anima;
-- ✅ EXPECT: whisper has unlimited_count > 0, others have edition sizes
-- ✅ EXPECT: 10+ new regional packs visible
