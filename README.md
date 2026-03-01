# Backyard Ladder

A zero-friction ranking and matchmaking app for local community sports (Pickleball, Cornhole, etc.). A host starts a session, players join by scanning a QR code — no accounts required — and the app manages a live leaderboard with Elo-based matchmaking.

## How it works

1. **Host** creates a session and picks a sport. A QR code is displayed.
2. **Players** scan the QR, enter a nickname, and are added to the available pool instantly.
3. **Matchmaker** suggests balanced 2v2 matches based on Elo ratings.
4. **Scores** are entered after each game; Elo ratings update in real-time on the leaderboard.

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + Radix UI
- **Database:** Supabase (Postgres + real-time subscriptions)
- **QR generation:** `react-qr-code`

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example below into a `.env.local` file at the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both values are found in your Supabase project under **Settings → API**.

### 3. Set up the database

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sport text not null,
  created_at timestamptz default now()
);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  name text not null,
  elo integer default 1000,
  status text default 'available' check (status in ('available', 'playing', 'resting')),
  is_active boolean default true
);

-- Matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  player_a1 uuid references players(id),
  player_a2 uuid references players(id),
  player_b1 uuid references players(id),
  player_b2 uuid references players(id),
  score_a integer,
  score_b integer,
  elo_change float,
  created_at timestamptz default now()
);
```

Enable real-time on the `players` table in **Supabase → Database → Replication** so the leaderboard updates live.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check without emitting |

## Routes

| Path | Description |
|---|---|
| `/` | Home — create a new session |
| `/session/[slug]` | Public leaderboard for a session |
| `/session/[slug]/host` | Host dashboard (QR code, match controls, player list) |
| `/session/[slug]/join` | Player join page (linked from QR code) |
| `/session/[slug]/player/[id]` | Individual player status toggle |
