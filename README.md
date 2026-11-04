# LIFT - Training log

A modern training log built with Vue 3 (Composition API) and TypeScript. LIFT makes it easy to log workouts, track progress and view meaningful statistics – with focus on consistency, strength development and a clean UI/UX.

## Innhold

- Hva appen tilbyr
- Arkitektur og teknisk oversikt
- Data og modellering (Supabase)
- Viktige skjermer og funksjoner
- Statistikk og innsikt
- Kom i gang (lokalt og Supabase)
- Kodeprinsipper og struktur
- Bidrag og kreditering

## Hva appen tilbyr

- Økter: Start/fortsett aktive økter, legg inn sett med reps og vekt. «Sist»-hint i aktive økter gjør det lett å matche/forbedre tidligere prestasjon.
- Øvelser: Kategorisert liste (Bryst, Rygg, Ben, Armer, Skuldre) med tydelige handlinger (rediger/slett) og 1RM‑oversikt per øvelse.
- Øvelsesdetaljer: PR‑tavle (1, 3, 4, 6, 8, 10, 12, 14 reps), estimert 1RM‑graf (Epley), intensitet per uke (kg per rep), volumtopp og 4‑ukers trend, siste prestasjoner.
- Historikk: Fullførte økter med filtrering og detaljer.
- Statistikk: Totaler (sets/reps), vaner (kalender/streaks), fordeling/balanse, prestasjoner og volumprogresjon.
- Profil: Grunninfo/telefon oppdateres separat fra passord. Abonnementseksjon (visuell) med «Oppgrader til Plus» CTA.

## Arkitektur og teknisk oversikt

- Språk/rammeverk: Vue 3 + Composition API (TypeScript)
- Bygg/verktøy: Vite, TailwindCSS
- Navigasjon: Vue Router
- Data: Supabase (Auth + Postgres) med RLS
- Mønstre: composables for dataflyt og integrasjoner (`src/composables/`)
- Styling: Utility‑first med Tailwind og gjenbrukbare klasser (f.eks. `btn-primary`, `card`)

### Viktige composables

- `useHybridData`: samler og eksponerer applikasjonsdata (øvelser, økter, maler, statistikksummer) og domeneoperasjoner (les/skriv).
- `useSupabase`: initialisering av Supabase‑klient.
- `useSupabaseData` (hvis tilstede): spesifikke spørringer/transformasjoner mot Supabase.

### Navigasjon og layout

- Mobil: fast bunnnavigasjon med aktive tilstander (inkluderer detaljsider via `startsWith('/session/')` og `startsWith('/exercise/')`). «Profil» viser brukerinitialer.
- Desktop: sticky header med horisontal navigasjon og profil.

## Data og modellering (Supabase)

Tabeller og RLS settes opp via `supabase-setup/`:

- `workout_templates`: brukerens øktmaler. Felt `exercises` lagres som JSONB.
- `workout_sessions`: fullførte/aktive økter. JSONB for `exercises`, `total_volume`, `duration`, `is_completed` m.m.

**Viktig:** Profilinformasjon (navn, e-post, telefon) lagres i Supabase Auth (`auth.users` og `user_metadata`). Ingen ekstra brukertabeller er nødvendige.

RLS: Alle tabeller er sikret slik at brukeren kun ser/opererer på egne rader (`auth.uid() = user_id` / `id`). Indekser finnes på sentrale felt for ytelse (f.eks. `user_id`, `date`).

## Viktige skjermer og funksjoner

- `Template Sessions` (`src/views/TemplateSessions.vue`): dashboard for å starte nye økter og fortsette aktive.
- `Øvelser` (`src/views/Exercises.vue`): kompakt liste med tydelige handlinger og klikkbarhet til detaljer. Piltips indikerer at kortene er trykkbare.
- `Øvelse` detalj (`src/views/ExerciseDetail.vue`):
  - PR‑tavle: beste for rep‑mål 1/3/4/6/8/10/12/14 (eksakt)
  - Estimert 1RM (Epley): 1RM ≈ vekt × (1 + reps/30), graf per uke
  - Intensitet per uke: sum(vekt×reps)/sum(reps)
  - Volumtopp og trend: beste uke/måned + 4‑ukers glidende snitt vs forrige 4 uker
  - Siste prestasjoner: tre siste sett
