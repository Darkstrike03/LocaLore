"""
LocaLore — Full System Diagnostic
===================================
Checks every critical table, column, RLS policy, RPC function,
XP flow, and Anima flow in your Supabase project.

Requirements
------------
    pip install requests python-dotenv

Credentials (create a .env file next to this script, or set env vars):
    VITE_SUPABASE_URL       = https://xxxx.supabase.co
    VITE_SUPABASE_ANON_KEY  = eyJh...  (from Supabase → Settings → API)
    SUPABASE_SERVICE_KEY    = eyJh...  (from Supabase → Settings → API → service_role)

Run
---
    python supabase/diagnose.py
"""

import os, sys, json, textwrap
from pathlib import Path

# ── Try to load .env from project root ──────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass  # dotenv is optional — fall back to env vars

try:
    import requests
except ImportError:
    sys.exit("❌  'requests' not found. Run:  pip install requests")

# ── Credentials ─────────────────────────────────────────────────────────────
URL         = os.getenv("VITE_SUPABASE_URL",      "").rstrip("/")
ANON_KEY    = os.getenv("VITE_SUPABASE_ANON_KEY", "")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY",   "")

if not URL or not ANON_KEY:
    sys.exit(
        "❌  Missing credentials.\n"
        "    Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file\n"
        "    (and optionally SUPABASE_SERVICE_KEY for deeper admin checks)."
    )

REST  = f"{URL}/rest/v1"
RPC   = f"{REST}/rpc"

ANON_HDR    = {"apikey": ANON_KEY,    "Authorization": f"Bearer {ANON_KEY}",    "Content-Type": "application/json"}
SERVICE_HDR = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Content-Type": "application/json"} if SERVICE_KEY else None

# ── Helpers ──────────────────────────────────────────────────────────────────
PASS = "✅ "
FAIL = "❌ "
WARN = "⚠️  "
INFO = "ℹ️  "

results: list[tuple[str, bool, str]] = []   # (label, passed, detail)

def ok(label: str, detail: str = ""):
    results.append((label, True, detail))
    print(f"  {PASS}{label}" + (f"  →  {detail}" if detail else ""))

def fail(label: str, detail: str = ""):
    results.append((label, False, detail))
    print(f"  {FAIL}{label}" + (f"  →  {detail}" if detail else ""))

def warn(label: str, detail: str = ""):
    print(f"  {WARN}{label}" + (f"  →  {detail}" if detail else ""))

def section(title: str):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")

def get(path: str, hdrs=None, params: dict | None = None):
    try:
        r = requests.get(f"{REST}/{path}", headers=hdrs or ANON_HDR, params=params, timeout=10)
        return r.status_code, r.json() if r.content else []
    except Exception as e:
        return 0, str(e)

def post_rpc(fn: str, body: dict, hdrs=None):
    try:
        r = requests.post(f"{RPC}/{fn}", headers=hdrs or ANON_HDR, json=body, timeout=10)
        return r.status_code, r.json() if r.content else None
    except Exception as e:
        return 0, str(e)

# ─────────────────────────────────────────────────────────────────────────────
section("1 · CONNECTIVITY")
# ─────────────────────────────────────────────────────────────────────────────
try:
    r = requests.get(f"{REST}/", headers=ANON_HDR, timeout=10)
    if r.status_code < 500:
        ok("Supabase project reachable", f"HTTP {r.status_code}")
    else:
        fail("Supabase project unreachable", f"HTTP {r.status_code}")
except Exception as e:
    fail("Cannot connect to Supabase", str(e))

if SERVICE_KEY:
    ok("Service role key provided (admin checks enabled)")
else:
    warn("No SUPABASE_SERVICE_KEY — some checks will be skipped")

# ─────────────────────────────────────────────────────────────────────────────
section("2 · CORE TABLES")
# ─────────────────────────────────────────────────────────────────────────────
REQUIRED_TABLES = [
    ("users",              "Core user profiles"),
    ("creatures",          "Creature archive"),
    ("submissions",        "User submissions"),
    ("creature_bookmarks", "Grimoire / bookmarks"),
    ("creature_reactions", "Emoji reactions"),
    ("creature_comments",  "Witness accounts"),
    ("xp_events",          "XP audit log"),
    ("sighting_reports",   "Sighting reports"),
    ("creature_images",    "Gallery images"),
    ("creature_relations", "Related creatures"),
]

