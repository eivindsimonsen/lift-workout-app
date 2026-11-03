# Vektenheter (lbs og kroppsvekt) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Velg kg, lbs eller + kroppsvekt per øvelse i den aktive økta, lagre enheten på settet, og regn volum (total belastning) og fremgang (ekstravekt for kroppsvekt) riktig i kg overalt.

**Architecture:** Settet beholder tallet som ble skrevet inn + `weightUnit` + et `bodyweight`-øyeblikksbilde. Tre rene hjelpere i `useSetMetrics` (`setLoadKg`, `setProgressKg`, `setWeightText`) er eneste sted enhetene tolkes; `setVolume` og alle visninger går via dem. Kroppsvekt bor i `user_metadata.bodyweight`.

**Tech Stack:** Vue 3, TypeScript, Supabase Auth metadata, Node 22 `--experimental-strip-types` for selvsjekk.

**Spec:** `docs/superpowers/specs/2026-11-03-vektenheter-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push. Commit-steg er utelatt.
- UI-tekst bokmål, kommentarer engelsk. Følg stilen i hver fil; ikke reformater hele filer. Last `my-vue-style` før `.vue`-endringer (ikke flytt blokker i `WorkoutSession.vue`).
- `useSetMetrics.ts` er eneste sted `weightUnit` tolkes — ingen `weight * reps` eller `× 0,4536` andre steder.
- `LBS_TO_KG = 0.45359237`. Sett uten `weightUnit` = kg (gamle økter røres ikke).
- `useSetMetrics.ts` skal fortsatt bare ha `import type` (selvsjekken kjører den i Node).
- Norsk tall: komma i inndata og visning (`toLocaleString("no-NO")`).
- Trykkflater ≥ 44 px; farger fra `DESIGN.md` (tonet oransje for valgt: `#f9731618` / `#f9731640` / `#fdba74`; felt `#243044` / `#3d5068`).
- Verifisering: selvsjekk + `npm run type-check` + `npm run build`.

## Review Focus

1. **Lagringsrunden:** `weightUnit`/`bodyweight` overlever lagring → reload → IndexedDB → Supabase (feltene plukkes ut ett og ett i `updateWorkoutSessionOffline`).
2. **Gamle økter:** helt uendret visning og tall for sett uten `weightUnit`.
3. **Bytte enhet etter at sett er tatt:** kg → + kroppsvekt med vekt 0-sett skal bli loggede; + kroppsvekt → kg skal gjøre vekt 0-sett ulogget igjen (`updateSetCompletion`).
4. **Kroppsvekt mangler i profilen:** hint i arket, ingen krasj, volum = bare ekstravekt; fylles inn ved fullføring hvis lagt inn underveis.
5. **Kondisjon:** uberørt — ingen velger i kondisjonsarket, volum 0.

---

### Task 1: Enhetshjelpere i `useSetMetrics.ts`

**Files:**
- Modify: `src/types/workout.ts` (`WorkoutSet`, ~l. 114–125)
- Modify: `src/composables/useSetMetrics.ts`
- Test: `<scratchpad>/check-set-metrics.ts` (ny)

**Interfaces:**
- Produces:
  ```ts
  // types/workout.ts
  export type WeightUnit = "kg" | "lbs" | "bodyweight";
  // WorkoutSet: weightUnit?: WeightUnit; bodyweight?: number  // kg snapshot, only with "bodyweight"
  // useSetMetrics.ts
  export const LBS_TO_KG = 0.45359237;
  export const weightUnitOf: (set: SetLike) => WeightUnit;              // missing → "kg"
  export const setLoadKg: (exercise: ExerciseLike, set: SetLike) => number;     // volume load
  export const setProgressKg: (exercise: ExerciseLike, set: SetLike) => number; // heaviest/PR/1RM/next
  export const setWeightText: (set: SetLike) => string;                 // "45,4 kg" · "KV + 10 kg" · "KV" · "77,5 kg"
  // changed: isStrengthSetLogged — "bodyweight" needs only reps > 0; setVolume = setLoadKg × reps
  ```
  `SetLike` får `weightUnit?: unknown; bodyweight?: unknown`.

