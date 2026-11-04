# Fjerne økttype — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fjern økttype (Push/Pull/…) fra hele appen. En mal er navn + øvelser, Historikk filtrerer på muskelgrupper, og øvelsespanelet starter uten forhåndsvalg.

**Architecture:** Visningene slutter først å lese økttypen (hver oppgave holder `type-check` grønn). Deretter fjernes `workoutType` fra modellen, datalaget og malskjemaet i én operasjon, og til slutt den døde `workoutTypes`-koden på biblioteksøvelser. Kolonnene i databasen blir stående; `13_` gjør `workout_type` valgfri (allerede kjørt).

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Supabase.

**Spec:** `docs/superpowers/specs/2026-11-04-fjern-okttype-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push. Commit-steg er utelatt.
- UI-tekst på bokmål, kommentarer på engelsk. Følg stilen i hver fil (History/Stats/WeekDetails/SessionDetails/TemplateSessions: doble fnutter og semikolon; WorkoutSession/TemplateForm/ExerciseSearchPanel: enkle fnutter, ingen semikolon). Ingen omformatering av hele filer, ingen flytting av SFC-blokker.
- Last `my-vue-style` før første `.vue`-endring.
- Farger kun fra `muscle-groups.json` eller eksisterende palett i `DESIGN.md`. Nøytral pille (plan-beslutning): bakgrunn `#94a3b818`, kant `#94a3b840`, tekst `#cbd5e1`.
- Muskelgruppen til en logget øvelse: `workoutData.exerciseIndex.value.get(Number(ex.exerciseId))?.category`. Ingen navneoppslag.
- Ubrukt CSS som hører til fjernet markup, fjernes i samme fil.
- Verifisering per oppgave: `npm run type-check` (ren). Til slutt også `npm run build`.

## Review Focus

1. **Eksisterende cache og kø:** IndexedDB-snapshots og `pendingChanges` med `workoutType`/`workout_type` fra før endringen. Appen skal åpne som før og aldri vise typen; køede innlegg med `workout_type` er fortsatt gyldige fordi kolonnen finnes.
2. **Redigere en gammel mal / lage mal fra økt:** lagring virker uten type, og oppdatering sender ikke `workout_type` (gammel verdi i databasen blir urørt).
3. **Historikkfilter når en øvelse ikke kan slås opp** (slettet fra biblioteket, eller biblioteket ikke lastet): øvelsen bidrar ikke til noen gruppe, ingen feil.
4. **Historikkfilter, og-logikk:** Bryst + Rygg viser bare økter med begge; Kondisjon alene viser kondisjonsøkter; en øvelse uten sett som teller (`isSetCounted`) bidrar ikke.
5. **Øvelsespanelet åpnet på nytt** etter at grupper ble huket av: starter igjen uten noe valgt.

---

### Task 1: Visningene slutter å vise økttype

**Files:**
- Modify: `src/views/TemplateSessions.vue` (`templatesByType` 28–56, hjelpere 78–84, aktiv-økt-merke 509–517, gruppert maloversikt 590–643)
- Modify: `src/views/WorkoutSession.vue` (merker 34–43 og 59–68, hjelpere 880–886)
- Modify: `src/views/SessionDetails.vue` (`typeName`/`typeColor` 49–50, `sd-meta__type` 318–322, CSS 482–494)
- Modify: `src/views/WeekDetails.vue` (hjelpere 90–91, malbrikker 305–315, `wk-session__type` 536–543, CSS 1133–1139)
- Modify: `src/views/Stats.vue` (`workoutTypeShares` 74–82, seksjonen «Økttyper» 529–541)
- Modify: `src/views/History.vue` (`hx-row__dot` 258 + CSS 490–495, `padding-left: 1rem` i `.hx-row__meta`)

**Interfaces:**
- Consumes: ingenting nytt. Etter oppgaven bruker ingen av disse filene `getWorkoutType`/`getWorkoutTypeColor`/`workoutTypes` (unntatt History-filteret, som Task 2 bytter ut).

