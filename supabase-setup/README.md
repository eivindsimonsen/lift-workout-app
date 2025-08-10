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

1. `01_user_preferences.sql`
   - Oppretter `user_preferences` (koblet til `auth.users`) og slår på RLS
   - Policyer lar brukeren kun lese/endre sin egen rad
   - Lagrer kun abonnement og preferanser, ikke profildata
2. `02_workout_templates.sql`
   - Oppretter `workout_templates` (økt maler per bruker)
   - Indeks på `user_id` + RLS med policyer for egen data
3. `03_workout_sessions.sql`
   - Oppretter `workout_sessions` (økter per bruker)
   - Indekser på `user_id`, `date` og `template_id` + RLS/policyer

Alle filene er idempotente: de bruker `IF NOT EXISTS` for å unngå feil ved re‑kjøring.

## 2) Om tabellene
- `user_preferences`: abonnementstatus og brukerpreferanser (koblet til `auth.users`)
- `workout_templates`: brukerens øktmaler, lagret som JSONB for øvelser
- `workout_sessions`: faktiske økter, lagret med øvelser som JSONB

**Viktig:** Profilinformasjon (navn, e-post, telefon) lagres i Supabase Auth (`auth.users` og `user_metadata`), ikke i `user_preferences`.

RLS (Row Level Security) er aktivert på alle tabeller: en innlogget bruker ser/lagrer bare sin egen data.

## 3) Første gangs oppstart
- Start appen lokalt:
```
npm install
npm run dev
```
- Registrer/logg inn bruker i appen (Supabase Auth).
- Appen vil deretter opprette brukerens preferanserad i `user_preferences` når du logger inn første gang.

Merk: SQL‑editoren i Supabase kan ikke bruke `auth.uid()` interaktivt. Hvis du ønsker å manuelt opprette en bruker‑rad i `user_preferences`, må du bruke faktisk UUID fra `auth.users`:
```sql
-- Finn ditt user id (UUID) i Authentication → Users
INSERT INTO user_preferences (id, supabase_id, subscription_type, subscription_status)
VALUES ('<AUTH_USER_UUID>', '<AUTH_USER_UUID>', 'free', 'active')
ON CONFLICT (id) DO NOTHING;
```

## 4) Feilsøking
- Får du 401/403 i appen? Sjekk at du er innlogget og at RLS‑policyene kjører (de følger med i SQL‑filene)
- Ser du ikke data? Sjekk at `user_id` settes ved lagring (policyene krever at `auth.uid() = user_id`)
- Mangler miljøvariabler? Verifiser `.env.local`
- Profiloppdateringer lagres ikke? Sjekk at du bruker `supabase.auth.updateUser()` for profildata

## 5) Vedlegg
- `01_user_preferences.sql`: Oppretter `user_preferences` + RLS
- `02_workout_templates.sql`: Oppretter `workout_templates` + indeks + RLS
- `03_workout_sessions.sql`: Oppretter `workout_sessions` + indekser + RLS