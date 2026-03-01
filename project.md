# Project: Backyard Ladder

## 1. Overview
**Backyard Ladder** is a zero-friction ranking and matchmaking app for local community sports (Pickleball, Cornhole, etc.). It is designed for "Session-based" play where a host starts a game day, players join via QR code without creating accounts, and the app manages a live leaderboard and suggests balanced matches.

## 2. Core User Experience
* **The Host:** Creates a session, chooses the sport, and displays a dynamic QR code.
* **The Player:** Scans the QR, enters a nickname, and is instantly added to the "Available" pool.
* **The Matchmaker:** Suggests 4 players for a 2v2 game that results in the closest win probability.
* **The Record:** Scores are entered; Elo ratings update in real-time.

## 3. Technical Stack
* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS + Shadcn/UI
* **Database/Backend:** Supabase (Postgres + Real-time subscriptions)
* **QR Generation:** `react-qr-code`
* **Icons:** `lucide-react`

## 4. Database Schema (Postgres)

### `sessions`
- `id` (uuid, PK)
- `slug` (text, unique)
- `sport` (text)
- `created_at` (timestamp)

### `players`
- `id` (uuid, PK)
- `session_id` (uuid, FK)
- `name` (text)
- `elo` (integer, default 1000)
- `status` (text: 'available', 'playing', 'resting')
- `is_active` (boolean, default true)

### `matches`
- `id` (uuid, PK)
- `session_id` (uuid, FK)
- `player_a1`, `player_a2`, `player_b1`, `player_b2` (uuids, FK)
- `score_a`, `score_b` (integer)
- `elo_change` (float)

## 5. The Ranking Engine (`lib/elo.ts`)

### **A. Team Rating Calculation**
$R_{Team} = \frac{R_{Player1} + R_{Player2}}{2}$

### **B. Expected Outcome ($E_A$)**
$$E_A = \frac{1}{1 + 10^{(R_B - R_A)/400}}$$

### **C. Margin of Victory (MOV) Multiplier ($M$)**
$$M = \ln(|Score_A - Score_B| + 1) \cdot \frac{2.2}{(R_{winner} - R_{loser}) \cdot 0.001 + 2.2}$$

### **D. Final Rating Update**
$$R_{new} = R_{old} + K \cdot M \cdot (S - E)$$
*(Where $K=32$ and $S=1$ for win, $0$ for loss)*

## 6. Development Milestones (Ralph Loop Checklist)

- [ ] **Phase 1:** Setup Next.js + Supabase. Build the "Create Session" landing page.
- [ ] **Phase 2:** Dynamic QR code generation on the Session page using `window.location`.
- [ ] **Phase 3:** Guest "Join" flow with `localStorage` persistence for nicknames.
- [ ] **Phase 4:** Matchmaker algorithm (finding the 4 available players with the smallest Elo gap).
- [ ] **Phase 5:** Score entry form and atomic Elo updates in Supabase.
- [ ] **Phase 6:** Real-time Leaderboard component using Supabase `subscribe()`.

## 7. Other FAQ
Q. Should the slug be human-readable (e.g., `fuzzy-panda`) or short random (e.g., `x7k2mq`)? Human-readable is easier to type if QR scanning fails.

A. Human Readable

Q. Should the host be able to manually override/adjust a player's Elo (e.g., for experienced players joining mid-session)?

A. Yes

Q. Should there be a "End Session" action that archives results, or does the session just exist indefinitely?

A. Indefinitely

Q. What K-factor should be used? (32 is standard; could be tunable per session.)

A. 32 sounds reasonable

Q. Should the leaderboard be publicly accessible (no slug required) or only visible to session participants?

A. Publicly accessible
