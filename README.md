## LocaLore

Crowdsourced, map-based global folklore creature database built with React, TypeScript, Vite, Tailwind CSS, Leaflet, Supabase, and React Router.

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and a storage bucket named `creature-images`.
3. In Supabase SQL editor, run the contents of `supabase/schema.sql` to create the `creatures` table and policies.
4. Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

Then open the printed local URL in your browser.

