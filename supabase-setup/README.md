# Supabase Setup

Denne mappen samler ALT du trenger for å sette opp Supabase for appen.

## Hva lagres i Supabase?
- Brukerdata (autentisering via `auth.users`)
- Brukers egne øvelser i tabellen `exercises`
- Økter og maler lagres også i Supabase i dette prosjektet (se egne prosjekt‑SQL/tilpasninger). Denne mappen dekker spesifikt `exercises` og hjelpe‑SQL for `users`.

For optimalisering/videre utvidelser, se også:
- `SUPABASE_SETUP.md` – komplett, mer omfattende oppsett
- `SUPABASE_OPTIMIZED_SETUP.md` – alternativ strategi for free‑tier
- `DUPLICATE_EMAIL_FIX.md` – notater rundt e‑postverifikasjon

## Forutsetninger
1) Opprett et prosjekt på supabase.com
2) Hent Project URL og anon key fra Settings → API
3) I prosjektroten av appen, opprett `.env.local` med:
```env
VITE_SUPABASE_URL=din_project_url
VITE_SUPABASE_ANON_KEY=din_anon_key
```

## Steg 1: Opprett tabeller (Øvelser)
Kjør i SQL Editor i Supabase:
- `create_exercises_table.sql` – Oppretter `exercises` med RLS, indekser og trigger
  - Hvis du trenger en «hard reset» av tabellen, bruk `fix_exercises_table.sql` (drop + recreate)

## Steg 2: (Valgfritt) Oppdater `users`
Hvis du bruker en egen `users`‑tabell i tillegg til `auth.users`, kan du kjøre:
- `update_users_table.sql` – Legger til enkle felter og standardverdier

## Steg 3: Seed øvelser
Vil du starte med et godt sett øvelser på norsk?
- Åpne `SEED_exercises_no.sql`
- Bytt ut e‑posten i fila med din konto
- Kjør scriptet i SQL Editor
- Scriptet er idempotent (ON CONFLICT DO NOTHING)

## Kjør appen
1) `npm install`
2) `npm run dev`
3) Logg inn i appen. Med RLS vil du kun se dine data.

## Filer i mappen
- `create_exercises_table.sql` – Oppretter `exercises`
- `fix_exercises_table.sql` – Drop + recreate av `exercises`
- `update_users_table.sql` – Tilleggsfelter på `users`
- `SEED_exercises_no.sql` – Seeder mange norske øvelser for en bruker
- `SUPABASE_SETUP.md` – Komplett databaseoppsett (utvidet)
- `SUPABASE_OPTIMIZED_SETUP.md` – Free‑tier vennlig strategi
- `DUPLICATE_EMAIL_FIX.md` – Notater/tiltak rundt dupliserte verifikasjoner

Tips: Ta backup før du kjører destruktive scripts som `fix_exercises_table.sql`.