- [ ] **Step 1: Forsiden.** Fjern `templatesByType`, gruppeoverskriftene og typemerket; mal-kortene rendres i ett rutenett direkte fra `filteredTemplates`. Fjern `boxShadow`-stilen og glød-`div`-en som bruker typefargen. «Start Økt» mister `:style` og får `bg-primary-500 hover:bg-primary-600 text-white`. Fjern typemerket på aktiv økt.
- [ ] **Step 2: Aktiv økt, øktdetaljer, ukevisning.** Fjern typemerkene (begge i `WorkoutSession.vue`), `sd-meta__type`-spannet og `wk-session__type`-spannet. Malbrikkene i ukevisningen får den nøytrale pillen fra Global Constraints (statisk CSS i `.wk-chip`, ingen `:style`).
- [ ] **Step 3: Statistikk og historikkrad.** Fjern `workoutTypeShares` og «Økttyper»-blokken (delte `st-*`-klasser blir stående). Fjern prikken i historikkraden og innrykket i `.hx-row__meta`, så metalinja flukter med navnet.
- [ ] **Step 4: Verifiser.** `npm run type-check` → ingen feil. `grep -n "getWorkoutType\|workoutTypeShares" src/views/{TemplateSessions,WorkoutSession,SessionDetails,WeekDetails,Stats}.vue` → ingen treff.

### Task 2: Historikk filtrerer på muskelgrupper

**Files:**
- Modify: `src/views/History.vue` (state 21, filter 43–45, `hasActiveFilters`/add/remove/toggle/clear 79–96, hjelpere 187–188, aktive piller 216–221, filterseksjon 302–316)

**Interfaces:**
- Consumes: `exerciseIndex` fra `useHybridData`, `isSetCounted` fra `useSetMetrics`, `muscle-groups.json`.
- Produces (lokalt i fila):
  ```ts
  const selectedGroups = ref<string[]>([]);              // muscle group names, e.g. "Bryst"
  /** Groups a completed session trained: exercises with ≥1 counted set, resolved by id. */
  const sessionGroups = computed<Map<string, Set<string>>>(/* session.id → groups */);
  ```

- [ ] **Step 1:** Erstatt `selectedTypes` med `selectedGroups`, og `addType`/`removeType`/`onTypeToggle` med tilsvarende `…Group`. Filter: `selectedGroups.every((g) => sessionGroups.get(s.id)?.has(g))`. `sessionGroups` leses bare når minst én gruppe er valgt (computed er lat).
- [ ] **Step 2:** Filterseksjonen heter «Muskelgrupper» og lister alle grupper i `muscle-groups.json` i fil-rekkefølge, med fargeprikk (gruppens farge) foran navnet. De aktive pillene viser gruppenavnet. Fjern `getWorkoutTypeName`/`getWorkoutTypeColor`.
- [ ] **Step 3: Verifiser.** `npm run type-check` → ingen feil. `grep -n "workoutType\|selectedTypes" src/views/History.vue` → ingen treff.

### Task 3: Øvelsespanelet uten forhåndsvalg

**Files:**
- Modify: `src/components/ExerciseSearchPanel.vue` (import 8, prop 19, `getDefaultCategories` 90–112, `workoutTypes` 114, watch 168–177, hint 203–205, CSS `.ep-panel__filters-hint` ~357)
- Modify: `src/views/TemplateForm.vue:456` og `src/views/WorkoutSession.vue:201` (fjern `:workout-type`)

**Interfaces:**
- Produces: `ExerciseSearchPanel` props er `{ isOpen: boolean; title?: string }`.

- [ ] **Step 1:** Fjern prop-en, kartet, hintet og importen. `watch` på `isOpen` nullstiller `selectedCategories` til `[]` ved åpning.
- [ ] **Step 2:** Fjern `:workout-type` fra begge kallene.
- [ ] **Step 3: Verifiser.** `npm run type-check` → ingen feil.

### Task 4: `workoutType` ut av modell, datalag og malskjema