for table, desc in REQUIRED_TABLES:
    status, data = get(table, params={"limit": "1"})
    if status == 200:
        ok(f"{table}  ({desc})")
    elif status == 401:
        fail(f"{table}  ({desc})", "401 Unauthorized — RLS blocking read or anon key wrong")
    elif status == 404:
        fail(f"{table}  ({desc})", "404 Table not found — migration not run")
    else:
        fail(f"{table}  ({desc})", f"HTTP {status}")

# ─────────────────────────────────────────────────────────────────────────────
section("3 · XP & ANIMA TABLES")
# ─────────────────────────────────────────────────────────────────────────────
CURRENCY_TABLES = [
    ("xp_events",    "XP event log"),
    ("anima_ledger", "Anima transaction log — needs cards_migration.sql"),
    ("card_packs",   "Card packs — needs cards_migration.sql"),
    ("user_cards",   "User card inventory — needs cards_migration.sql"),
    ("card_definitions", "Card definitions — needs cards_migration.sql"),
    ("market_listings",  "Marketplace"),
    ("auction_listings", "Auction house"),
    ("trade_offers",     "P2P trades"),
    ("anima_ledger",     "Anima ledger"),
]
seen = set()
for table, desc in CURRENCY_TABLES:
    if table in seen:
        continue
    seen.add(table)
    status, data = get(table, params={"limit": "1"})
    if status == 200:
        ok(f"{table}  ({desc})")
    elif status == 404:
        fail(f"{table}  ({desc})", "Table missing — run the migration noted above")
    else:
        fail(f"{table}  ({desc})", f"HTTP {status}")

# ─────────────────────────────────────────────────────────────────────────────
section("4 · USERS TABLE COLUMNS (via service key)")
# ─────────────────────────────────────────────────────────────────────────────
if not SERVICE_HDR:
    warn("Skipped — no service key (SUPABASE_SERVICE_KEY not set)")
else:
    status, data = get("users", hdrs=SERVICE_HDR, params={"limit": "1", "select": "id,xp,anima_balance,username"})
    if status == 200 and isinstance(data, list):
        ok("users.xp column exists")
        ok("users.anima_balance column exists")
    elif status == 400 and isinstance(data, dict):
        msg = data.get("message", "")
        if "xp" in msg:
            fail("users.xp column missing", "Run: ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0")
        elif "anima_balance" in msg:
            fail("users.anima_balance column missing", "Run fix_anima.sql")
        else:
            fail("Unexpected column error", msg)
    else:
        warn(f"Could not verify columns (HTTP {status})")

# ─────────────────────────────────────────────────────────────────────────────
section("5 · RPC FUNCTIONS")
# ─────────────────────────────────────────────────────────────────────────────
# We call each function with deliberately bad args — a 404 means the function
# doesn't exist; anything else (even a 400/422 error) means it exists.

def rpc_exists(fn: str, body: dict, hdrs=None) -> bool:
    status, data = post_rpc(fn, body, hdrs or ANON_HDR)
    # 404 → function does not exist
    # 400 / 422 / 200 → function exists (might have arg mismatch)
    return status != 404 and status != 0

RPC_CHECKS = [
    ("increment_user_xp", {"uid": "00000000-0000-0000-0000-000000000000", "amount": 0},
     "XP increment (SECURITY DEFINER) — run fix_xp_anima_policies.sql"),
    ("increment_anima",   {"uid": "00000000-0000-0000-0000-000000000000", "amount": 0},
     "Anima increment (SECURITY DEFINER) — run fix_anima.sql"),
]

for fn_name, body, fix_hint in RPC_CHECKS:
    if rpc_exists(fn_name, body):
        ok(f"RPC  {fn_name}()")
    else:
        fail(f"RPC  {fn_name}()  missing", fix_hint)

# ─────────────────────────────────────────────────────────────────────────────
section("6 · RLS POLICY SIMULATION (anon key = real user perspective)")
# ─────────────────────────────────────────────────────────────────────────────
# Test INSERT into xp_events as anon (should get 401, not 404/500)
# A 401 = table exists but not authed.  That's expected for anon.
# What matters is that the table exists and won't 404.

status, _ = get("xp_events", ANON_HDR, params={"limit": "1"})
if status == 200:
    ok("xp_events readable by anon (public select policy exists)")
elif status == 401:
    warn("xp_events not readable by anon", "Only authenticated users can see own XP events — this is correct")
elif status == 404:
    fail("xp_events table missing")
else:
    warn(f"xp_events returned HTTP {status}")

status, _ = get("anima_ledger", ANON_HDR, params={"limit": "1"})
if status in (200, 401):
    ok("anima_ledger table accessible (RLS active)")
elif status == 404:
    fail("anima_ledger table missing — run fix_anima.sql")
else:
    warn(f"anima_ledger returned HTTP {status}")

