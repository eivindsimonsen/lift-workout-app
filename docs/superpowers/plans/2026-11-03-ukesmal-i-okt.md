# Ukesmålet i den aktive økta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vis live søyler for ukesmålet til muskelgruppene (og kondisjonsmålene) i den aktive økta, i oppsummeringsboksen nederst i `WorkoutSession.vue`.

**Architecture:** En ren funksjon `sessionGoalRows` i `goalStreak.ts` lager radene fra «før økta»-tally, «i dag»-tally, øktas grupper og målene. `useGoalStreak` deler ut telle-hjelperen for én økt og inneværende ukes tally. `WorkoutSession.vue` teller seg selv live og tegner søylene.

**Tech Stack:** Vue 3, TypeScript, Node 22 `--experimental-strip-types` for selvsjekk.

**Spec:** `docs/superpowers/specs/2026-11-03-ukesmal-i-okt-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push. Commit-steg er utelatt.
- UI-tekst på bokmål, kommentarer på engelsk. Følg stilen i fila (`WorkoutSession.vue`: enkle fnutter, ingen semikolon).
- Last `my-vue-style` før `.vue`-endringer. `WorkoutSession.vue` har template før script — **ikke flytt blokkene** (CLAUDE.md: ingen reformatering av hele filer); nevn avviket for Eivind.
- Les `DESIGN.md` → «Søyler»: spor `#0d1117`, høyde 0.3125–0.5rem, rett start, 4 px avrunding i enden. Ingen nye hex-verdier: «i dag»-delen er samme farge med redusert opasitet.
- Telleregler kun via `useSetMetrics` og `exerciseIndex` på id (samme som streaken).
- `goalStreak.ts` får fortsatt bare `import type`.
- Verifisering: selvsjekken i scratchpad + `npm run type-check` + `npm run build`.

## Review Focus

1. **Økt startet forrige uke og fortsatt aktiv:** seksjonen skjules (den teller i forrige uke).
2. **Ingen mål / biblioteket ikke lastet:** seksjonen vises ikke, og flisene ser ut som før.
3. **Øvelse som ikke resolves (slettet fra biblioteket):** ignoreres uten feil.
4. **Kondisjonsbruker uten styrkemål i en styrkeøkt:** ingen seksjon. I kondisjonsøkt: bare minutter/km-rader.
5. **Sett som avhakes eller slettes:** tallene går ned igjen live.

---

### Task 1: `sessionGoalRows` (ren logikk)

**Files:**
- Modify: `src/composables/goalStreak.ts` (legg til etter `evaluateWeek`)
- Test: `<scratchpad>/check-goal-streak.ts` (utvid)

**Interfaces:**
- Produces:
  ```ts
  export interface SessionGoalRow {
    name: string;            // muskelgruppe, «Kondisjon» eller «Distanse»
    kind: GoalGapKind;
    before: number;          // gjort i uka før økta
    today: number;           // gjort i økta
    target: number;
    met: boolean;            // fra evaluateWeek på summen
    beforeShare: number;     // 0..1, min(before, target) / target
    todayShare: number;      // 0..1, synlig del av i dag; beforeShare + todayShare ≤ 1
  }
  export const sessionGoalRows: (before: WeekTally, today: WeekTally, groups: string[], hasCardio: boolean, goals: TrainingGoals) => SessionGoalRow[];
  ```

- [ ] **Step 1: Utvid selvsjekken** (før `console.log`):
  ```ts
  const tally = (sets: Record<string, number>, sec = 0, m = 0) => ({ setsByGroup: sets, cardioSeconds: sec, cardioMetres: m });
  const pushGoals = goals({ Bryst: 15, Skuldre: 10, Triceps: 9, Biceps: 9 });
  // groups from the session in order; no target → left out; Biceps not in the session → left out
  const rows = sessionGoalRows(tally({ Bryst: 9, Skuldre: 4, Triceps: 7, Biceps: 3 }), tally({ Bryst: 2, Triceps: 2 }), ["Bryst", "Skuldre", "Triceps", "Kjerne"], false, pushGoals);
  deepEqual(rows.map((r) => [r.name, r.before, r.today, r.target, r.met]), [["Bryst", 9, 2, 15, false], ["Skuldre", 4, 0, 10, false], ["Triceps", 7, 2, 9, true]]);
  // shares capped at the target
  const over = sessionGoalRows(tally({ Bryst: 14 }), tally({ Bryst: 3 }), ["Bryst"], false, goals({ Bryst: 15 }))[0];
  ok(Math.abs(over.beforeShare - 14 / 15) < 1e-9 && Math.abs(over.todayShare - 1 / 15) < 1e-9 && over.met);
  const already = sessionGoalRows(tally({ Bryst: 16 }), tally({ Bryst: 2 }), ["Bryst"], false, goals({ Bryst: 15 }))[0];
  deepEqual([already.beforeShare, already.todayShare], [1, 0]);
  // cardio rows only when the session has cardio and the target is set; km keeps one decimal
  const cg = goals({}, { minutesPerWeek: 150, kilometresPerWeek: 25 });
  const cr = sessionGoalRows(tally({}, 3600, 10_000), tally({}, 1800, 5_540), [], true, cg);
  deepEqual(cr.map((r) => [r.kind, r.before, r.today, r.target, r.met]), [["minutes", 60, 30, 150, false], ["km", 10, 5.5, 25, false]]);
  deepEqual(sessionGoalRows(tally({}, 3600), tally({}, 1800), [], false, cg), []);
  // no goals → no rows
  deepEqual(sessionGoalRows(tally({ Bryst: 1 }), tally({ Bryst: 1 }), ["Bryst"], false, { ...pushGoals, planId: "none" as any }), []);
  ```
