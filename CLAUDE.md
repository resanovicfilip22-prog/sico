# KL Šibenik — Košarkaška Liga Statistika

Besplatna web aplikacija za praćenje statistike amaterske košarkaške lige.
Stack: **Next.js 15 App Router + Supabase (PostgreSQL + Auth) + shadcn/ui v4 (base-ui) + Vercel**

---

## Arhitektura sustava

```
sico/
├── app/
│   ├── layout.tsx                        # Root layout (font, globals)
│   ├── (public)/                         # Javni dio — bez auth
│   │   ├── layout.tsx                    # Navbar + container
│   │   ├── page.tsx                      # Početna: ljestvica, top strijelci, rezultati
│   │   ├── standings/page.tsx            # Cijela ljestvica
│   │   ├── matches/page.tsx              # Sve utakmice
│   │   ├── matches/[matchId]/page.tsx    # Box score utakmice
│   │   ├── players/page.tsx              # Svi igrači + statistika
│   │   ├── players/[playerId]/page.tsx   # Profil igrača
│   │   ├── teams/[teamId]/page.tsx       # Profil ekipe
│   │   ├── seasons/page.tsx             # Arhiva sezona
│   │   └── seasons/[seasonId]/page.tsx  # Pregled sezone
│   │   └── playoff/page.tsx             # Playoff bracket
│   └── admin/
│       ├── login/page.tsx               # Login stranica (IZVAN protected!)
│       └── (protected)/
│           ├── layout.tsx               # Auth guard + AdminNav
│           ├── page.tsx                 # Admin dashboard
│           ├── seasons/page.tsx         # Upravljanje sezonama
│           ├── seasons/[seasonId]/page.tsx  # Uredi sezonu + roster
│           ├── teams/page.tsx           # Upravljanje ekipama
│           ├── teams/[teamId]/page.tsx  # Detalji ekipe
│           ├── players/page.tsx         # Upravljanje igračima
│           ├── rounds/page.tsx          # Upravljanje kolima
│           ├── matches/page.tsx         # Upravljanje utakmicama
│           ├── matches/[matchId]/live/page.tsx   # Live unos rezultata (Realtime)
│           ├── matches/[matchId]/stats/page.tsx  # Unos statistike
│           └── playoff/page.tsx         # Playoff upravljanje + vizualni bracket
├── components/
│   ├── public/
│   │   ├── Navbar.tsx                   # Navigacija javnog dijela
│   │   ├── SeasonSwitcher.tsx           # Dropdown za promjenu sezone (URL ?s=)
│   │   ├── StandingsTable.tsx           # Ljestvica (compact + full)
│   │   └── PlayerStatsTable.tsx         # Tablica statistike igrača (sortiranje, kolone)
│   └── admin/
│       ├── AdminNav.tsx                 # Sidebar navigacija admina
│       ├── AddSeasonDialog.tsx          # Dialog: kreiraj sezonu + kopiraj roster
│       ├── EditSeasonForm.tsx           # Forma za uređivanje sezone
│       ├── ManageSeasonTeams.tsx        # Dodaj/ukloni ekipe iz sezone
│       ├── CopyRosterFromSeason.tsx     # Kopiraj roster iz druge sezone
│       ├── AdminTeamRoster.tsx          # Pregled i upravljanje rosterom ekipe
│       ├── TeamsManager.tsx             # CRUD ekipa
│       ├── PlayersManager.tsx           # CRUD igrača + dodjela ekipi/sezoni
│       ├── RoundsManager.tsx            # CRUD kola
│       ├── MatchesManager.tsx           # CRUD utakmica (+ Live button)
│       ├── StatsEntryForm.tsx           # Unos statistike po igraču
│       ├── LiveScoreBoard.tsx           # Real-time score board (Supabase Realtime)
│       ├── PlayoffBracket.tsx           # Vizualni bracket (SVG connectori, apsolutno pozicioniranje)
│       └── PlayoffManager.tsx           # Generiranje i upravljanje bracketom
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # Browser Supabase klijent
│   │   ├── server.ts                    # Server Supabase klijent (cookies)
│   │   ├── types.ts                     # TypeScript tipovi (Season, Team, Player...)
│   │   ├── queries.ts                   # computeStandings, computePlayerAverages, getMatchWithStats...
│   │   └── season.ts                    # resolveSeasonAndAll() helper
│   └── utils.ts                         # cn() helper
├── supabase/
│   └── migrations/001_initial.sql       # Kompletna shema baze
└── proxy.ts                             # Auth guard middleware (ne middleware.ts!)
```

