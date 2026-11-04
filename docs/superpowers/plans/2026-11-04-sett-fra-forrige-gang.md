# Antall sett fra forrige gang — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En styrkeøvelse i en ny aktiv økt starter med like mange tomme sett som ble logget forrige gang (tre hvis aldri gjort), og de utfasede malfeltene `sets`/`reps`/`weight` fjernes.

**Architecture:** To rene hjelpere i `useSetMetrics.ts` (som eier regelen for når et sett teller) finner forrige logging og gir startantallet. Økt-start i `useSupabaseData`, «legg til øvelse» og «Sist …»-hintet i `WorkoutSession.vue` bruker dem.

**Tech Stack:** Vue 3, TypeScript, Node 22 `--experimental-strip-types` for selvsjekk.

**Spec:** `docs/superpowers/specs/2026-11-04-sett-fra-forrige-gang-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push. Commit-steg er utelatt.
- Kommentarer på engelsk. Følg stilen i hver fil (`useSetMetrics`/`useSupabaseData`: doble fnutter og semikolon; `WorkoutSession`/`TemplateForm`: enkle fnutter, ingen semikolon). Ingen omformatering, ingen flytting av SFC-blokker.
- Last `my-vue-style` før `.vue`-endringer.
- `useSetMetrics.ts` skal fortsatt bare ha `import type`, så selvsjekken kan kjøre fila direkte i Node.
- Kondisjon er uendret: én runde.
- Verifisering: selvsjekken i scratchpad + `npm run type-check`; til slutt `npm run build`.

## Review Focus

1. **Siste økt der øvelsen står uten tellende sett** (eldre data før opprydding): hoppes over; telles fra økta før.
2. **Aktiv (ikke fullført) økt med øvelsen:** teller ikke som «forrige gang».
3. **`date` som streng** (fra cache) og økter i usortert rekkefølge: nyeste etter dato vinner.
4. **«Sist 8×60kg» og antall sett** skal alltid vise til samme økt.
5. **Mal laget fra en økt og gamle maler med `sets`/`reps` i JSONB:** lagring og start fungerer; de gamle verdiene ignoreres.

---

### Task 1: Hjelperne i `useSetMetrics.ts`

**Files:**
- Modify: `src/composables/useSetMetrics.ts` (legg til nederst; utvid `import type` med `WorkoutSession`, `WorkoutExercise`)
- Test: `<scratchpad>/check-last-logged.ts`

**Interfaces:**
- Produces:
  ```ts
  export const DEFAULT_STRENGTH_SETS = 3;
  /** Most recent completed session in which the exercise has at least one counted set. */
  export const findLastLogged: (sessions: WorkoutSession[], exerciseId: number) => { session: WorkoutSession; exercise: WorkoutExercise } | null;
  /** Empty sets a strength exercise starts with: as many as were counted last time, else DEFAULT_STRENGTH_SETS. */
  export const startingSetCount: (sessions: WorkoutSession[], exerciseId: number) => number;
  ```

- [ ] **Step 1: Skriv selvsjekken** (importerer `useSetMetrics.ts` med absolutt sti og `.ts`):
  ```ts
  // helpers
  const set = (reps: number, weight = 50) => ({ id: "s", reps, weight, isCompleted: true });
  const empty = () => ({ id: "e", reps: 0, weight: 0, isCompleted: false });
  const session = (id: string, date: string, exercises: any[], isCompleted = true) => ({ id, templateId: "t", templateName: "T", date, duration: 0, exercises, isCompleted });
  const ex = (exerciseId: number, sets: any[]) => ({ exerciseId, name: "X", sets });

  assert(startingSetCount([], 7) === 3);                                                         // never done
  assert(startingSetCount([session("a", "2026-11-01", [ex(7, [set(8), set(8), set(8), set(8)])])], 7) === 4);
  assert(startingSetCount([session("a", "2026-11-01", [ex(7, [set(8), set(8), empty()])])], 7) === 2); // only counted sets
  // newest by date wins, regardless of array order; dates may be strings
  const older = session("old", "2026-10-01", [ex(7, [set(8), set(8), set(8), set(8), set(8)])]);
  const newer = session("new", "2026-11-01", [ex(7, [set(8), set(8)])]);
  assert(startingSetCount([older, newer], 7) === 2);
  assert(findLastLogged([older, newer], 7)?.session.id === "new");
  // newest has the exercise with no counted set → skip to the one before
  assert(startingSetCount([older, session("n", "2026-11-02", [ex(7, [empty()])])], 7) === 5);
  // an active session doesn't count
  assert(startingSetCount([older, session("act", "2026-11-03", [ex(7, [set(8)])], false)], 7) === 5);
  // other exercise ids don't match
  assert(startingSetCount([session("a", "2026-11-01", [ex(8, [set(8)])])], 7) === 3);
  ```
- [ ] **Step 2: Kjør den og se den feile.** `node --experimental-strip-types <scratchpad>/check-last-logged.ts` → feiler (eksportene finnes ikke).
- [ ] **Step 3: Implementer** hjelperne. Fullførte økter sortert synkende på `new Date(date).getTime()`; første der øvelsen (samme `exerciseId`) har minst ett `isSetCounted`-sett. `startingSetCount` teller de tellende settene der.
- [ ] **Step 4: Kjør selvsjekken.** Forventet: alle påstander OK. `npm run type-check` → ren.

### Task 2: Bruk hjelperne ved økt-start, ny øvelse og «Sist …»

**Files:**
- Modify: `src/composables/useSupabaseData.ts:1003` (`startWorkoutSession`)
- Modify: `src/views/WorkoutSession.vue:1254` (`addExerciseToSession`) og `getLastPerformance` (~1461–1505)

**Interfaces:**
- Consumes: `findLastLogged`, `startingSetCount` fra Task 1.

- [ ] **Step 1:** Begge stedene: antall sett = `1` for kondisjon, ellers `startingSetCount(<fullførte økter i store>, exerciseId)`; settene lages som før (samme id-mønster `set-<seed>-<exerciseIndex>-<setIndex>`, samme feltverdier). I `useSupabaseData` brukes `sessions.value`; i `WorkoutSession.vue` `workoutData.sessions.value`.
- [ ] **Step 2:** `getLastPerformance`: erstatt løkka med `findLastLogged(workoutData.sessions.value, exerciseId)`; resten (kondisjonsoppsummering, siste tellende sett for styrke) er uendret.
- [ ] **Step 3: Verifiser.** Selvsjekken igjen + `npm run type-check` → ren. `grep -n "\[0, 1, 2\]" src/composables/useSupabaseData.ts src/views/WorkoutSession.vue` → ingen treff.

### Task 3: Fjern malfeltene `sets`, `reps`, `weight`

**Files:**
- Modify: `src/types/workout.ts` (`ExerciseTemplate` 68–74)
- Modify: `src/views/TemplateForm.vue` (36–39, 58–62, 238–241)

- [ ] **Step 1:** `ExerciseTemplate = { exerciseId: number; name: string }`. Fjern feltene der malskjemaet lager øvelser (ny rad, valgt øvelse, mal fra økt) og kommentaren om «3 sets / 10 reps».
- [ ] **Step 2: Verifiser.** `npm run type-check` og `npm run build` → rene. `grep -rn "sets: 0\|reps: 10\|reps: 0" src/views/TemplateForm.vue` → ingen treff.

### Avslutning

- [ ] Én avsluttende gjennomgang av hele diffen med en fersk agent, med Review Focus som sjekkliste.
- [ ] Sjekkliste til Eivind: start en mal der en øvelse sist hadde 4 sett og en annen 2; legg til en øvelse midt i økta; en øvelse du aldri har gjort; en kondisjonsøvelse; lag mal fra en økt og lagre.