- [ ] **Step 1: Skriv selvsjekken** `check-set-metrics.ts` (importer fra `file:///C:/git_privat/lift-workout-app/src/composables/useSetMetrics.ts`, `node:assert/strict`):
  ```ts
  const s = { trackingType: "strength" as const };
  const c = { trackingType: "cardio" as const };
  const near = (a: number, b: number) => ok(Math.abs(a - b) < 1e-9, `${a} ≉ ${b}`);
  equal(setLoadKg(s, { weight: 100 }), 100);                                        // no unit = kg (old sets)
  near(setLoadKg(s, { weight: 100, weightUnit: "lbs" }), 45.359237);
  equal(setLoadKg(s, { weight: 10, weightUnit: "bodyweight", bodyweight: 90 }), 100);
  equal(setLoadKg(s, { weight: 10, weightUnit: "bodyweight" }), 10);                // no snapshot → extra only
  equal(setLoadKg(c, { weight: 10 }), 0);
  equal(setProgressKg(s, { weight: 10, weightUnit: "bodyweight", bodyweight: 90 }), 10); // progress = extra
  near(setProgressKg(s, { weight: 100, weightUnit: "lbs" }), 45.359237);
  equal(setVolume(s, { weight: 10, reps: 8, weightUnit: "bodyweight", bodyweight: 90 }), 800);
  near(setVolume(s, { weight: 100, reps: 10, weightUnit: "lbs" }), 453.59237);
  equal(isStrengthSetLogged({ weight: 0, reps: 8, weightUnit: "bodyweight" }), true); // pull-ups without extra
  equal(isStrengthSetLogged({ weight: 0, reps: 8 }), false);
  equal(isStrengthSetLogged({ weight: 0, reps: 8, weightUnit: "lbs" }), false);
  equal(isStrengthSetLogged({ weight: 10, reps: 0, weightUnit: "bodyweight" }), false);
  equal(setWeightText({ weight: 100, weightUnit: "lbs" }), "45,4 kg");
  equal(setWeightText({ weight: 10, weightUnit: "bodyweight", bodyweight: 90 }), "KV + 10 kg");
  equal(setWeightText({ weight: 0, weightUnit: "bodyweight" }), "KV");
  equal(setWeightText({ weight: 77.5 }), "77,5 kg");
  equal(weightUnitOf({ weight: 1 }), "kg");
  console.log("setMetrics OK");
  ```
- [ ] **Step 2: Kjør** `node --experimental-strip-types <scratchpad>/check-set-metrics.ts` → Expected: FAIL (`does not provide an export named 'setLoadKg'`).
- [ ] **Step 3: Implementer** i `useSetMetrics.ts` og typen i `workout.ts`. `setWeightText`: kg og ekstravekt med `maximumFractionDigits: 2` (som `formatKg`), omregnet lbs med `1`.
- [ ] **Step 4: Kjør** selvsjekken → `setMetrics OK`; kjør også `check-goal-streak.ts` → `goalStreak OK`; `npm run type-check` → exit 0.

---

### Task 2: Lagring og fullføring (`useSupabaseData.ts`)

**Files:**
- Modify: `src/composables/useSupabaseData.ts` (sett-mapping i `updateWorkoutSessionOffline` ~l. 740–749; `totalVolume` ved lasting ~l. 307–310 og i `completeWorkoutSession` ~l. 1081–1092)

**Interfaces:**
- Consumes: `setVolume`, `isSetCounted`, `weightUnitOf` (Task 1).

- [ ] **Step 1:** Ta med `weightUnit: set.weightUnit` og `bodyweight: set.bodyweight` i sett-mappingen (Review Focus 1).
- [ ] **Step 2:** Begge `totalVolume`-utregningene bruker `isSetCounted(ex, set) ? setVolume(ex, set) : 0` i stedet for `weight * reps` inline.
- [ ] **Step 3:** I `completeWorkoutSession`, før `totalVolume`: for hvert sett med `weightUnitOf(set) === "bodyweight"` uten `bodyweight`, sett `bodyweight` fra `currentUser.value?.user_metadata?.bodyweight` når det er et tall > 0 (Review Focus 4). Skjer på sesjonsobjektet før det skrives (samme objekt som lagres og speiles til IndexedDB).
- [ ] **Step 4: Verifiser** `npm run type-check` → exit 0; begge selvsjekkene OK.

---

### Task 3: Kroppsvekt i profilen (`Profile.vue`)

**Files:**
- Modify: `src/views/Profile.vue` (state, `initializeProfileData` ~l. 62, `updateBasicProfile` ~l. 73–110, skjemaet)

- [ ] **Step 1:** Nytt felt «Kroppsvekt (kg)» med «valgfritt», i samme skjema som navn/telefon (DESIGN.md «Skjema»). `inputmode="decimal"`, tekstfelt; les fra `user_metadata.bodyweight`, vis med komma.
- [ ] **Step 2:** I `updateBasicProfile`: parse med komma → punktum. Tomt → `null` (fjerner). Ugyldig eller utenfor 30–300 → `showWarning("Kroppsvekt må være mellom 30 og 300 kg")` og avbryt. Endring teller som endring sammen med navn/telefon; lagres i samme `updateUser({ data: { name, phone, bodyweight } })` og speiles i `currentUser.user_metadata` slik navn/telefon gjør.
- [ ] **Step 3: Verifiser** `npm run type-check` → exit 0.

---

### Task 4: Enhetsvelgeren i den aktive økta (`WorkoutSession.vue`)

**Files:**
- Modify: `src/views/WorkoutSession.vue` — sheet-header (~l. 446–458), kolonneoverskrifter (~l. 495–500), sett-rad (~l. 560–582), quick view (~l. 220–270, 690–715), `lastPerformanceLabel` (~l. 906–912), `addSet` (~l. 1198), `openExerciseSheet` (~l. 1340), `getLastPerformance` (~l. 1399), `getHeaviestLift` (~l. 1443), scoped CSS.

