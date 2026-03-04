-- ─── Add card_flavor to creatures ────────────────────────────────────────────
-- A short (~80-100 char) atmospheric one-liner written specifically for the
-- card face — no truncation, no run-on sentences.
-- Run this once in the Supabase SQL editor.

alter table public.creatures
  add column if not exists card_flavor text;

-- ─── Backfill existing card_definitions.flavor_text ──────────────────────────
-- After you re-run the folklore agent (which will now fill card_flavor for new
-- creatures), use this to sync already-minted card definitions too.
-- Safe to run multiple times — only updates rows where card_flavor is now set
-- and the current flavor_text still looks like a raw truncation (< 125 chars).
update public.card_definitions cd
set    flavor_text = c.card_flavor
from   public.creatures c
where  cd.creature_id  = c.id
  and  c.card_flavor   is not null
  and  c.card_flavor   <> ''
  and  (cd.flavor_text is null
     or length(cd.flavor_text) < 125);
