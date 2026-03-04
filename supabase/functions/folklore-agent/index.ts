import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY")!;

// ── Regions the agent will autonomously explore ───────────────────────────────
const REGIONS = [
  { country: "Japan",        region: "Tohoku",          lat: 38.2682,  lng: 140.8694 },
  { country: "Japan",        region: "Kyushu",          lat: 33.0000,  lng: 131.0000 },
  { country: "Japan",        region: "Okinawa",         lat: 26.2124,  lng: 127.6809 },
  { country: "India",        region: "West Bengal",     lat: 22.9868,  lng:  87.8550 },
  { country: "India",        region: "Kerala",          lat: 10.8505,  lng:  76.2711 },
  { country: "India",        region: "Rajasthan",       lat: 27.0238,  lng:  74.2179 },
  { country: "India",        region: "Tamil Nadu",      lat: 11.1271,  lng:  78.6569 },
  { country: "India",        region: "Assam",           lat: 26.2006,  lng:  92.9376 },
  { country: "Philippines",  region: "Visayas",         lat: 11.0000,  lng: 124.0000 },
  { country: "Philippines",  region: "Luzon",           lat: 16.0000,  lng: 121.0000 },
  { country: "Indonesia",    region: "Bali",            lat: -8.3405,  lng: 115.0920 },
  { country: "Indonesia",    region: "Java",            lat: -7.6145,  lng: 110.7122 },
  { country: "Thailand",     region: "Northern Thailand", lat: 18.7883, lng:  98.9853 },
  { country: "Vietnam",      region: "Northern Vietnam", lat: 21.0245,  lng: 105.8412 },
  { country: "China",        region: "Sichuan",         lat: 30.6171,  lng: 102.7103 },
  { country: "China",        region: "Yunnan",          lat: 24.4753,  lng: 101.3431 },
  { country: "South Korea",  region: "Jeju Island",     lat: 33.4890,  lng: 126.4983 },
  { country: "Mongolia",     region: "Gobi",            lat: 42.5908,  lng: 103.0000 },
  { country: "Russia",       region: "Siberia",         lat: 60.0000,  lng: 105.0000 },
  { country: "Romania",      region: "Transylvania",    lat: 46.7712,  lng:  23.6236 },
  { country: "Ireland",      region: "Connacht",        lat: 53.7500,  lng:  -8.8000 },
  { country: "Scotland",     region: "Highlands",       lat: 57.1200,  lng:  -4.7100 },
  { country: "Norway",       region: "Vestland",        lat: 60.4720,  lng:   6.3200 },
  { country: "Nigeria",      region: "Yoruba",          lat:  7.3775,  lng:   3.9470 },
  { country: "Ghana",        region: "Ashanti",         lat:  6.7470,  lng:  -1.5209 },
  { country: "South Africa", region: "KwaZulu-Natal",   lat: -28.5305, lng:  30.8958 },
  { country: "Brazil",       region: "Amazon",          lat: -3.4653,  lng: -62.2159 },
  { country: "Mexico",       region: "Oaxaca",          lat: 17.0732,  lng: -96.7266 },
  { country: "Peru",         region: "Andes",           lat: -13.5320, lng: -71.9675 },
  { country: "Egypt",        region: "Upper Egypt",     lat: 26.8206,  lng:  30.8025 },
  { country: "Iran",         region: "Persia",          lat: 32.4279,  lng:  53.6880 },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function safeParseJSON(raw: string): unknown {
  let cleaned = raw.replace(/```json|```/g, "").trim();
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, (char) => {
    if (char === "\n" || char === "\r" || char === "\t") return " ";
    return "";
  });
  return JSON.parse(cleaned);
}