- `Historikk` (`src/views/History.vue`): liste over fullførte økter.
- `Statistikk` (`src/views/Stats.vue`):
  - Oversikt: Total Sets, Total Reps, antall fullførte økter, snitt varighet
  - Fremgang over tid: PR‑kort og One‑Rep‑Max progresjon (top 5)
  - Treningsvaner: kalender (måned), streaks, økter/uke
  - Fordeling/balanse: muskelgrupper
  - Prestasjoner: synlige badges (grå til oppnådd), inkl. «1 000 000 kg totalvolum», ukevaner (3+), m.m.
  - Volum: én progressbar mot neste milepæl (5k → 10k → 25k → 50k → 100k → 250k → 500k → 1M)
- `Profil` (`src/views/Profile.vue`): skjema for profilinfo (eget «Oppdater profil»), og eget kort for passord (eget «Oppdater passord»). Abonnement/Plus som visuell seksjon.

### Inndata og datakvalitet

- Inputs i aktive økter er håndtert uten `v-model.number` for robust parsing (bruker eksplisitt `@input`/`@blur`, `Number/parseFloat/parseInt`).
- Tunnel for riktige tall helt til lagring (og ved henting re‑kalkuleres volum for konsistens).

## Kom i gang

### ⚠️ Viktig: Miljøvariabler må settes opp først!

**Du må opprette en `.env.local` fil i prosjektets rotmappe med dine Supabase-nøkler før du kan kjøre appen.**

1. **Opprett `.env.local` fil** i prosjektets rotmappe:

```bash
# Windows
echo. > .env.local

# macOS/Linux
touch .env.local
```

2. **Fyll inn dine Supabase-nøkler** i `.env.local`:

```env
VITE_SUPABASE_URL=din_supabase_url_her
VITE_SUPABASE_ANON_KEY=din_supabase_anon_key_her
```

**Hvor finner jeg nøklene?**

- Gå til [Supabase Dashboard](https://supabase.com/dashboard)
- Velg ditt prosjekt
- Gå til "Settings" → "API"
- Kopier "Project URL" til `VITE_SUPABASE_URL`
- Kopier "anon public" til `VITE_SUPABASE_ANON_KEY`

### Installasjon og kjøring

3. Installer avhengigheter:

```bash
npm install
```

4. Kjør lokalt:

```bash
npm run dev
```

5. Åpne `http://localhost:5173`

### Supabase‑oppsett

Les `supabase-setup/README.md` for trinnvis guide. Kortversjon:

1. Opprett Supabase‑prosjekt (hvis du ikke har gjort det ennå)
2. Kjør SQL i denne rekkefølgen i Supabase SQL Editor:
   - `02_workout_templates.sql`
   - `03_workout_sessions.sql`

## Kodeprinsipper og struktur

```
src/
  components/      # Gjenbrukbare komponenter
  views/           # Sider (ruter)
  composables/     # Data/forretningslogikk (Supabase, hybridlagring, utils)
  router/          # Vue Router
  types/           # TypeScript‑typer
```

- TypeScript over alt; eksplisitte typer på eksporterte APIer og funksjoner
- Lesbarhet > «smarte» oneliners; tydelige variabelnavn
- Tidlig retur i logikk, håndter edge cases først
- Unngå dype nestinger, foretrekk mindre, rene funksjoner

## Testing og kvalitet

- ESLint/Volar‑støtte i editor
- Enkel testkode finnes under `src/Test/` som eksempel; utvid etter behov.

## Kreditering

- Laget av prosjektets eier. Åpne issues/idéer tas imot – se `supabase-setup/` og kommentarer i kildekoden for videre utvikling.

— Ta neste steg mot dine mål 💪