**Interfaces:**
- Consumes: `weightUnitOf`, `setVolume`, `setProgressKg`, `setWeightText`, `LBS_TO_KG`, `WeightUnit` (Task 1); `user_metadata.bodyweight` (Task 3).

- [ ] **Step 1: State og handling.**
  - `profileBodyweight = computed(() => …user_metadata?.bodyweight)` (tall > 0 eller `null`).
  - `activeUnit = computed<WeightUnit>(…)` = `weightUnitOf` av første sett i aktiv øvelse.
  - `setExerciseUnit(exerciseIndex: number, unit: WeightUnit)`: skriv `weightUnit` til alle settene; for `bodyweight` sett `bodyweight = profileBodyweight ?? undefined`, ellers slett `bodyweight`; kjør `updateSetCompletion` for hvert sett (Review Focus 3); `persistExercisesToLocal()`.
  - `openExerciseSheet`: er øvelsen styrke og ingen sett har `weightUnit`, kall `setExerciseUnit(idx, getLastPerformance(id)?.weightUnit ?? "kg")`.
  - `addSet`: nytt sett kopierer `weightUnit` og `bodyweight` fra settet over.
  - `getLastPerformance` returnerer også `weightUnit: weightUnitOf(lastSet)` og `bodyweight: lastSet.bodyweight`.
- [ ] **Step 2: Velgeren** under tittel/«Sist»-linjen, bare for styrke (`!activeExerciseIsCardio`): tre knapper «kg» · «lbs» · «+ kroppsvekt» i et segmentert felt (felt-farger, valgt = tonet oransje, min-høyde 44 px, `aria-pressed`). Under, når `activeUnit === 'bodyweight'`: «Kroppsvekt {n} kg · fra profilen», eller (mangler) «Legg inn kroppsvekt under Profil for å få den med i volumet» (dempet, `#94a3b8`).
- [ ] **Step 3: Tall i arket.**
  - Kolonneoverskrift: `kg` → «Vekt (kg)», `lbs` → «Vekt (lbs)», `bodyweight` → «Ekstra (kg)».
  - Placeholder i vektfeltet: forrige vekt bare når `getLastPerformance(...).weightUnit === activeUnit`, ellers «–».
  - Volum-kolonnen: `isSetLogged(ex, set) ? formatNumber(setVolume(ex, set)) : '–'`.
  - `lastPerformanceLabel` (vises både i lista og arket): som logget — «Sist 10×100 lbs», «Sist 8×KV + 10 kg», «Sist 8×KV», ellers «Sist 10×24kg» som i dag.
  - PB (`getHeaviestLift`) sammenligner `setProgressKg` og viser kg (`formatKg`-lik formattering, komma).
  - Quick view: beste sett og historikk via `setProgressKg`/`setWeightText`.
- [ ] **Step 4: Verifiser** `npm run type-check` → exit 0, `npm run build` → exit 0.

---

### Task 5: Visninger utenfor økta

**Files:**
- Modify: `src/views/SessionDetails.vue` (~l. 86–135, 392)
- Modify: `src/views/ExerciseDetail.vue` (`Performance` ~l. 37, `performances` ~l. 146, volum ~l. 302 og 343, `recentSessions` ~l. 360–380)
- Modify: `src/views/Exercises.vue` (~l. 76–77), `src/views/Stats.vue` (~l. 385)

**Interfaces:**
- Consumes: `setProgressKg`, `setLoadKg`, `setVolume`, `setWeightText` (Task 1).

- [ ] **Step 1: SessionDetails.** `previousBest`, «tyngste»-reduksjonen, `topWeight` og `nextHint` bruker `setProgressKg`. Settlista viser `setWeightText(set)` (malen slutter å legge til egen «kg»).
- [ ] **Step 2: ExerciseDetail.** `Performance` får `load: number` (= `setLoadKg`) ved siden av `weight` (= `setProgressKg`). Tyngste sett, PR-tavla, snittvekt og fremgangsgrafen bruker `weight`; volumberegningene (~l. 302, 343) bruker `load * reps`. `recentSessions`: topp via `setProgressKg`, volum via `setVolume`.
- [ ] **Step 3: 1RM.** `Exercises.vue` og `Stats.vue`: `set.reps === 1 && setProgressKg(ex, set) > 0` og maks av `setProgressKg`.
- [ ] **Step 4: Verifiser** `npm run type-check` → exit 0, `npm run build` → exit 0, begge selvsjekkene OK. Manuelt (Eivind): legg inn kroppsvekt i Profil; i en økt velg lbs på en maskin og se volum i kg; velg + kroppsvekt på pull-ups og logg et sett uten ekstravekt; fullfør og åpne øktdetaljene («KV», «45,4 kg»); åpne en gammel økt og se at den er uendret.
