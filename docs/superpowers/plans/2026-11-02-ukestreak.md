# Ukestreak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tell sammenhengende uker der alle ukesmål er nådd, vis streaken motiverende på uke-kortet på forsiden, og gi prestasjoner for 3/5/10/15/30 uker på rad.

**Architecture:** Målhistorikk lagres ved siden av målene i `user_metadata` (+ lokal speiling). All streak-logikk som kan være ren, ligger i en ny Vue-fri modul `goalStreak.ts` (testbar med Node). En ny composable `useGoalStreak` teller sett per uke i én gjennomgang av øktene og bruker den rene modulen. Forsiden og Statistikk leser fra composablen.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Supabase Auth `user_metadata`, Node 22 `--experimental-strip-types` for selvsjekk.

**Spec:** `docs/superpowers/specs/2026-11-02-ukestreak-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push (Eivinds regel). Commit-steg er utelatt.
- All UI-tekst på bokmål; kodekommentarer på engelsk.
- **Last `my-vue-style`-skillen før du endrer en `.vue`-fil.** Les `DESIGN.md` før UI-arbeid: ingen emoji, gradienter eller glød i grensesnittet (unntak: prestasjonsmerker), bruk bare fargene som står der.
- Ikke reformater hele filer; følg stilen i fila du endrer (dobbel-fnutter og semikolon i `useTrainingGoals.ts`/`useWeekStats.ts`/`TemplateSessions.vue`).
- Telleregler kun via `useSetMetrics` (`isSetCounted`, `setDuration`, `setDistance`, `isCardioExercise`) og muskelgruppe via `exerciseIndex` på id — aldri navn.
- Ingen database-/SQL-endring.
- `goalStreak.ts` får **bare** `import type`-importer, ellers kan ikke Node kjøre selvsjekken.
- Verifisering: `npm run type-check` skal være ren. Det finnes ingen testrunner; ren logikk sjekkes med et assert-skript i scratchpad.

## Review Focus

1. **Bytte konto på samme enhet:** forrige brukers målhistorikk skal ikke vises — nullstilles på samme måte som målene i hydreringen.
2. **Første maling / offline / bibliotek ikke lastet:** ingen «0 uker på rad» eller tom kjede som blinker før `exerciseIndex` er fylt — `ready`-porten.
3. **Entall:** «1 uke på rad», ikke «1 uker på rad», både i streak-blokken og i «Uka er i boks».
4. **Lagre mål når Supabase feiler:** historikken skal ligge lokalt og bli med i neste vellykkede `updateUser` (hele lista sendes hver gang).
5. **Kondisjonsplan (samboeren):** målboksen viser minutter/km-rader, ingen «sett»-sum, og km med desimalkomma («18,5»), ikke avrundet.

---

### Task 1: Ren streak-logikk (`goalStreak.ts`)

**Files:**
- Create: `src/composables/goalStreak.ts`
- Test: `<scratchpad>/check-goal-streak.ts` (utenfor repoet; prosjektet har ingen testrunner)

**Interfaces:**
- Consumes: `import type { TrainingGoals } from "./useTrainingGoals"`
- Produces:
  ```ts
  export const STREAK_MILESTONES = [3, 5, 10, 15, 30] as const;
  export const CHAIN_LENGTH = 10;
  export interface GoalHistoryEntry { from: string; goals: TrainingGoals } // from = "YYYY-MM-DD", mandag lokal tid
  export interface WeekTally { setsByGroup: Record<string, number>; cardioSeconds: number; cardioMetres: number }
  export type GoalGapKind = "strength" | "minutes" | "km";
  export interface GoalGap { name: string; kind: GoalGapKind; done: number; target: number; remaining: number }
  export interface WeekEvaluation { hasGoals: boolean; approved: boolean; progress: number; gaps: GoalGap[]; groupsMet: number; groupsTotal: number; remainingSets: number }
  export const weekKeyOf: (date: Date) => string;
  export const goalsForWeek: (history: GoalHistoryEntry[], current: TrainingGoals, key: string, currentKey: string) => TrainingGoals; // current week → `current` (endret etter gjennomgang)
  export const appendGoalHistory: (history: GoalHistoryEntry[], previous: TrainingGoals, next: TrainingGoals, key: string) => GoalHistoryEntry[];
  export const evaluateWeek: (tally: WeekTally, goals: TrainingGoals) => WeekEvaluation;
  export const streakFromWeeks: (approved: boolean[]) => { current: number; best: number };
  export const nextMilestone: (streak: number) => number | null;
  ```

- [ ] **Step 1: Skriv selvsjekken** `check-goal-streak.ts` i scratchpad. Importer fra `file:///C:/git_privat/lift-workout-app/src/composables/goalStreak.ts`, bruk `node:assert/strict`. Lag en `goals(sets, cardio = {0,0})`-hjelper med `planId: "custom"`, `sessionsPerWeek: 4`. Asserts:

  ```ts
  // weekKeyOf — local time, Monday-first
  equal(weekKeyOf(new Date(2026, 10, 8, 23, 30)), "2026-11-02"); // Sunday late
  equal(weekKeyOf(new Date(2026, 10, 9, 0, 10)), "2026-11-09");  // Monday early

  // evaluateWeek — every group on its own, not the total (spec example: 73/79 is not approved)
  const g = goals({ Bryst: 15, Rygg: 15, Ben: 15, Skuldre: 10, Biceps: 9, Triceps: 9, Kjerne: 6 });
  const e = evaluateWeek({ setsByGroup: { Bryst: 15, Rygg: 16, Ben: 11, Skuldre: 10, Biceps: 6, Triceps: 9, Kjerne: 6 }, cardioSeconds: 0, cardioMetres: 0 }, g);
  equal(e.approved, false);
  deepEqual(e.gaps.map((x) => [x.name, x.remaining]), [["Ben", 4], ["Biceps", 3]]);
  equal(e.remainingSets, 7); equal(e.groupsMet, 5); equal(e.groupsTotal, 7);
  ok(e.progress > 0 && e.progress < 1);
  // over-target groups don't make up for others (capped)
  equal(evaluateWeek({ setsByGroup: { Bryst: 40, Rygg: 0 }, cardioSeconds: 0, cardioMetres: 0 }, goals({ Bryst: 10, Rygg: 10 })).progress, 0.5);
  // all met → approved, progress exactly 1
  const full = evaluateWeek({ setsByGroup: { Bryst: 15 }, cardioSeconds: 0, cardioMetres: 0 }, goals({ Bryst: 15 }));
  equal(full.approved, true); equal(full.progress, 1); deepEqual(full.gaps, []);
  // cardio: both targets must be met; 0 target ignored; km keeps one decimal
  const c = evaluateWeek({ setsByGroup: {}, cardioSeconds: 150 * 60, cardioMetres: 18_540 }, goals({}, { minutesPerWeek: 150, kilometresPerWeek: 25 }));
  equal(c.approved, false); deepEqual(c.gaps.map((x) => [x.kind, x.done, x.remaining]), [["km", 18.5, 6.5]]); equal(c.remainingSets, 0);
  equal(evaluateWeek({ setsByGroup: {}, cardioSeconds: 9000, cardioMetres: 0 }, goals({}, { minutesPerWeek: 150, kilometresPerWeek: 0 })).approved, true);
  // no goals → never approved
  const none = evaluateWeek({ setsByGroup: { Bryst: 50 }, cardioSeconds: 0, cardioMetres: 0 }, { ...goals({ Bryst: 10 }), planId: "none" });
  equal(none.hasGoals, false); equal(none.approved, false);

  // streakFromWeeks — oldest → newest, last element is the current week
  deepEqual(streakFromWeeks([true, true, false, true, true, true]), { current: 3, best: 3 }); // current week approved: counts
  deepEqual(streakFromWeeks([true, true, true, false]), { current: 3, best: 3 });             // in-progress week doesn't break
  deepEqual(streakFromWeeks([true, true, true, true, false, true, false]), { current: 1, best: 4 });
  deepEqual(streakFromWeeks([false]), { current: 0, best: 0 });
  deepEqual(streakFromWeeks([]), { current: 0, best: 0 });

  // nextMilestone
  equal(nextMilestone(0), 3); equal(nextMilestone(6), 10); equal(nextMilestone(10), 15); equal(nextMilestone(30), null);

  // goalsForWeek
  const g15 = goals({ Bryst: 15 }), g18 = goals({ Bryst: 18 });
  const h = [{ from: "0000-01-01", goals: g15 }, { from: "2026-11-02", goals: g18 }];
  equal(goalsForWeek(h, g18, "2026-10-26"), g15);
  equal(goalsForWeek(h, g18, "2026-11-02"), g18);
  equal(goalsForWeek([{ from: "2026-11-02", goals: g18 }], g15, "2026-01-05"), g18); // before first entry → oldest
  equal(goalsForWeek([], g15, "2026-01-05"), g15);                                   // empty → fallback

  // appendGoalHistory
  deepEqual(appendGoalHistory([], g15, g18, "2026-11-02"), h);                      // first save seeds previous goals for all time before
  deepEqual(appendGoalHistory(h, g18, g15, "2026-11-02"), [h[0], { from: "2026-11-02", goals: g15 }]); // same week → replace
  deepEqual(appendGoalHistory([], { ...g15, planId: "none" }, g18, "2026-11-02"), [{ from: "2026-11-02", goals: g18 }]); // nothing to seed
  console.log("goalStreak OK");
  ```

