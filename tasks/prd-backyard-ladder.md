# PRD: Backyard Ladder — Full MVP

## Introduction

**Backyard Ladder** is a zero-friction session-based ranking and matchmaking app for local community sports (Pickleball and Cornhole). A host starts a game day, players join via QR code without creating accounts, and the app manages a live leaderboard, player availability, and suggests balanced 2v2 matches using an Elo rating engine.

The host session is managed via a secret URL (no authentication required). Everything updates in real-time via Supabase subscriptions. Session slugs are human-readable (e.g., `fuzzy-panda`) for easy manual entry if QR scanning fails.

---

## Goals

- Allow a host to create and manage a full game day session in under 60 seconds
- Let players join instantly by scanning a QR code — no account, no app install
- Suggest the most balanced 2v2 match from available players using Elo ratings
- Record scores and update Elo ratings in real-time after each match
- Display a live leaderboard accessible to anyone with the session slug
- Support Pickleball and Cornhole as selectable sports
- Allow the host to end the session, producing a read-only archived summary

---

## User Stories

### US-001: Create a session
**Description:** As a host, I want to create a new game session so that players can join and we can start playing.

**Acceptance Criteria:**
- [ ] Host visits the home page and sees a "Create Session" button
- [ ] Host selects a sport: "Pickleball" or "Cornhole"
- [ ] On submit, a session is created in Supabase with a unique human-readable slug (e.g., `fuzzy-panda`)
- [ ] Host is redirected to the host dashboard at `/session/[slug]/host`
- [ ] The host URL is the secret management link — no login or PIN required
- [ ] Slug generation retries on collision to guarantee uniqueness
- [ ] Typecheck/lint passes

### US-002: Display QR code for player join
**Description:** As a host, I want to display a QR code so players can join the session from their phones.

**Acceptance Criteria:**
- [ ] Host dashboard displays a large QR code linking to `/session/[slug]/join`
- [ ] QR code is generated using `react-qr-code`
- [ ] The session slug and sport name are visible alongside the QR as a manual fallback
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Player joins via QR scan
**Description:** As a player, I want to scan the QR code and enter my nickname so I can join the session.

**Acceptance Criteria:**
- [ ] Scanning QR lands player on `/session/[slug]/join`
- [ ] Page shows a single text input for nickname and a "Join" button
- [ ] On submit, a player row is inserted into `players` with status `available`, elo `1000`
- [ ] Player is redirected to the player view at `/session/[slug]/player/[id]`
- [ ] Duplicate nicknames within the same session are rejected with an inline error
- [ ] Joining a session with status `ended` shows a friendly message and disallows joining
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Player toggles availability
**Description:** As a player, I want to toggle my availability so the matchmaker knows if I want to play next.

**Acceptance Criteria:**
- [ ] Player view shows a toggle button: "Available" / "Resting"
- [ ] Clicking updates the player's `status` in Supabase immediately
- [ ] Button shows clear visual distinction: green = available, gray = resting
- [ ] Status updates appear on the host dashboard in real-time
- [ ] Button is disabled when player status is `playing` (cannot self-toggle mid-match)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Live player list on host dashboard
**Description:** As a host, I want to see all players and their current status so I can manage the session.

**Acceptance Criteria:**
- [ ] Host dashboard lists all active players with name, Elo, and current status
- [ ] List updates in real-time via Supabase subscription (no manual refresh needed)
- [ ] Host can mark a player inactive — removes them from leaderboard and match pool
- [ ] Host can edit any player's Elo inline (integer input, saves on blur or Enter)
- [ ] Players are visually grouped or labeled by status: available, playing, resting
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Suggest a balanced match
**Description:** As a host, I want the app to suggest the most balanced 2v2 match so games are fair and competitive.

