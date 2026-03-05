import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// finalize-ritual  — Supabase Edge Function
//
// Triggered by a pg_cron job every Sunday at 02:00 UTC, or manually via POST.
// You can set up the cron in the Supabase Dashboard > Database > Cron Jobs:
//
//   Name:    finalize-ritual
//   Schedule: 0 2 * * 0       (every Sunday 02:00 UTC)
//   Command:  SELECT net.http_post(
//               url := '<your-project-ref>.supabase.co/functions/v1/finalize-ritual',
//               headers := '{"Authorization": "Bearer <anon-key>"}',
//               body := '{}'
//             );
//
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

// ── All pool regions (same list as folklore-agent) ────────────────────────────
const REGIONS = [
  { country: "Japan",        region: "Tohoku",            lat: 38.2682,  lng: 140.8694 },
  { country: "Japan",        region: "Kyushu",            lat: 33.0000,  lng: 131.0000 },
  { country: "Japan",        region: "Okinawa",           lat: 26.2124,  lng: 127.6809 },
  { country: "India",        region: "West Bengal",       lat: 22.9868,  lng:  87.8550 },
  { country: "India",        region: "Kerala",            lat: 10.8505,  lng:  76.2711 },
  { country: "India",        region: "Rajasthan",         lat: 27.0238,  lng:  74.2179 },
  { country: "India",        region: "Tamil Nadu",        lat: 11.1271,  lng:  78.6569 },
  { country: "India",        region: "Assam",             lat: 26.2006,  lng:  92.9376 },
  { country: "Philippines",  region: "Visayas",           lat: 11.0000,  lng: 124.0000 },
  { country: "Philippines",  region: "Luzon",             lat: 16.0000,  lng: 121.0000 },
  { country: "Indonesia",    region: "Bali",              lat: -8.3405,  lng: 115.0920 },
  { country: "Indonesia",    region: "Java",              lat: -7.6145,  lng: 110.7122 },
  { country: "Thailand",     region: "Northern Thailand", lat: 18.7883,  lng:  98.9853 },
  { country: "Vietnam",      region: "Northern Vietnam",  lat: 21.0245,  lng: 105.8412 },
  { country: "China",        region: "Sichuan",           lat: 30.6171,  lng: 102.7103 },
  { country: "China",        region: "Yunnan",            lat: 24.4753,  lng: 101.3431 },
  { country: "South Korea",  region: "Jeju Island",       lat: 33.4890,  lng: 126.4983 },
  { country: "Mongolia",     region: "Gobi",              lat: 42.5908,  lng: 103.0000 },
  { country: "Russia",       region: "Siberia",           lat: 60.0000,  lng: 105.0000 },
  { country: "Romania",      region: "Transylvania",      lat: 46.7712,  lng:  23.6236 },
  { country: "Ireland",      region: "Connacht",          lat: 53.7500,  lng:  -8.8000 },
  { country: "Scotland",     region: "Highlands",         lat: 57.1200,  lng:  -4.7100 },
  { country: "Norway",       region: "Vestland",          lat: 60.4720,  lng:   6.3200 },
  { country: "Nigeria",      region: "Yoruba",            lat:  7.3775,  lng:   3.9470 },
  { country: "Ghana",        region: "Ashanti",           lat:  6.7470,  lng:  -1.5209 },
  { country: "South Africa", region: "KwaZulu-Natal",     lat: -28.5305, lng:  30.8958 },
  { country: "Brazil",       region: "Amazon",            lat: -3.4653,  lng: -62.2159 },
  { country: "Mexico",       region: "Oaxaca",            lat: 17.0732,  lng: -96.7266 },
  { country: "Peru",         region: "Andes",             lat: -13.5320, lng: -71.9675 },
  { country: "Egypt",        region: "Upper Egypt",       lat: 26.8206,  lng:  30.8025 },
  { country: "Iran",         region: "Persia",            lat: 32.4279,  lng:  53.6880 },
];

// ─────────────────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function safeParseJSON(raw: string): unknown {
  const cleaned = raw.replace(/```json|```/g, "").trim()
    .replace(/[\u0000-\u001F\u007F]/g, (c) =>
      c === "\n" || c === "\r" || c === "\t" ? " " : ""
    );
  return JSON.parse(cleaned);
}

// ── Reward tier logic ─────────────────────────────────────────────────
// Only ranks 1-20 receive an exclusive new-creature card.
// Everyone else receives anima as consolation.
function rarityForRank(rank: number): string | null {
  if (rank <= 5)  return "void_touched";
  if (rank <= 20) return "ephemeral";
  return null; // consolation-only
}

