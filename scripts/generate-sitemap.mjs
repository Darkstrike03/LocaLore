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

const TODAY = new Date().toISOString().split('T')[0]

const STATIC_PAGES = [
  { path: '/',           changefreq: 'weekly',  priority: '1.0' },
  { path: '/library',   changefreq: 'daily',   priority: '0.9' },
  { path: '/leaderboard', changefreq: 'daily', priority: '0.7' },
  { path: '/hub',        changefreq: 'daily',   priority: '0.7' },
  { path: '/market',     changefreq: 'hourly',  priority: '0.7' },
  { path: '/auction',    changefreq: 'hourly',  priority: '0.7' },
  { path: '/about',      changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy',    changefreq: 'monthly', priority: '0.3' },
  { path: '/terms',      changefreq: 'monthly', priority: '0.3' },
  { path: '/contact',    changefreq: 'monthly', priority: '0.4' },
]

function makeUrl({ loc, changefreq, priority, lastmod = TODAY }) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')
}

async function main() {
  const base = process.env.PUBLIC_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://localore.vercel.app')

  // Static pages
  const staticItems = STATIC_PAGES.map(p =>
    makeUrl({ loc: `${base}${p.path}`, changefreq: p.changefreq, priority: p.priority })
  )

  // Dynamic: creature slugs
  const creatures = await fetchRows('creatures', 'slug')
  const creatureItems = (creatures || []).filter(c => c.slug).map(c =>
    makeUrl({ loc: `${base}/creatures/${c.slug}`, changefreq: 'monthly', priority: '0.8' })
  )

  // Dynamic: public user profiles
  const users = await fetchRows('users', 'username')
  const profileItems = (users || []).filter(u => u.username).map(u =>
    makeUrl({ loc: `${base}/profile/${u.username}`, changefreq: 'weekly', priority: '0.6' })
  )

  const allItems = [...staticItems, ...creatureItems, ...profileItems]
  const total = STATIC_PAGES.length + creatureItems.length + profileItems.length

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    allItems.join('\n'),
    '</urlset>',
  ].join('\n')

  const outDir = path.resolve('public')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8')
  console.log(`Wrote public/sitemap.xml with ${total} entries (${STATIC_PAGES.length} static, ${creatureItems.length} creatures, ${profileItems.length} profiles)`)
}

main().catch(err => { console.error(err); process.exit(1) })