**Acceptance Criteria:**
- [ ] Host dashboard has a "Suggest Match" button
- [ ] Button is disabled if fewer than 4 players have `available` status
- [ ] Algorithm evaluates all valid 4-player combinations and team splits to minimize win probability delta
- [ ] Win probability uses team average Elo and standard Elo expected outcome formula
- [ ] Suggested match displays: Team A (P1 & P2) vs Team B (P1 & P2) with each team's win probability
- [ ] Host can accept (creates match record, sets 4 players to `playing`) or re-shuffle
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Enter match score
**Description:** As a host, I want to enter the final score of a match so Elo ratings update and the leaderboard reflects results.

**Acceptance Criteria:**
- [ ] Active matches listed on host dashboard with score input fields for Team A and Team B
- [ ] Host enters integer scores and clicks "Submit Score"
- [ ] Score saved to `matches` table
- [ ] Elo ratings for all 4 players recalculated using MOV-adjusted Elo (K=32, see `lib/elo.ts`)
- [ ] `elo_change` stored on the match record
- [ ] All 4 players' `elo` values updated in `players` table
- [ ] All 4 players' statuses revert to `available` after score submission
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: Live leaderboard (public, slug-gated)
**Description:** As a player or spectator, I want to view a live leaderboard so I can see rankings at any time.

**Acceptance Criteria:**
- [ ] Leaderboard accessible at `/session/[slug]` — anyone with the slug can view, no join required
- [ ] Shows rank, nickname, Elo, and current status for each active player, sorted by Elo descending
- [ ] Updates in real-time via Supabase subscription when Elo or status changes
- [ ] Inactive players excluded
- [ ] Player view and host dashboard both embed or link to this leaderboard
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: End session and archive summary
**Description:** As a host, I want to end the session and produce a read-only summary so final standings are preserved.

**Acceptance Criteria:**
- [ ] Host dashboard has an "End Session" button with a confirmation dialog
- [ ] On confirm, session `status` set to `ended` in Supabase
- [ ] Host is warned and prompted to finalize if any matches are still active
- [ ] After ending, `/session/[slug]` shows a read-only archived leaderboard with final Elo standings
- [ ] No new players can join an ended session
- [ ] Host dashboard shows a banner indicating the session has ended
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-010: Implement Elo engine (`lib/elo.ts`)
**Description:** As a developer, I need a pure utility module that calculates Elo changes so the ranking logic is testable and reusable.

**Acceptance Criteria:**
- [ ] `lib/elo.ts` exports `calculateEloChange(matchInput): EloResult`
- [ ] Team rating = average of the two player Elos
- [ ] Expected outcome: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- [ ] MOV multiplier: `M = ln(|score_A - score_B| + 1) * 2.2 / ((R_winner - R_loser) * 0.001 + 2.2)`
- [ ] New Elo = Old Elo + 32 * (S - E) * M, where S=1 for win, S=0 for loss
- [ ] All 4 players receive same magnitude of change (winners gain, losers lose)
- [ ] Function is pure — no side effects, no database calls
- [ ] Typecheck/lint passes

### US-011: Database schema and migrations
**Description:** As a developer, I need the Supabase schema set up so all features have a working data layer.

**Acceptance Criteria:**
- [ ] `sessions` table: `id` (uuid PK), `slug` (text, unique), `sport` (text), `status` (text: 'active'|'ended', default 'active'), `created_at` (timestamp)
- [ ] `players` table: `id` (uuid PK), `session_id` (uuid FK), `name` (text), `elo` (int default 1000), `status` (text: 'available'|'playing'|'resting'), `is_active` (bool default true)
- [ ] `matches` table: `id` (uuid PK), `session_id` (uuid FK), `player_a1/a2/b1/b2` (uuid FKs), `score_a`, `score_b` (int), `elo_change` (float)
- [ ] Unique constraint on `(session_id, name)` in `players`
- [ ] RLS policies allow public read/write scoped to a session (no auth required)
- [ ] Supabase Realtime enabled on `players` and `matches` tables
- [ ] Typecheck/lint passes

### US-012: Slug generation utility
**Description:** As a developer, I need a utility that generates unique human-readable slugs so session URLs are memorable and typeable.