- [ ] **Step 2: Kjør den og se at den feiler**
  Run: `node --experimental-strip-types <scratchpad>/check-goal-streak.ts`
  Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `goalStreak.ts`.

- [ ] **Step 3: Implementer `goalStreak.ts`** med signaturene over.
  - `weekKeyOf`: mandag 00:00 lokal tid (samme regel som `startOfIsoWeek`), formatert `YYYY-MM-DD` med lokale getters — ikke `toISOString` (UTC flytter datoen).
  - `goalsForWeek`: nyeste oppføring med `from <= key` (strengsammenligning); ingen slik → eldste; tom liste → `fallback`.
  - `appendGoalHistory`: returner ny liste. Tom historikk og `previous` har mål (samme test som `hasGoals` i evaluateWeek) → seed `{ from: "0000-01-01", goals: previous }` først. Deretter erstatt oppføring med samme `key`, ellers legg til; sortert på `from`.
  - `evaluateWeek`: `hasGoals = goals.planId !== "none" && (noen sett-mål > 0 || noen kondisjonsmål > 0)`. Gaps i rekkefølgen `Object.entries(goals.setsPerMuscleGroup)`, deretter `minutes`, så `km`. Minutter = `Math.round(sec / 60)`, km = `Math.round(m / 100) / 10` (samme som `cardioGoalProgress`); `remaining` for km avrundes til én desimal. `progress` = snitt av `Math.min(1, done / target)` over alle mål > 0 (0 uten mål). `approved = hasGoals && gaps.length === 0`. `groupsMet/groupsTotal` teller bare muskelgrupper; `remainingSets` summerer bare `strength`-gaps.
  - `streakFromWeeks`: siste element er inneværende uke. `current` = sammenhengende `true` bakfra, der et `false` i siste element hoppes over. `best` = lengste løp av `true`.