// ── Step 1: Ask Groq to suggest creature names for a region ───────────────────
async function discoverCreatureNames(
  country: string,
  region: string,
  existingNames: string[]
): Promise<string[]> {
  const existing = existingNames.length > 0
    ? `Do NOT suggest any of these, they are already in the database: ${existingNames.join(", ")}.`
    : "";

  const prompt = `You are a folklore expert. List 5 real, lesser-known folklore creatures, spirits, or mythical beings from ${region}, ${country}. 
${existing}
Focus on hyper-local creatures specific to that region, not globally famous ones.
Return ONLY a JSON array of name strings, nothing else. Example: ["Name1", "Name2", "Name3", "Name4", "Name5"]`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Groq discover error: ${JSON.stringify(data)}`);

  const parsed = safeParseJSON(content) as string[];
  return parsed.filter((n) => typeof n === "string");
}

// ── Step 2b: Generate a card flavor line in a dedicated call ────────────────
// Separated from structureCreature so the model can focus entirely on tone.
async function generateCardFlavor(name: string, creatureType: string, region: string): Promise<string> {
  const prompt = `Write a single atmospheric sentence (10-18 words) to appear on a folklore creature card for "${name}" — a ${creatureType} from ${region}.
Tone: poetic, ominous, or mythic. Never a biographical fact. Never start with "The ${name}".
Return ONLY the sentence, no quotes, no punctuation beyond the closing period.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 60,
    }),
  });

  const data = await response.json();
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  // Trim to the first sentence if the model returns more than one
  const firstSentence = raw.split(/[.!?]/)[0].trim();
  return firstSentence.length > 8 ? firstSentence + "." : "";
}

// ── Step 2: Search the web for real info about the creature ───────────────────
async function searchCreature(name: string, country: string): Promise<string> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: `${name} folklore creature mythology ${country}`,
      search_depth: "basic",
      max_results: 3,
    }),
  });

  const data = await response.json();
  const results = data.results ?? [];

  if (results.length === 0) return "No web results found.";

  return results
    .map((r: { title: string; content: string }) => `${r.title}: ${r.content}`)
    .join("\n\n")
    .slice(0, 3000);
}

