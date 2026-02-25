import fs from 'node:fs'
import path from 'node:path'
import 'dotenv/config'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set')
  process.exit(1)
}

async function fetchRows(table, select) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1000`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status}`)
  return res.json()
}

async function main() {
  const base = process.env.PUBLIC_URL ?? process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://localore.vercel.app'

  // get creature slugs
  const creatures = await fetchRows('creatures', 'slug')
  const creatureUrls = (creatures || []).filter(c => c.slug).map(c => `${base}/creatures/${c.slug}`)

  // get user profile usernames
  const users = await fetchRows('users', 'username')
  const profileUrls = (users || []).filter(u => u.username).map(u => `${base}/profile/${u.username}`)

  const all = [...creatureUrls, ...profileUrls]

  const items = all.map(url => `  <url>\n    <loc>${url}</loc>\n  </url>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`

  const outDir = path.resolve('public')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8')
  console.log('Wrote public/sitemap.xml with', all.length, 'entries')
}

main().catch(err => { console.error(err); process.exit(1) })