- [ ] **Step 4: Kjør selvsjekken**
  Run: `node --experimental-strip-types <scratchpad>/check-goal-streak.ts`
  Expected: `goalStreak OK`, exit 0. Kjør også `npm run type-check` → ingen feil.

---

### Task 2: Målhistorikk i `useTrainingGoals.ts`

**Files:**
- Modify: `src/composables/useTrainingGoals.ts` (StoredPayload/readFromStorage/writeToStorage ~l. 182–205, singleton-state ~l. 211–215, hydrering ~l. 230–250, `saveGoals` ~l. 290–316, return-objektet)

**Interfaces:**
- Consumes: `GoalHistoryEntry`, `weekKeyOf`, `appendGoalHistory` fra Task 1.
- Produces: `useTrainingGoals()` returnerer i tillegg `goalHistory: ComputedRef<GoalHistoryEntry[]>`. `saveGoals`-signaturen er uendret.

- [ ] **Step 1: Lagring.** Legg `history: GoalHistoryEntry[]` til `StoredPayload`; `writeToStorage(userId, goals, history)`. Legg til `normalizeHistory(raw: unknown): GoalHistoryEntry[]` ved `normalizeGoals`: dropper alt som ikke er `{ from: /^\d{4}-\d{2}-\d{2}$/, goals }`, kjører `normalizeGoals` på hver, sorterer på `from`. Ny singleton `_history = ref<GoalHistoryEntry[]>(initial.history)`.
- [ ] **Step 2: Hydrering.** Les `user_metadata.trainingGoalsHistory` via `normalizeHistory` sammen med `trainingGoals`. Remote finnes → bruk den. Annen konto uten remote → `_history.value = []` (Review Focus 1). Skriv begge til storage.
- [ ] **Step 3: `saveGoals`.** Før `_goals` overskrives: `const nextHistory = appendGoalHistory(_history.value, _goals.value, normalized, weekKeyOf(new Date()))`. Sett `_history`, skriv lokalt, og send `{ trainingGoals: normalized, trainingGoalsHistory: nextHistory }` i `updateUser`. Hele lista sendes hver gang, så en feilet sync tas igjen ved neste lagring (Review Focus 4).
- [ ] **Step 4: Verifiser.** `npm run type-check` → ingen feil. I appen: lagre mål i Profil → DevTools → `localStorage["lift-training-goals"]` har `history` med én oppføring for `2026-11-02` (pluss `0000-01-01`-seed hvis du hadde mål fra før). Lagre igjen samme uke → fortsatt samme antall oppføringer.