// ── Step 3: Ask Groq to structure the web results into our schema ─────────────
async function structureCreature(
  name: string,
  country: string,
  region: string,
  webContext: string
): Promise<Record<string, unknown>> {
  const prompt = `You are a folklore research expert. Based on the following web research, create a structured entry for the folklore creature "${name}" from ${region}, ${country}.

WEB RESEARCH:
${webContext}

Return ONLY a valid JSON object. No newlines inside string values, use spaces instead. No markdown, no extra text.

{
  "name": "exact creature name",
  "alternate_names": ["other name one", "other name two"],
  "creature_type": "one of: spirit, demon, trickster, water_creature, shapeshifter, undead, other",
  "description": "2-3 vivid paragraphs describing the creature appearance and nature all in one line",
  "origin_story": "the origin or mythology behind this creature all in one line",
  "abilities": "what powers or abilities this creature has all in one line",
  "survival_tips": "local folklore advice on how to survive or ward off this creature all in one line",
  "locality": "most specific known locality such as a river mountain or village type"
}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Groq structure error: ${JSON.stringify(data)}`);

  return safeParseJSON(content) as Record<string, unknown>;
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const results = { added: 0, skipped: 0, errors: [] as string[] };

  const target = REGIONS[Math.floor(Math.random() * REGIONS.length)];

  console.log(`Agent exploring: ${target.region}, ${target.country}`);

  try {
    const { data: existing } = await supabase
      .from("creatures")
      .select("name")
      .eq("country", target.country);

    const existingNames = (existing ?? []).map((c: { name: string }) => c.name);

    const names = await discoverCreatureNames(
      target.country,
      target.region,
      existingNames
    );

    console.log(`Discovered ${names.length} creatures:`, names);

    for (const name of names) {
      try {
        const slug = generateSlug(name);

        const { data: dupe } = await supabase
          .from("creatures")
          .select("id")
          .or(`name.ilike.${name},slug.eq.${slug}`)
          .maybeSingle();

        if (dupe) {
          results.skipped++;
          continue;
        }

        const webContext = await searchCreature(name, target.country);
        await new Promise((r) => setTimeout(r, 300));

        const data = await structureCreature(
          name,
          target.country,
          target.region,
          webContext
        );
        await new Promise((r) => setTimeout(r, 300));

        // Dedicated flavor call — separate focus = much more reliable output
        const cardFlavor = await generateCardFlavor(
          (data.name as string) ?? name,
          (data.creature_type as string) ?? "spirit",
          target.region
        );
        await new Promise((r) => setTimeout(r, 300));

        const finalName = (data.name as string) ?? name;
        const { error, data: inserted } = await supabase.from("creatures").insert({
          name:            finalName,
          slug:            generateSlug(finalName),
          alternate_names: data.alternate_names ?? [],
          region:          target.region,
          country:         target.country,
          locality:        data.locality ?? target.region,
          latitude:        target.lat,
          longitude:       target.lng,
          creature_type:   data.creature_type ?? "other",
          description:     data.description,
          origin_story:    data.origin_story,
          abilities:       data.abilities,
          survival_tips:   data.survival_tips,
          card_flavor:     cardFlavor || null,
          image_url:       null,
          verified:        false,
          source:          "ai_collected",
          submitted_by:    null,
        }).select("id").single();

        if (error) throw new Error(error.message);
        results.added++;
        console.log(`Added: ${finalName} | flavor: ${cardFlavor || "(none)"}`);

        // ── Backfill card_definition if one already exists for this creature ──
        // (Handles the case where seed_card_definitions was run before this run)
        if (inserted?.id && cardFlavor) {
          await supabase
            .from("card_definitions")
            .update({ flavor_text: cardFlavor })
            .eq("creature_id", inserted.id);
        }

      } catch (err) {
        results.errors.push(`${name}: ${err.message}`);
      }
    }

  } catch (err) {
    results.errors.push(`Region error: ${err.message}`);
  }

  // ── Backfill: fix existing card_definitions that still have raw truncated text ──
  // Picks up to 20 definitions whose flavor_text looks like a mid-sentence cut
  // (ends without sentence-terminating punctuation) and regenerates them.
  try {
    const { data: staleDefs } = await supabase
      .from("card_definitions")
      .select("id, creature_id, flavor_text, creature:creatures(name, creature_type, region, card_flavor)")
      .is("creature.card_flavor", null)           // no flavor written yet
      .not("flavor_text", "is", null)
      .limit(20);

    for (const def of (staleDefs ?? []) as Array<{
      id: string;
      creature_id: string;
      flavor_text: string;
      creature: { name: string; creature_type: string; region: string; card_flavor: string | null } | null;
    }>) {
      const c = def.creature;
      if (!c) continue;
      // Only backfill if the current flavor looks like a raw truncation
      const looksLikeTruncated = !/[.!?]$/.test(def.flavor_text.trim());
      if (!looksLikeTruncated && def.flavor_text.trim() !== "A presence recorded in the archive. Handle with caution.") continue;

      try {
        const flavor = await generateCardFlavor(c.name, c.creature_type, c.region);
        await new Promise((r) => setTimeout(r, 300));
        if (!flavor) continue;

        // Save on creature row + card_definition in one shot
        await Promise.all([
          supabase.from("creatures").update({ card_flavor: flavor }).eq("id", def.creature_id),
          supabase.from("card_definitions").update({ flavor_text: flavor }).eq("id", def.id),
        ]);
        console.log(`Backfilled flavor for: ${c.name} → ${flavor}`);
      } catch (_) { /* non-fatal */ }
    }
  } catch (_) { /* non-fatal */ }

  return new Response(JSON.stringify({
    region: `${target.region}, ${target.country}`,
    ...results,
  }), {
    headers: { "Content-Type": "application/json" },
  });
});