- [ ] **Step 2: Kjør** `node --experimental-strip-types <scratchpad>/check-goal-streak.ts` → Expected: FAIL, `sessionGoalRows` finnes ikke (SyntaxError på import).
- [ ] **Step 3: Implementer** `sessionGoalRows` i `goalStreak.ts`. Tom liste når `!hasAnyTarget(goals)`. Styrkerader for hver gruppe i `groups` med mål > 0; deretter `minutes` og `km` når `hasCardio` og målet > 0. Kondisjon: `total` med samme avrunding som `evaluateWeek` på summen av tallyene, `before` avrundet på samme måte, `today = total − before` (km avrundet til én desimal). `met` = ingen gap med samme `kind` og `name` i `evaluateWeek(sum av tallyene, goals).gaps`.
- [ ] **Step 4: Kjør** selvsjekken → `goalStreak OK`; `npm run type-check` → exit 0.

---

### Task 2: Del telle-hjelperen og ukas tally i `useGoalStreak.ts`

**Files:**
- Modify: `src/composables/useGoalStreak.ts`

**Interfaces:**
- Produces:
  ```ts
  export const emptyTally: () => WeekTally;
  /** Adds a session's counted sets to `tally` — the one counting rule the streak and the live session share. */
  export const addSessionToTally: (tally: WeekTally, session: Pick<WorkoutSession, "exercises">, index: Map<number, ExerciseIndexEntry>) => void;
  // useGoalStreak() returnerer i tillegg:
  thisWeekTally: ComputedRef<WeekTally>; // fullførte økter i inneværende uke (tom tally hvis ingen)
  ```

- [ ] **Step 1:** Flytt den indre løkka i `tallies` ut som `addSessionToTally` (uendret logikk), eksporter `emptyTally`, og la `tallies` kalle hjelperen. Legg til `thisWeekTally` = `tallies.get(thisWeekKey) ?? emptyTally()`.
- [ ] **Step 2: Verifiser** `npm run type-check` → exit 0, og selvsjekken er fortsatt `goalStreak OK`.

---

### Task 3: Seksjonen «Ukesmålet» i `WorkoutSession.vue`

**Files:**
- Modify: `src/views/WorkoutSession.vue` (oppsummeringsboksen ~l. 289–300, script ved `summaryTiles` ~l. 905–930, scoped CSS)

**Interfaces:**
- Consumes: `useGoalStreak()` → `ready`, `thisWeekTally`, `thisWeekKey`; `addSessionToTally`, `emptyTally` (Task 2); `sessionGoalRows`, `weekKeyOf` (Task 1); `useTrainingGoals()` → `goals`, `hasGoals`; `MUSCLE_GROUP_COLORS`, `CARDIO_GROUP_NAME`.

- [ ] **Step 1: Script.** Ved `summaryTiles`:
  - `sessionGroups`: unike kategorier, i rekkefølgen de først dukker opp, for styrkeøvelser i `session.value.exercises` som resolves via `workoutData.exerciseIndex.value` og ikke er `CARDIO_GROUP_NAME`. (Bruk `workoutData.exerciseIndex`, ikke destrukturering — `exerciseIndex` er allerede et løkkenavn i templaten.)
  - `hasCardioInSession`: `session.value.exercises.some(isCardioExercise)`.
  - `goalRows = computed(...)`: `[]` når `!hasGoals || !ready || !session.value || weekKeyOf(new Date(session.value.date)) !== thisWeekKey`; ellers `sessionGoalRows(thisWeekTally, todayTally, sessionGroups, hasCardioInSession, goals)` der `todayTally` bygges med `addSessionToTally(emptyTally(), session.value, index)`.
  - `allGoalsMet = goalRows.length > 0 && goalRows.every((r) => r.met)`.
  - `goalRowValue(row)`: «`${before + today} / ${target}`» + « min»/« km»; km med `Intl.NumberFormat('no-NO', { maximumFractionDigits: 1 })`; « ✓» når `met`.
  - `goalRowColor(row)`: `MUSCLE_GROUP_COLORS[name] ?? '#64748b'` for styrke, `'#06b6d4'` for kondisjon.
  - Navneliste for alt nådd: «A», «A og B», «A, B og C».
- [ ] **Step 2: Template.** I boksen, etter flis-rutenettet, `v-if="goalRows.length"`: en del med `margin-top`/`padding-top` og `border-top` i boksens kantfarge.
  - `allGoalsMet`: én linje i `#4ade80`: «✓ Ukesmålet er nådd for {navneliste}».
  - Ellers: tittel «Ukesmålet» (0.6875rem / 600, versaler, `#64748b`), så én rad per `row` i et rutenett med tre kolonner: navn (`#f1f5f9`, 600) · søyle · verdi (høyrejustert, `tabular-nums`, `#cbd5e1`, eller `#4ade80` når `met`). Søylen: spor `#0d1117`, høyde 0.375rem, `border-radius: 0 4px 4px 0`, `overflow: hidden`; to segmenter i `goalRowColor`: før `width: beforeShare*100%`, i dag `left: beforeShare*100%; width: todayShare*100%; opacity: 0.5`.
- [ ] **Step 3: Verifiser** `npm run type-check` → exit 0, `npm run build` → exit 0. Manuelt (Eivind, krever innlogging): start en push-økt, logg et brystsett, og se at Bryst-søylen vokser med en lysere del og at tallet øker; avhak settet igjen og se det gå tilbake; legg til en bicepsøvelse og se Biceps-raden dukke opp.
