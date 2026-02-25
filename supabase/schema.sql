create table public.creatures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  alternate_names text[] not null default '{}',
  region text not null,
  country text not null,
  locality text,
  latitude double precision,
  longitude double precision,
  creature_type text not null check (creature_type in (
    'spirit',
    'demon',
    'trickster',
    'water_creature',
    'shapeshifter',
    'undead',
    'other'
  )),
  description text not null,
  origin_story text,
  abilities text,
  survival_tips text,
  image_url text,
  verified boolean not null default false,
  source text not null default 'user_submitted' check (source in ('user_submitted', 'ai_collected')),
  submitted_by uuid references auth.users (id),
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.creatures enable row level security;

create policy "Anyone can read creatures"
  on public.creatures
  for select
  using (true);

create policy "Authenticated users can insert creatures"
  on public.creatures
  for insert
  with check (auth.role() = 'authenticated');