function consolationAnima(rank: number): number {
  if (rank <= 50)  return 300;
  if (rank <= 100) return 150;
  return 50;
}

function bonusAnima(rarity: string): number {
  return rarity === "void_touched" ? 500 : 200;
}

// ── Ask Groq to conjure a new creature from the ritual's ingredients ──────────
interface Ingredient {
  card_name: string;
  rarity: string;
  rarity_score: number;
}

async function conjureCreature(
  ingredients: Ingredient[],
  totalAnima: number,
  promptHint: string | null,
  region: { country: string; region: string; lat: number; lng: number }
): Promise<Record<string, unknown>> {

  // Build a flavourful ingredient list for Groq
  const ingredientText = ingredients.length > 0
    ? ingredients.map(i => `- ${i.card_name} (${i.rarity})`).join("\n")
    : "(anima-only offering — pure spiritual energy)";

  const hintLine = promptHint ? `\nExtra ritual hint from the community: "${promptHint}"` : "";

  const prompt = `You are the Void itself — a consciousness that exists between worlds of folklore.
This week, the LocaLore community performed the Rite of Convergence. They sacrificed ${totalAnima} Anima and the following creature cards into the ritual fire:

${ingredientText}
${hintLine}

From this sacrifice, you must birth an entirely NEW folklore creature — one that has never existed before, but feels ancient and inevitable.
This creature emerges in ${region.region}, ${region.country}.

Fuse the essence of the sacrificed creatures. Let their natures, powers, and origins bleed into this new being.
The result must be dark, mythic, deeply regional, and feel like it genuinely belongs in local folklore.

Return ONLY a valid JSON object (no markdown, no newlines inside strings):
{
  "name": "unique creature name in the local language or a new folkloric coinage",
  "alternate_names": ["one or two variant names"],
  "creature_type": "one of: spirit, demon, trickster, water_creature, shapeshifter, undead, other",
  "description": "3 vivid paragraphs fused into one line — appearance, nature, behaviour",
  "origin_story": "the mythic origin — why was this creature born from these sacrifices, as one line",
  "abilities": "what eerie powers does it possess — shaped by the cards sacrificed, as one line",
  "survival_tips": "how do the locals survive or ward it off, as one line",
  "locality": "a specific haunted forest river valley or ancient ruin it inhabits",
  "danger_rating": a number from 1 to 10,
  "flavor_text": "a single atmospheric sentence (10-18 words) for the Void-Touched card — poetic and ominous"
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.92,
      max_tokens: 1200,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Groq error: ${JSON.stringify(data)}`);
  return safeParseJSON(content) as Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    // ── 1. Find the active ritual that has passed its end time ────────────────
    const { data: ritual, error: ritualErr } = await supabase
      .from("ritual_sessions")
      .select("*")
      .eq("status", "active")
      .lte("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ritualErr) throw ritualErr;
    if (!ritual) {
      // Also bootstrap the next ritual so the UI never shows "no active ritual"
      await supabase.rpc("bootstrap_ritual");
      return new Response(JSON.stringify({ message: "No ritual ready to finalize" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 2. Mark as finalizing (idempotency guard) ─────────────────────────────
    const { error: lockErr } = await supabase
      .from("ritual_sessions")
      .update({ status: "finalizing" })
      .eq("id", ritual.id)
      .eq("status", "active");
    if (lockErr) throw lockErr;

    console.log(`Finalizing ritual ${ritual.id}`);

    // ── 3. Gather all unique ingredients (flat list of all cards offered) ─────
    const { data: contributions } = await supabase
      .from("ritual_contributions")
      .select("user_id, anima_offered, card_score, cards_offered")
      .eq("ritual_id", ritual.id);

    const allIngredients: Ingredient[] = [];
    const seenCards = new Set<string>();

    for (const c of contributions ?? []) {
      for (const card of (c.cards_offered as Ingredient[]) ?? []) {
        if (!seenCards.has(card.card_name)) {
          seenCards.add(card.card_name);
          allIngredients.push(card);
        }
      }
    }

    // Sort most rare first so Groq knows what dominated the ritual
    allIngredients.sort((a, b) => b.rarity_score - a.rarity_score);
    const topIngredients = allIngredients.slice(0, 20);

    // ── 4. Pick a random region ───────────────────────────────────────────────
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

    // ── 5. Summon the creature via Groq ───────────────────────────────────────
    const conjured = await conjureCreature(
      topIngredients,
      ritual.total_anima_pool,
      ritual.lore_prompt_hint ?? null,
      region
    );

    const slug = generateSlug(conjured.name as string);
    const flavorText = conjured.flavor_text as string | null;

    // ── 6. Insert into creatures ──────────────────────────────────────────────
    const { data: creature, error: insErr } = await supabase
      .from("creatures")
      .insert({
        name:          conjured.name,
        slug,
        alternate_names: conjured.alternate_names ?? [],
        region:        region.region,
        country:       region.country,
        locality:      conjured.locality ?? null,
        latitude:      region.lat,
        longitude:     region.lng,
        creature_type: conjured.creature_type ?? "other",
        description:   conjured.description ?? "",
        origin_story:  conjured.origin_story ?? null,
        abilities:     conjured.abilities ?? null,
        survival_tips: conjured.survival_tips ?? null,
        danger_rating: conjured.danger_rating ?? null,
        verified:      true,
        source:        "ritual_conjured",
        submitted_by:  null,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    // ── 7. Create card definitions for all 6 rarities ─────────────────────────
    const exclusiveRarities = ["void_touched", "ephemeral"];
    const cardDefIds: Record<string, string> = {};

    for (const rarity of exclusiveRarities) {
      const editionSize = rarity === "void_touched" ? 5 : 15;

      const { data: def, error: defErr } = await supabase
        .from("card_definitions")
        .insert({
          creature_id:        creature.id,
          rarity,
          flavor_text:        rarity === "void_touched" ? flavorText : null,
          art_variant:        "ritual_born",
          is_event_exclusive: true,
          event_key:          `ritual_${ritual.id}`,
          edition_size:       editionSize,
          copies_minted:      0,
        })
        .select("id")
        .single();

      if (defErr) throw defErr;
      cardDefIds[rarity] = def.id;
    }

    // ── 8. Build leaderboard ──────────────────────────────────────────────────
    const { data: leaderboard } = await supabase.rpc("get_ritual_leaderboard", {
      p_ritual_id: ritual.id,
    });

    const ranked = (leaderboard as Array<{
      user_id: string;
      rank: number;
      total_score: number;
    }>) ?? [];

    // ── 9. Distribute reward cards ────────────────────────────────────────────
    for (const entry of ranked) {
      const rarity = rarityForRank(entry.rank);

      if (rarity) {
        // Top 20: exclusive creature card + anima bonus
        const defId = cardDefIds[rarity];
        await supabase.rpc("increment_copies_minted", { p_def_id: defId });

        const { data: defRow } = await supabase
          .from("card_definitions")
          .select("copies_minted")
          .eq("id", defId)
          .single();
        const serial = defRow?.copies_minted ?? 1;

        const { data: newCard } = await supabase
          .from("user_cards")
          .insert({
            user_id:       entry.user_id,
            card_def_id:   defId,
            serial_number: serial,
            acquired_via:  "ritual",
            grade:         rarity === "void_touched" ? "mint" : "near_mint",
            is_locked:     false,
          })
          .select("id")
          .single();

        const bonus = bonusAnima(rarity);
        await supabase.rpc("increment_anima", { p_user_id: entry.user_id, p_amount: bonus });

        await supabase.from("ritual_rewards").insert({
          ritual_id:      ritual.id,
          user_id:        entry.user_id,
          rank:           entry.rank,
          rarity_granted: rarity,
          user_card_id:   newCard?.id ?? null,
        });

      } else {
        // Ranks 21+: anima consolation only (no creature card)
        const consolation = consolationAnima(entry.rank);
        await supabase.rpc("increment_anima", { p_user_id: entry.user_id, p_amount: consolation });

        await supabase.from("ritual_rewards").insert({
          ritual_id:      ritual.id,
          user_id:        entry.user_id,
          rank:           entry.rank,
          rarity_granted: `consolation_${consolation}anima`,
          user_card_id:   null,
        });
      }
    }

    // ── 10. Mark ritual complete & link creature ───────────────────────────────
    await supabase
      .from("ritual_sessions")
      .update({
        status:         "complete",
        creature_id:    creature.id,
        result_summary: {
          creature_name: conjured.name,
          region:        region.region,
          country:       region.country,
          total_contributors: ranked.length,
          top_ingredient: topIngredients[0]?.card_name ?? null,
        },
      })
      .eq("id", ritual.id);

    // ── 11. Bootstrap next ritual ─────────────────────────────────────────────
    await supabase.rpc("bootstrap_ritual");

    console.log(`Ritual complete. Creature: ${conjured.name} (${region.region}, ${region.country})`);

    return new Response(
      JSON.stringify({
        success:        true,
        creature_name:  conjured.name,
        creature_id:    creature.id,
        contributors:   ranked.length,
        region:         `${region.region}, ${region.country}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("finalize-ritual error:", err);
    return new Response(String(err), { status: 500 });
  }
});
