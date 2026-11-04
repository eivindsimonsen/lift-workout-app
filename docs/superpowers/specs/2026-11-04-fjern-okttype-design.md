# Fjerne økttype — design

## Hvorfor

De hardkodede økttypene (Push, Pull, Legs, Upper, Lower, Full Body, Kondisjon) passer ikke alle brukere, og de styrer ingen logikk — bare farger, gruppering og filtre. En mal skal være et navn og et sett øvelser; hva den trener, leses av øvelsene og muskelgruppene deres.

## Hva

- **Malskjema:** valget «Økt type» forsvinner. En mal er navn + øvelser. Muskelgruppene velges ikke noe sted; de følger av øvelsene.
- **Øvelsespanelet** (`ExerciseSearchPanel`, brukt både i malskjemaet og under økt): ingen muskelgrupper er forhåndsvalgt. Alle øvelser vises, og brukeren huker av for å snevre inn. Prop-en `workoutType`, typekartet og hintet «(filtrert for …)» fjernes.
- **Forsiden** (`TemplateSessions.vue`): malene vises som én flat liste uten gruppering per type. Typemerket og fargeglød på malkortene fjernes. «Start Økt» bruker appens vanlige oransje (primary). Typemerket på aktiv økt fjernes. (Forsiden og malkortene oppgraderes senere — ikke en del av dette.)
- **Statistikk:** seksjonen «Økttyper» fjernes.
- **Historikk:** filteret «Økt Typer» byttes ut med muskelgrupper (alle i `muscle-groups.json`, inkludert Kondisjon). Flere valgte grupper betyr **og**: økta vises bare om den har øvelser fra alle de valgte. Muskelgruppen til en øvelse slås opp i `exerciseIndex` (biblioteksøvelsens `category`), som ukemålene gjør; id-er som ikke kan slås opp, matcher ingenting. Søkefeltet søker allerede på malnavnet (navnet økta fikk da den ble logget) — uendret.
- **Typemerket** i aktiv økt (`WorkoutSession.vue`), øktdetaljer (`SessionDetails.vue`) og øktlista i `WeekDetails.vue` fjernes — øktnavnet sier det samme. Det samme gjør den typefargede prikken foran øktnavnet i Historikk-lista. Malbrikkene i ukevisningen («1× Push») fjernes helt (endret etter første runde; de fikk først en nøytral farge).
- **Gamle økter og maler** beholder verdien sin i databasen; den vises ikke lenger noe sted.

## Tilnærming

- **B (valgt):** ny `supabase-setup/13_drop_workout_type_not_null.sql` gjør `workout_type` valgfri på `workout_templates` og `workout_sessions` (`ALTER COLUMN workout_type DROP NOT NULL`). Koden slutter å lese og skrive feltet. Ingenting slettes. **SQL-en er allerede kjørt i Supabase (2026-11-04)**, så filen skrives for å dokumentere endringen, og koden kan deployes når som helst.
- **A (valgt bort):** beholde `NOT NULL` og skrive en tom streng — ingen SQL, men koden må bære en meningsløs verdi for alltid.
- **Droppe kolonnen (valgt bort):** en installert app som fortsatt kjører gammel versjon fra cache, ville feile ved lagring, og dataene ville gå tapt.

## Opprydding (samme runde)

- `src/data/workout-types.json`, `WorkoutType`-typen og hjelperne `workoutTypes`/`getWorkoutType`/`getWorkoutTypeColor` i `useHybridData` fjernes. `workoutType` fjernes fra `WorkoutTemplate`, `WorkoutSession`, Supabase-typene i `useSupabase` og mappingen i `useSupabaseData`, og fra `templateUsage` i `useWeekStats`.
- Den døde koden for `workout_types` på biblioteksøvelser fjernes: feltet i `ExerciseData`/`useExercises`/`useHybridData`, og den ubrukte komponenten `ExerciseSelector.vue`. Kolonnen `exercises.workout_types` blir stående (den har standardverdi `'{}'`).
- `DESIGN.md` (linja om farger fra `workout-types.json`) og `CLAUDE.md` (omtalen av workout-type-hjelperne) oppdateres.

## Ikke-mål

- Ingen ny gruppering eller ny farge på malkort — det kommer med oppgraderingen av forsiden og malene.
- Ingen lagring av muskelgrupper på malen.
- Ingen endring av ukemål, streak, settelling eller skillet styrke/kondisjon (de bruker ikke økttype).
- Ingen omformatering av hele filer.

## Overlatt til den som bygger

- Hvordan filterlista i Historikk ser ut, innenfor dagens filterpanel og `DESIGN.md` (gjerne fargeprikk per gruppe).
- Nøyaktig nøytral farge på malbrikkene i ukevisningen, fra paletten som finnes.