---

### Task 3: `useGoalStreak`-composable

**Files:**
- Create: `src/composables/useGoalStreak.ts`
- Test: ingen egen — Vue-avhengig, så den dekkes av type-check og den manuelle sjekken i Task 4. Logikken som kan feile, ligger i Task 1.

**Interfaces:**
- Consumes: `useHybridData()` (`sessions`, `exerciseIndex`), `useTrainingGoals()` (`goals`, `goalHistory`, `hasGoals`), `startOfIsoWeek` fra `useWeekStats`, Task 1-funksjonene, `useSetMetrics`.
- Produces:
  ```ts
  export interface ChainLink { key: string; approved: boolean; isCurrent: boolean; progress: number }
  export const useGoalStreak: () => {
    ready: ComputedRef<boolean>;          // exerciseIndex.size > 0
    current: ComputedRef<number>;
    best: ComputedRef<number>;
    nextMilestone: ComputedRef<number | null>;
    chain: ComputedRef<ChainLink[]>;      // alltid CHAIN_LENGTH ledd, eldst først, siste = inneværende uke
    thisWeek: ComputedRef<WeekEvaluation>;
    thisWeekKey: ComputedRef<string>;
  };
  ```

- [ ] **Step 1: Tally per uke.** Én `computed` som går gjennom fullførte økter én gang og bygger `Map<string, WeekTally>` med `weekKeyOf(new Date(s.date))`. Samme regler som `useWeekStats.muscleGroups`/`buildTotals`: for hvert `isSetCounted`-sett legg `setDuration`/`setDistance` til kondisjon; for ikke-kondisjonsøvelser som resolves via `exerciseIndex` til en annen kategori enn `CARDIO_GROUP_NAME`, tell `setsByGroup[category] += 1`.
- [ ] **Step 2: Uke-evaluering.** Iterer mandager fra den eldste av (første økts uke, inneværende uke − `CHAIN_LENGTH − 1` uker) til inneværende uke med `setDate(+7)` på `startOfIsoWeek`. For hver: `evaluateWeek(tally ?? tom, goalsForWeek(goalHistory, goals, key))`. Utled `current`/`best` med `streakFromWeeks`, `chain` = siste `CHAIN_LENGTH`, `thisWeek` = siste evaluering, `nextMilestone(current)`.
- [ ] **Step 3: Verifiser.** `npm run type-check` → ingen feil.

---

### Task 4: Uke-kortet på forsiden (`TemplateSessions.vue`)

**Files:**
- Modify: `src/views/TemplateSessions.vue` (script ~l. 211, template ~l. 263–344, scoped CSS etter `.week-card__goal-fill`)

**Interfaces:**
- Consumes: `useGoalStreak()` (Task 3), `hasGoals` og `MUSCLE_GROUP_COLORS` fra `useTrainingGoals`, `currentUser` fra `useHybridData`.

Last `my-vue-style` og les `DESIGN.md` først. Skissen for variant D ligger i spec-en under «Visning»; den er fasiten.

- [ ] **Step 1: Streak-blokk** mellom header og dagsporet, `v-if="hasGoals && streak.ready"`. Flamme = samme SVG-path som headerikonet på siden (oransje `#f97316`). Tekst:
  - `current > 0`: tall + `current === 1 ? "uke på rad" : "uker på rad"`.
  - `current === 0`: «Start en ny streak».
  - Metalinje: deler slått sammen med « · »: `Rekord ${best}` når `best > current`, `neste merke ved ${nextMilestone}` når den finnes. Ingen deler → ingen linje.
  - Kjeden: `CHAIN_LENGTH` like brede ledd (høyde 10px, gap 4px, radius 3px). Godkjent `#22c55e`, ikke godkjent `#1f2937`, inneværende uke ikke godkjent: spor `#0d1117` med kant `#f9731660` og oransje fyll `width: progress * 100 %`. `aria-label` på kjeden, f.eks. «6 av de siste 10 ukene nådd».