**Acceptance Criteria:**
- [ ] Utility generates slugs in `adjective-noun` format (e.g., `fuzzy-panda`, `swift-eagle`)
- [ ] Checks Supabase for collisions and retries up to 5 times before throwing
- [ ] Generated slugs are lowercase, URL-safe, contain no spaces
- [ ] Typecheck/lint passes

---

## Functional Requirements

- **FR-1:** Host creates a session by selecting Pickleball or Cornhole; app generates a unique human-readable slug.
- **FR-2:** Host dashboard at `/session/[slug]/host` is the sole management interface (secret URL, no login).
- **FR-3:** Players join at `/session/[slug]/join` by entering a nickname — no account creation.
- **FR-4:** Player nicknames must be unique within a session; duplicates rejected with an error message.
- **FR-5:** Players have three statuses: `available`, `playing`, `resting`. Default on join: `available`.
- **FR-6:** Host can edit any player's Elo rating at any time during an active session.
- **FR-7:** Match suggestion selects the 4-player/team split from `available` players that minimizes win probability delta.
- **FR-8:** Elo engine uses K=32, team average ratings, standard expected outcome formula, and MOV multiplier.
- **FR-9:** All session-facing views subscribe to Supabase Realtime — no polling.
- **FR-10:** Sessions have a `status` field: `active` or `ended`. Ended sessions are read-only.
- **FR-11:** The public leaderboard at `/session/[slug]` is accessible to anyone with the slug — no join required to view.
- **FR-12:** Inactive players (`is_active = false`) are excluded from leaderboard and match suggestions.
- **FR-13:** All player-facing views must be mobile-responsive.

---

## Non-Goals (Out of Scope)

- No user accounts or persistent identity across sessions
- No automated session expiry or cleanup
- No push notifications or SMS
- No 1v1 or other team configurations (2v2 only)
- No multi-host or admin panel
- No sport-specific score validation (e.g., win-by-2 rules)
- No in-app chat
- No automated match scheduling (host manually triggers suggestions)
- No tunable K-factor per session (K=32 is fixed)

---

## Design Considerations

- **Mobile-first:** Join page and player view are used on phones — large tap targets, minimal inputs.
- **Host dashboard:** Designed for a tablet or laptop at the court.
- **Optimistic UI:** Where possible, apply updates locally before Supabase response returns.
- **Shadcn/UI components:** `Button`, `Card`, `Badge` (player status), `Input`, `Select` (sport), `Table` (leaderboard), `Dialog` (End Session confirmation).
- **Status badge colors:** Available = green, Playing = blue, Resting = gray, Inactive = hidden.

---

## Technical Considerations

- **Next.js App Router:** Server Components for initial load; Client Components (`"use client"`) for Realtime subscriptions and interactivity.
- **Supabase Realtime:** Subscribe to `players` and `matches` channels in client components; unsubscribe on unmount.
- **Slug generation:** `adjective-noun` wordlists embedded in the app; collision-resistant via retry loop.
- **Match suggestion algorithm:** With up to 12 players, brute-force all C(n,4) x 3 team splits is fine (max ~1485 combinations for n=12).
- **Environment variables required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **`sessions` table needs a `status` column** not in original schema — added in US-011.

---

## Success Metrics

- A host can create a session, display QR, and have 8 players joined within 3 minutes
- Match suggestion produces teams within 5% win probability of 50/50 for similar-skill players
- Score submission and Elo updates visible on leaderboard within 2 seconds
- Players can join and interact entirely from a mobile browser — no install, no login
- Ended sessions produce a stable, shareable archived summary URL

---

## Resolved Decisions

| Question | Decision |
|---|---|
| Slug style | Human-readable `adjective-noun` (e.g., `fuzzy-panda`) |
| Manual Elo edit | Host can edit any player's Elo at any time during the session |
| Session lifecycle | Host can "End Session" -> read-only archived summary at same URL |
| K-factor | Fixed at 32 (standard) |
| Leaderboard access | Public — anyone with the slug can view, no join required |