### Baza podataka (Supabase)

Tablice:
- `seasons` — sezona (name, year_start, year_end, is_active, playoff_teams_count)
- `teams` — ekipa (name, short_name, city, logo_url)
- `season_teams` — ekipa u sezoni (many-to-many)
- `players` — igrač (first_name, last_name, birth_year, position, photo_url)
- `player_team_seasons` — igrač u ekipi u sezoni (+ jersey_number)
- `rounds` — kolo (season_id, name, round_number, is_playoff)
- `playoff_series` — serija u playoffu (season_id, round_number, position, team1_id, team2_id, team1_wins, team2_wins, winner_id)
- `matches` — utakmica (round_id, home_team_id, away_team_id, home_score, away_score, status, playoff_series_id)
- `player_match_stats` — statistika igrača po utakmici (sve kolone)

View:
- `player_match_stats_computed` — izračunate vrijednosti: pts=2*2pm+3*3pm+ftm, val=pts+ast+reb, postoci

RLS: javni SELECT na svemu, authenticated ALL.

### Ključne napomene (ČITAJ PRIJE PISANJA KODA)

1. **shadcn/ui v4 koristi base-ui, NE radix-ui** — API je drugačiji:
   - `<DialogTrigger render={<Button>...</Button>} />` umjesto `asChild`
   - `<Button asChild>` ne postoji → koristi `<Link className={cn(buttonVariants({...}))}>`
   - `onValueChange` na Select vraća `string | null` → uvijek provjeri: `onValueChange={v => v && fn(v)}`
   - `SelectItem` djeca moraju biti **plain text** (ne JSX komponente poput Badge) — inače trigger prikazuje UUID

2. **Auth middleware** je u `proxy.ts` (ne `middleware.ts`) — Next.js 16 konvencija

3. **Sezona** se određuje URL parametrom `?s=<seasonId>` na javnim stranicama. Helper `resolveSeasonAndAll()` rješava logiku (aktivna sezona ako nema parametra).

4. **Playoff** — admin bira top N ekipa, generira se bracket, pobjednik automatski prolazi dalje (`Math.floor(position / 2)`), Best of 3 serije.

---

## Što je implementirano ✅

### Javni dio
- [x] Početna stranica: ljestvica, top 5 strijelaca, zadnjih 5 rezultata, sljedećih 5 utakmica
- [x] Cijela ljestvica s playoff crtom
- [x] Lista utakmica po sezoni (s filtrom)
- [x] Box score utakmice (statistika po igraču, brojevi dresova)
- [x] Lista igrača s prosjecima, sortiranje po kolonama, odabir kolona
- [x] Profil igrača (karijerna statistika, ekipe)
- [x] Profil ekipe (roster, utakmice)
- [x] Playoff bracket (vizualni prikaz)
- [x] Sezonski arhiv + detalji sezone
- [x] Switcher sezone (URL-based, dropdown)

### Admin panel
- [x] Login (Supabase email/password auth)
- [x] Dashboard s linkovima
- [x] Upravljanje sezonama (kreiranje, uređivanje, postavljanje aktivne)
- [x] Kopiranje rostera iz prethodne sezone
- [x] Upravljanje ekipama (CRUD + brisanje s potvrdom)
- [x] Upravljanje igračima (CRUD + brisanje, dodjela ekipi/sezoni, broj dresa)
- [x] Upravljanje kolima (CRUD, redoslijed)
- [x] Upravljanje utakmicama (CRUD, brisanje, sprječavanje iste ekipe u istom kolu)
- [x] Unos statistike po utakmici (sve kolone, live izračun bodova i VAL)
- [x] Upozorenje kad statistike ne odgovaraju rezultatu (vidljivo adminu, skriveno javnosti)
- [x] **Live score unos** — `/admin/matches/[id]/live`, Supabase Realtime, +1/+2/+3/−1 tipke, "Završi"
- [x] **Playoff bracket vizualizacija** — SVG connectori, apsolutno pozicioniranje, green highlight pobjednika
- [x] Playoff generiranje (automatski iz ljestvice, upravljanje pobjednicima)
- [x] Roster po ekipi po sezoni (AdminTeamRoster)