- [ ] **Step 2: Målboksen.** Ny gren først i kjeden: `v-if="hasGoals && streak.ready"`, deretter dagens `setsGoalProgress`/`cardioGoalProgress`-grener uendret (vises mens biblioteket laster), deretter totalene.
  - Ikke godkjent: tittel `current > 0 ? "Igjen for å holde streaken" : "Igjen for å nå ukesmålet"`, til høyre `<strong>{remainingSets}</strong> sett` bare når `remainingSets > 0`. Én rad per gap: prikk (`MUSCLE_GROUP_COLORS[name]`, `#06b6d4` for kondisjon), navn (`strength`: gruppenavn; `minutes`: «Kondisjon»; `km`: «Distanse»), `done / target` (+ « min»/« km»), og `«${remaining} igjen»` / `«${remaining} min igjen»` / `«${remaining} km igjen»` i `#fdba74`. Km formateres med `Intl.NumberFormat("no-NO", { maximumFractionDigits: 1 })` — ikke `formatNumber`, som avrunder. Under: `✓ ${groupsMet} av ${groupsTotal} muskelgrupper er nådd` i `#4ade80` når `groupsMet > 0`.
  - Godkjent: tonet grønn boks (`#16a34a1a` / kant `#16a34a50`), grønn hake-sirkel, «Uka er i boks — N uke(r) på rad» og «Alle mål nådd. Resten av uka er bonus.»
- [ ] **Step 3: Feiring.** Når `thisWeek.approved` blir true og `localStorage["lift-streak-celebrated"] !== \`${userId}:${thisWeekKey}\``: vis `current − 1`, bytt til `current` etter ~400 ms med en kort skala-«pop» på tallet og fargeovergang på siste ledd, og lagre nøkkelen. All `localStorage`-tilgang i try/catch. Under `prefers-reduced-motion: reduce` (sjekk med `matchMedia`, og slå av CSS-animasjonen i en `@media`-blokk): ingen animasjon, bare lagre nøkkelen.
- [ ] **Step 4: Verifiser.** `npm run type-check` → ingen feil. `npm run dev`, logg inn, og sjekk ved 390 px og 320 px: streak-blokk, kjede og målboks som i skissen D; entall ved streak 1; ingen «0» som blinker ved reload; en konto uten mål ser kortet som før.

---

### Task 5: Prestasjoner (`Stats.vue`) og dokumentasjon

**Files:**
- Modify: `src/views/Stats.vue` (`achievements`-computed ~l. 369–462)
- Modify: `CLAUDE.md:65`
- Modify: minnet `training-philosophy.md` (utenfor repoet)

**Interfaces:**
- Consumes: `useGoalStreak().best`, `useTrainingGoals().hasGoals`.

- [ ] **Step 1: Prestasjoner.** Før kondisjonsblokken: når `hasGoals`, `all.push(...)` fem merker med `earned: best >= n` (beste streak over hele historikken, uavhengig av årsfilteret):

  | id | icon | title | description |
  |---|---|---|---|
  | `goal-streak-3` | 🔥 | 3 uker på rad | Ukesmålet nådd tre uker på rad. |
  | `goal-streak-5` | 🔥 | 5 uker på rad | Fem uker på rad — nå er det en vane. |
  | `goal-streak-10` | ⭐ | 10 uker på rad | Ti uker på rad uten å slippe. |
  | `goal-streak-15` | 🌟 | 15 uker på rad | Femten uker på rad. Solid! |
  | `goal-streak-30` | 💎 | 30 uker på rad | Tretti uker på rad. Respekt. |

- [ ] **Step 2: CLAUDE.md.** Endre siste setning i linje 65 til: «Rest days are planned, so don't add daily streaks or "days in a row" mechanics. The weekly goal streak (`useGoalStreak`: consecutive weeks where every weekly target is met, judged against the goals that applied that week via the goal history in `user_metadata`) is the exception.»
- [ ] **Step 3: Minne.** Oppdater `training-philosophy.md`: ingen daglige streaks, men ukestreak mot ukesmålet er ønsket (2026-11-02).
- [ ] **Step 4: Verifiser.** `npm run type-check` → ingen feil. Statistikk → «Prestasjoner» viser de fem merkene; med streak ≥ 3 er «3 uker på rad» oppnådd og står først.
