# Supabase setup

Denne guiden forklarer nøyaktig hvordan du setter opp databasen i Supabase for denne appen. Kjør filene i rekkefølgen under – da opprettes tabeller, indekser og RLS‑policyer automatisk.

## 0) Forutsetninger
- Opprett et prosjekt på Supabase
- Hent Project URL og anon key i Settings → API
- Lag `.env.local` i prosjektroten og legg inn:
```
VITE_SUPABASE_URL=<din_project_url>
VITE_SUPABASE_ANON_KEY=<din_anon_key>
```

## 1) Kjør SQL‑filene i denne rekkefølgen
Kopier innholdet i hver fil til Supabase SQL Editor og kjør – eller last opp og kjør filen direkte.

1. `01_users.sql`
   - Oppretter `users` (koblet til `auth.users`) og slår på RLS
   - Policyer lar brukeren kun lese/endre sin egen rad
2. `02_workout_templates.sql`
   - Oppretter `workout_templates` (økt maler per bruker)
   - Indeks på `user_id` + RLS med policyer for egen data
3. `03_workout_sessions.sql`
   - Oppretter `workout_sessions` (økter per bruker)
   - Indekser på `user_id`, `date` og `template_id` + RLS/policyer

4. `04_exercises.sql` (øvelser per bruker)
   - Oppretter `exercises`-tabellen (brukers egne øvelser) med RLS og triggere for `updated_at`
   - OBS: Denne fila dropper eksisterende `exercises` før den oppretter på nytt (destruktiv). Kjør hvis du vil starte på nytt eller migrere til riktig struktur.

Alle filene er idempotente: de bruker `IF NOT EXISTS` for å unngå feil ved re‑kjøring.

## 2) Om tabellene
- `users`: profil og abonnementstatus for app‑brukere (koblet til `auth.users`)
- `workout_templates`: brukerens øktmaler, lagret som JSONB for øvelser
- `workout_sessions`: faktiske økter, lagret med øvelser som JSONB

RLS (Row Level Security) er aktivert på alle tabeller: en innlogget bruker ser/lagrer bare sin egen data.

## 3) Første gangs oppstart
- Start appen lokalt:
```
npm install
npm run dev
```
- Registrer/logg inn bruker i appen (Supabase Auth).
- Appen vil deretter skrive/oppdatere brukerens profilrad i `users` når du endrer profilinformasjon.

Merk: SQL‑editoren i Supabase kan ikke bruke `auth.uid()` interaktivt. Hvis du ønsker å manuelt opprette en bruker‑rad i `users`, må du bruke faktisk UUID fra `auth.users`:
```
-- Finn ditt user id (UUID) i Authentication → Users
INSERT INTO users (id, supabase_id, email, name)
VALUES ('<AUTH_USER_UUID>', '<AUTH_USER_UUID>', 'din@email.no', 'Ditt Navn')
ON CONFLICT (id) DO NOTHING;
```

## 4) Feilsøking
- Får du 401/403 i appen? Sjekk at du er innlogget og at RLS‑policyene kjører (de følger med i SQL‑filene)
- Ser du ikke data? Sjekk at `user_id` settes ved lagring (policyene krever at `auth.uid() = user_id`)
- Mangler miljøvariabler? Verifiser `.env.local`

## 5) Vedlegg
- `01_users.sql`: Oppretter `users` + RLS
- `02_workout_templates.sql`: Oppretter `workout_templates` + indeks + RLS
- `03_workout_sessions.sql`: Oppretter `workout_sessions` + indekser + RLS
- `04_exercises.sql`: Oppretter `exercises` + indekser + RLS + `updated_at`‑trigger (destruktiv/resetter tabellen)