---

## Što treba implementirati / poboljšati ❌

### Visoki prioritet
- [ ] **Validacija forme za unos statistike** — minimumi (minuti > 0), provjera konzistentnosti (pokušaji ≥ pogoci)
- [ ] **Live score na javnoj stranici** — `/matches/[id]` prikazuje score u realnom vremenu dok je utakmica u tijeku

### Srednji prioritet
- [ ] **Foto upload za igrače** — Supabase Storage bucket (besplatan 1GB)
- [ ] **Logo upload za ekipe** — isto, Storage bucket
- [ ] **Export statistike** — CSV export ljestvice ili statistike igrača
- [ ] **Sezonske nagrade** — MVP, top scorer badge na profilima
- [ ] **Raspored (Schedule)** — pregled po kolima, ne samo lista

### Niski prioritet / Moguća poboljšanja
- [ ] **PWA / mobilna optimizacija** — offline access, install prompt
- [ ] **Email notifikacije** — Supabase Edge Functions za slanje rezultata
- [ ] **Komentari/vijesti** — blog modul za novosti lige
- [ ] **Višejezičnost** — i18n, trenutno samo hrvatski

---

## Upute za setup (jednom, ručno)

### 1. Supabase projekt

1. Idi na [supabase.com](https://supabase.com) i kreiraj novi projekt (besplatan tier)
2. U SQL editoru pokreni: `supabase/migrations/001_initial.sql`
3. Kopiraj iz Settings → API:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Admin korisnik

U Supabase → Authentication → Users → "Add user" → upiši email i lozinku.
To je jedini admin. Nema registracije.

### 3. Environment varijable

Kreiraj `.env.local` u korijenu projekta:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Lokalni razvoj

```bash
npm install
npm run dev
```

Otvori `http://localhost:3000` (javni dio) i `http://localhost:3000/admin` (admin).

### 5. Deploy na Vercel

1. Gurni kod na GitHub
2. Na [vercel.com](https://vercel.com) → "New Project" → uvezi GitHub repo
3. U Environment Variables dodaj `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy → gotovo, besplatno zauvijek (Hobby tier)

---

## Tijek rada (tipičan scenarij)

1. Admin kreira sezonu (Seasons → Nova sezona)
2. Admin dodaje ekipe (Teams), zatim ih dodaje u sezonu (Seasons → Uredi)
3. Admin dodaje igrače (Players), dodjeljuje ih ekipama za tu sezonu s brojem dresa
4. Admin kreira kola (Rounds), zatim utakmice po kolima (Matches)
5. Tijekom utakmice: Matches → "● Live" → live score unos u realnom vremenu → "Završi utakmicu"
6. Nakon utakmice: Matches → "Statistika" → unesi statistiku po igraču
7. Ljestvica se automatski izračunava iz unijenih utakmica
8. Na kraju regularnog dijela: Playoff → generiraj bracket → unosi pobjednike serija
9. Playoff bracket vizualizacija dostupna i adminu (SVG) i javnosti

---

## Statistički stupci

| Kratica | Puni naziv          |
|---------|---------------------|
| MIN     | Minute              |
| 2PM/2PA | 2-poeni (pogoci/pokušaji) |
| 3PM/3PA | 3-poeni (pogoci/pokušaji) |
| FTM/FTA | Slobodna bacanja (pogoci/pokušaji) |
| PTS     | Bodovi (izračunato) |
| OREB    | Napadački skokovi   |
| DREB    | Obrambeni skokovi   |
| REB     | Ukupni skokovi      |
| AST     | Asistencije         |
| TOV     | Izgubljene lopte    |
| STL     | Ukradene lopte      |
| BLK     | Blokade             |
| PF      | Osobne pogreške     |
| +/-     | Plus/minus          |
| VAL     | Valorizacija (PTS+AST+REB) |