**Files:**
- Modify: `src/views/TemplateForm.vue` (import 11, `templateForm` 23, `workoutTypes` 32–34, `getWorkoutTypeColor` 102–105 + fallback 114–116, lagring 194/202, redigering 228, kopi fra økt 253, typevalget 334–350)
- Modify: `src/types/workout.ts` (`WorkoutType` 62–67, `WorkoutTemplate.workoutType` 73, `WorkoutSession.workoutType` 90)
- Modify: `src/composables/useSupabase.ts` (`workout_type` i Row/Insert/Update for begge tabeller)
- Modify: `src/composables/useSupabaseData.ts` (316, 369, 729, `getTemplatesByType` 804 + eksport 1270, 822, 836, 869, 960, 991, 1049)
- Modify: `src/composables/useHybridData.ts` (import 4–5, `workoutTypes`/hjelpere 26–38, `getTemplatesByType` 149–152, eksport 171–174 og 198)
- Modify: `src/composables/useWeekStats.ts` (`TemplateUsage.workoutType` 102, 403)
- Delete: `src/data/workout-types.json`
- Create: `supabase-setup/13_drop_workout_type_not_null.sql`
- Modify: `CLAUDE.md` (workout-type-hjelperne i `useHybridData`-avsnittet; «neste nummer (`13_…`)» → `14_…`), `DESIGN.md:49–50`

**Interfaces:**
- Produces: `WorkoutTemplate = { id; name; exercises }`, `WorkoutSession` uten `workoutType`, `TemplateUsage = { name; count }`. `useHybridData` eksporterer ikke lenger `workoutTypes`, `getWorkoutType`, `getWorkoutTypeColor`, `getTemplatesByType`.

- [ ] **Step 1: Malskjemaet.** Fjern feltet «Økt type» og alt som leser det. `getExerciseAccentColor` faller tilbake rett til `'#64748b'`.
- [ ] **Step 2: Modell og datalag.** Fjern `workoutType`/`workout_type` på alle linjene over, slik at ingen insert/update sender kolonnen og ingen mapping leser den.
- [ ] **Step 3: SQL-filen** (dokumenterer det som allerede er kjørt):
  ```sql
  -- 13_drop_workout_type_not_null.sql
  -- Purpose: workout type (Push/Pull/...) is no longer used by the app. Make the
  -- column optional so new rows can omit it. Non-destructive: existing values stay.
  -- Already run in production on 2026-11-04.
  ALTER TABLE workout_templates ALTER COLUMN workout_type DROP NOT NULL;
  ALTER TABLE workout_sessions  ALTER COLUMN workout_type DROP NOT NULL;
  ```
- [ ] **Step 4: Dokumentasjon.** `DESIGN.md`: fargelinja nevner bare muskelgrupper; linja «Bryst og Push bruker samme oransje» blir «Bryst bruker samme oransje som styrkeaksenten …». `CLAUDE.md` som over.
- [ ] **Step 5: Verifiser.** `npm run type-check` → ingen feil. `grep -rn "workoutType\b\|workout_type\|workout-types\|getWorkoutType" src` → ingen treff.

### Task 5: Død `workoutTypes`-kode på biblioteksøvelser

**Files:**
- Modify: `src/types/workout.ts` (`ExerciseData.workoutTypes` 56)
- Modify: `src/composables/useExercises.ts` (payload-typer 13 og 20, select 68, mapping 87, insert/select/mapping 125–138, update 166–167)
- Modify: `src/composables/useHybridData.ts` (`getFlattenedExercises` 117, 129, 139 — selve computed-en brukes av `WorkoutSession.vue` og blir stående)
- Modify: `src/components/ExerciseForm.vue:147` (`{ ...payload }` uten `workoutTypes`)
- Delete: `src/components/ExerciseSelector.vue` (ikke importert noe sted)

- [ ] **Step 1:** Fjern feltet overalt over. Insert uten `workout_types` er trygt (kolonnen har standard `'{}'`).
- [ ] **Step 2: Verifiser.** `npm run type-check` og `npm run build` → begge rene. `grep -rn "workoutTypes\|workout_types\|ExerciseSelector" src` → ingen treff.

### Avslutning

- [ ] Én avsluttende gjennomgang av hele diffen med en fersk agent (se `superpowers:requesting-code-review`), med Review Focus over som sjekkliste.
- [ ] Gi Eivind en kort sjekkliste for manuell test på telefon: lag mal, rediger gammel mal, start økt, legg til øvelse under økt, Historikk-filter (Bryst + Rygg, Kondisjon), Statistikk, ukevisning.
