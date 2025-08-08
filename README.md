# Treningsloggen

En treningslogg bygget med Vue 3 (Composition API) og TypeScript. Appen gjør det enkelt å registrere økter, følge progresjon og se meningsfulle statistikker – med fokus på konsistens og styrkeutvikling.

## Hva appen gjør
- Registrer økter med øvelser og sett (reps/vekt)
- Se «Sist»‑hint per øvelse i aktive økter (reps × kg) for raskt å matche/forbedre
- Øvelsesliste med 1RM (one‑rep max) per øvelse
- Detaljside for øvelse med graf over fremgang og 1RM som personlig rekord
- Historikk over fullførte økter
- Statistikkside med totaler, vaner (streaks/kalender), fordeling og motivasjon

## Hovedfunksjoner
- Økter: Start/fortsett aktive økter, legg til øvelser og sett
- Øvelser: Kategorisert liste, redigering, 1RM‑oversikt
- Historikk: Filtrer/les oppsummering av tidligere økter
- Statistikk: Fremgang over tid, vaner, fordeling og prestasjoner
- Mobilfokus: Nederste navigasjon og rene visninger

## Teknologi
- Vue 3 + Composition API (TypeScript)
- Vite, TailwindCSS
- Supabase (autentisering og brukerdata)

## Kjør lokalt
1) Installer avhengigheter:
```bash
npm install
```
2) Start utviklingsserver:
```bash
npm run dev
```
3) Åpne `http://localhost:5173`

## Supabase
Appen bruker Supabase for autentisering og brukerens data. Se `supabase-setup/` for komplett steg‑for‑steg oppsett, ferdige SQL‑filer (opprette tabeller, seed av norske øvelser) og tips for free‑tier.

Kortversjon:
- Opprett prosjekt i Supabase
- Sett `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` i `.env.local`
- Kjør relevante SQL‑skript fra `supabase-setup/`

## Mappestruktur (utdrag)
```
src/
  components/
  views/
  composables/
  router/
  types/
supabase-setup/
  create_exercises_table.sql
  fix_exercises_table.sql
  update_users_table.sql
  SEED_exercises_no.sql
  README.md
```

## Bidrag
Dette er et personlig prosjekt, men innspill er velkomne.

— Ta neste steg mot dine mål 💪 