# ─────────────────────────────────────────────────────────────────────────────
section("7 · DATA HEALTH (service key, read-only)")
# ─────────────────────────────────────────────────────────────────────────────
if not SERVICE_HDR:
    warn("Skipped — no service key")
else:
    # How many users have non-zero XP?
    status, data = get("users", SERVICE_HDR,
                       params={"select": "id,username,xp,anima_balance", "xp": "gt.0", "limit": "5"})
    if status == 200 and isinstance(data, list):
        if data:
            ok(f"Users with XP > 0: {len(data)} found in top 5", str([f"{u.get('username','?')} xp={u.get('xp')}" for u in data]))
        else:
            fail("No users have XP > 0", "XP writes are still not reaching the DB — check UPDATE policy on users table")
    else:
        warn(f"Could not query user XP (HTTP {status})")

    # Any xp_events rows?
    status, data = get("xp_events", SERVICE_HDR, params={"select": "event_type,xp_amount,created_at", "order": "created_at.desc", "limit": "5"})
    if status == 200 and isinstance(data, list):
        if data:
            ok(f"xp_events has {len(data)}+ recent rows", str([(e.get('event_type'), e.get('xp_amount')) for e in data]))
        else:
            fail("xp_events is empty", "Events are not being written — check INSERT policy on xp_events")
    elif status == 404:
        fail("xp_events table missing")
    else:
        warn(f"xp_events query returned HTTP {status}")

    # Any anima_ledger rows?
    status, data = get("anima_ledger", SERVICE_HDR, params={"select": "reason,amount,created_at", "order": "created_at.desc", "limit": "5"})
    if status == 200 and isinstance(data, list):
        if data:
            ok(f"anima_ledger has {len(data)}+ recent rows", str([(e.get('reason'), e.get('amount')) for e in data]))
        else:
            fail("anima_ledger is empty", "Anima events not being saved — check INSERT policy on anima_ledger")
    elif status == 404:
        fail("anima_ledger table missing — run fix_anima.sql")
    else:
        warn(f"anima_ledger query returned HTTP {status}")

# ─────────────────────────────────────────────────────────────────────────────
section("8 · CARD ECONOMY HEALTH")
# ─────────────────────────────────────────────────────────────────────────────
status, data = get("card_packs", ANON_HDR, params={"select": "name,cost_anima,is_active", "is_active": "eq.true"})
if status == 200 and isinstance(data, list):
    if data:
        ok(f"Active card packs: {len(data)}", str([p.get('name') for p in data]))
    else:
        fail("No active card packs found", "Run the seed section of cards_migration.sql")
elif status == 404:
    fail("card_packs table missing — run cards_migration.sql")
else:
    warn(f"card_packs returned HTTP {status}")

status, data = get("card_definitions", ANON_HDR, params={"select": "id,rarity", "limit": "1"})
if status == 200 and isinstance(data, list):
    if data:
        # count total
        s2, d2 = get("card_definitions", ANON_HDR, params={"select": "rarity", "limit": "500"})
        total_defs = len(d2) if isinstance(d2, list) else "?"
        ok(f"card_definitions populated: {total_defs} cards defined")
    else:
        fail("card_definitions is EMPTY",
             "Packs will deduct anima but give no cards. Run supabase/seed_card_definitions.sql")
elif status == 404:
    fail("card_definitions table missing — run cards_migration.sql")
else:
    warn(f"card_definitions returned HTTP {status}")

# ─────────────────────────────────────────────────────────────────────────────
section("9 · SUMMARY")
# ─────────────────────────────────────────────────────────────────────────────
passed = sum(1 for _, p, _ in results if p)
failed = sum(1 for _, p, _ in results if not p)
total  = len(results)

print(f"\n  Checks passed : {passed}/{total}")
print(f"  Checks failed : {failed}/{total}")

if failed == 0:
    print("\n  🎉  All checks passed — system looks healthy!")
else:
    print(f"\n  ⚠️   {failed} issue(s) found. Failures:\n")
    for label, passed_, detail in results:
        if not passed_:
            print(f"    {FAIL}{label}")
            if detail:
                print(f"         {detail}")
    print()
    print("  QUICK FIX ORDER:")
    print("    1. run  supabase/fix_xp_anima_policies.sql   (RLS UPDATE policy + RPC functions)")
    print("    2. run  supabase/fix_anima.sql               (anima_balance column + anima_ledger + increment_anima)")
    print("    3. run  supabase/cards_migration.sql         (full card economy tables)")
    print("    4. run  supabase/tier2_upgrade.sql           (xp_events + sighting_reports + bookmarks)")
    print()
