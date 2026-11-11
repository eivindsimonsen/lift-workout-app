# Malfliser på forsiden — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Malene på forsiden vises som fliser i et rutenett. Hver flis viser snittvolum og hva økta gir mot ukesmålet, og et trykk åpner et ark med detaljene. Flisene sorteres ved å dra. Lista over hva som gjenstår, fjernes fra ukekortet.

**Architecture:** Regnestykkene ligger i en ren modul, `templateStats.ts`, som bare har type-imports og verdier fra `useSetMetrics`/`goalStreak`. Den beskriver historikk per mal, typen styrke/kondisjon, «sist trent», anslaget for neste økt og målradene. Composablen `useTemplateStats` bygger én `Map` med tall per mal for hele forsiden. `TemplateCard.vue` tegnes om til en flis, og `TemplateSheet.vue` er det nye arket. Den nye `useGridReorder.ts` drar i rutenettet. `TemplateSessions.vue` kobler sammen alt dette og rydder i ukekortet.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript og Vite. Selvsjekkene bundles med esbuild (ligger i `node_modules`) og kjøres i Node 22.

**Spec:** `docs/superpowers/specs/2026-11-11-malfliser-design.md`

## Global Constraints

- **Git og stil:**
  - Ikke commit, stage, branch eller push (Eivinds regel). Commit-stegene fra skill-malen er fjernet.
  - Kommentarer på engelsk, UI-tekst på bokmål.
  - Last `my-vue-style` før endringer i `.vue`. Ikke omformater hele filer.
- **Ikke rør** `useLongPressReorder.ts`, `TemplateForm.vue` og `WorkoutSession.vue`.
- **Bare farger fra `DESIGN.md`:**
  - panel `#111827` med kant `#1f2937`, innfelt `#0d1117`;
  - ark `#1a2233` med kant `#2d3a4f`, felt `#243044` med kant `#3d5068`;
  - tekst `#f1f5f9`, `#cbd5e1`, `#94a3b8` og `#64748b`;
  - tonet oransje tekst `#fdba74`, grønn `#4ade80`, cyan `#06b6d4`, grå mal `#475569`.
  - Muskelgruppefargene kommer fra `MUSCLE_GROUP_COLORS`.
- **Tall:**
  - Formateres med `Intl` `no-NO`.
  - Volum regnes alltid med `setVolume` på sett som `isSetCounted`, aldri `weight * reps`.
  - Kilo og minutter står aldri i samme tall.
- **Telefonen først:** sjekk 390px og 320px, og hold trykkflatene på minst 44px.
- **Selvsjekk** (absolutte importstier `c:/git_privat/lift-workout-app/src/...` i sjekkfila):
  `npx esbuild <scratchpad>/<sjekk>.ts --bundle --platform=node --format=esm --log-level=warning --outfile=<scratchpad>/<sjekk>.mjs && node <scratchpad>/<sjekk>.mjs`
- **Verifisering:** selvsjekk og `npm run type-check` etter hver task, og `npm run build` til slutt.

## Review Focus

1. **Mal som aldri er kjørt.** Forventet: «–», «ikke trent ennå», typen fra biblioteket, og ingen `NaN` eller deling på 0. Dekkes av sjekk i Task 1, steg 1 (`never`, `templateKindFromLibrary`).
2. **Kondisjonsmal (samboeren).** Forventet: minutter og km, ikke kilo. Radene heter «Kondisjon» og «Distanse», oppsummeringen er «+38 min · +6,2 km», og en kondisjonsøvelse som aldri er logget gir ingen oppsummering. Dekkes av Task 1, steg 1 (`run`, `fresh`).
3. **«✓» betyr nådd nå, før økta.** En gruppe som først blir nådd av økta (Skuldre 6/9 + 3), skal ikke få ✓. Dekkes av Task 1, steg 1 (`push`-raden Skuldre).
4. **Snittet** gjelder bare fullførte økter og bare de 8 siste, med lbs omregnet. Dekkes av Task 1, steg 1 (`push`, `lbs`).
5. **Dra, trykk og start skal ikke blandes.** Et langt trykk drar, et kort trykk åpner arket, og startknappen starter. Klikket etter en dragning gjør ingenting, og flisa settes inn (den bytter ikke). Dekkes av Task 2, steg 1 (`moveItem`, `hitTestIndex`), og manuelt i sjekklista til slutt.

---

### Task 1: `templateStats.ts` — tallene per mal

**Files:**
- Create: `src/composables/templateStats.ts`
- Test: `<scratchpad>/check-template-stats.ts`

**Interfaces:**
- Consumes:
  - `setVolume`, `setDuration`, `setDistance`, `isSetCounted`, `isCardioExercise`, `DEFAULT_STRENGTH_SETS` og `type LastLogged` fra `./useSetMetrics`;
  - `sessionGoalRows`, `type WeekTally` og `type GoalGapKind` fra `./goalStreak`;
  - `import type { TrainingGoals } from "./useTrainingGoals"`.
- Produces:
  ```ts
  export type TemplateKind = "strength" | "cardio" | "mixed";
  export const AVERAGE_OVER = 8;
  export type LibraryEntry = { category: string; trackingType: ExerciseTrackingType };

  export interface TemplateHistory {
    count: number;              // completed sessions from the template
    lastDate: Date;             // newest of them
    kind: TemplateKind | null;  // what the last AVERAGE_OVER held; null if none held a counted set
    avgVolumeKg: number;        // mean per session of Σ setVolume over counted sets
    avgMinutes: number;         // mean session.duration
    avgCardioSeconds: number;   // mean Σ setDuration over counted sets
    avgCardioMetres: number;    // mean Σ setDistance over counted sets
  }
  /** One pass; only templates with ≥1 completed session get an entry. */
  export const templateHistories: (sessions: WorkoutSession[]) => Map<string, TemplateHistory>;

  /** null while the index is empty; unresolved ids ignored; all resolved cardio → "cardio", some → "mixed", else "strength". */
  export const templateKindFromLibrary: (template: WorkoutTemplate, index: Map<number, LibraryEntry>) => TemplateKind | null;

  /** "i dag", "i går", weekday 2–6 days back ("mandag"), else Intl no-NO { day: "numeric", month: "short" }. Calendar days, local time. */
  export const lastTrainedLabel: (date: Date, now: Date) => string;

  export interface TemplateEstimate {
    tally: WeekTally;     // the session the template would start as
    groups: string[];     // strength categories, first-appearance order, CARDIO_GROUP_NAME excluded
    hasCardio: boolean;
    strengthSets: number; // Σ starting sets for strength exercises
  }
  export const templateEstimate: (template: WorkoutTemplate, index: Map<number, LibraryEntry>, lastLogged: Map<number, LastLogged>) => TemplateEstimate;

  export interface TemplateGoalRow { name: string; kind: GoalGapKind; done: number; target: number; metNow: boolean; add: number }
  export interface TemplateGoalPlan { rows: TemplateGoalRow[]; addSets: number; addMinutes: number; addKm: number; allMetNow: boolean; summary: string | null }
  /** null when sessionGoalRows gives no rows (no goals, or no group in the template has a target). */
  export const templateGoalPlan: (estimate: TemplateEstimate, week: WeekTally, goals: TrainingGoals) => TemplateGoalPlan | null;
  ```

**Regler som signaturen ikke avgjør:**
- **Anslaget:**
  - En styrkeøvelse bidrar med antall tellende sett i `lastLogged`, og med `DEFAULT_STRENGTH_SETS` hvis den mangler der. Det er samme regel som `startingSetCount`.
  - En kondisjonsøvelse bidrar med Σ `setDuration`/`setDistance` over tellende sett i `lastLogged`, eller 0.
  - Id-er som ikke finnes i `index`, hoppes over.
- **Radene:** `rows` hentes fra `sessionGoalRows(week, estimate.tally, estimate.groups, estimate.hasCardio, goals)`:
  - `done = before`;
  - `metNow = before >= target`, ikke `row.met`, som gjelder etter økta;
  - `add = todayShare * target`, avrundet til heltall, og til én desimal for `km`.
- **Summene:** `addSets` er summen av styrkeradene. `addMinutes` og `addKm` kommer fra radene av den typen, ellers 0. `allMetNow` betyr at hver rad har `metNow`.
- **`summary`:**
  - Bare `addSets` > 0 gir `` `+${addSets} sett mot målet` ``.
  - Flere deler (`+9 sett`, `+38 min`, `+6,2 km`, km med `no-NO`) settes sammen med « · ».
  - Ingen deler og `allMetNow` gir `"✓ Nådd denne uken"`.
  - Ellers er `summary` `null`.

- [ ] **Step 1: Skriv selvsjekken.**
  - Lag økter med hjelpere: `set({...})` med `isCompleted: true` som standard, `strength(id, sets)` og `cardio(id, sets)` med `trackingType`, og `session(templateId, date, exercises, { isCompleted?, duration? })`.
  - `tpl(ids)` lager en `WorkoutTemplate` med de øvelses-id-ene.
  - `index` er et `Map<number, LibraryEntry>`, og `lastLogged` kommer fra `lastLoggedByExercise`, som importeres fra `useSetMetrics`.
  - I dataene under er `now = new Date(2026, 10, 11, 12)`.
  ```ts
  // History
  // push: 10 completed sessions Nov 1–10, 1 set each; Nov 1–2 at 50 kg × 10, Nov 3–10 at 100 kg × 10; plus an incomplete one Nov 11 at 200 kg
  const h = templateHistories(sessions);
  assert.equal(h.get("push")!.count, 10);
  assert.equal(h.get("push")!.avgVolumeKg, 1000);                 // only the last 8, incomplete ignored
  assert.equal(h.get("push")!.lastDate.getDate(), 10);
  assert.equal(h.get("push")!.kind, "strength");
  assert.ok(Math.abs(h.get("lbs")!.avgVolumeKg - 453.59237) < 0.01); // 100 lbs × 10
  assert.deepEqual([h.get("run")!.kind, h.get("run")!.avgCardioSeconds, h.get("run")!.avgCardioMetres, h.get("run")!.avgVolumeKg], ["cardio", 2340, 6100, 0]); // (2280,6200) and (2400,6000)
  assert.equal(h.get("mix")!.kind, "mixed");
  assert.equal(h.has("never"), false);

  // Library kind — index: 1 Bryst, 2 Bryst, 3 Skuldre, 4 Triceps, 5 Ben, 7 Skuldre (strength); 6, 8 Kondisjon (cardio); 9 Kjerne
  assert.equal(templateKindFromLibrary(tpl([1]), index), "strength");
  assert.equal(templateKindFromLibrary(tpl([6]), index), "cardio");
  assert.equal(templateKindFromLibrary(tpl([1, 6]), index), "mixed");
  assert.equal(templateKindFromLibrary(tpl([99]), index), "strength");
  assert.equal(templateKindFromLibrary(tpl([1]), new Map()), null);

  // Last trained
  assert.equal(lastTrainedLabel(new Date(2026, 10, 11, 8), now), "i dag");
  assert.equal(lastTrainedLabel(new Date(2026, 10, 10, 23), now), "i går");
  assert.equal(lastTrainedLabel(new Date(2026, 10, 9, 7), now), "mandag");
  assert.equal(lastTrainedLabel(new Date(2026, 10, 5, 18), now), "torsdag");
  const d = new Date(2026, 10, 4, 18);
  assert.equal(lastTrainedLabel(d, now), new Intl.DateTimeFormat("no-NO", { day: "numeric", month: "short" }).format(d));

  // Estimate + goal plan — lastLogged = lastLoggedByExercise([one session: ex 1–5 with 3 counted sets each
  // (ex 1 also has one isCompleted:false set), ex 6 cardio { duration: 2280, distance: 6200 }])
  const goals = { planId: "custom", sessionsPerWeek: 0, setsPerMuscleGroup: { Ben: 12, Bryst: 15, Skuldre: 9, Triceps: 6 }, cardio: { minutesPerWeek: 60, kilometresPerWeek: 15 } };
  const week = { setsByGroup: { Ben: 12, Bryst: 6, Skuldre: 6, Triceps: 6 }, cardioSeconds: 1320, cardioMetres: 4100 };
  const push = templateEstimate(tpl([1, 2, 3, 4, 7]), index, lastLogged);    // 7 never logged → 3
  assert.deepEqual(push.groups, ["Bryst", "Skuldre", "Triceps"]);
  assert.deepEqual(push.tally.setsByGroup, { Bryst: 6, Skuldre: 6, Triceps: 3 });
  assert.equal(push.strengthSets, 15);
  const pp = templateGoalPlan(push, week, goals)!;
  assert.deepEqual(pp.rows.map((r) => [r.name, r.done, r.target, r.metNow, r.add]),
    [["Bryst", 6, 15, false, 6], ["Skuldre", 6, 9, false, 3], ["Triceps", 6, 6, true, 0]]);
  assert.equal(pp.addSets, 9);
  assert.equal(pp.summary, "+9 sett mot målet");
  const legs = templateGoalPlan(templateEstimate(tpl([5]), index, lastLogged), week, goals)!;
  assert.deepEqual([legs.addSets, legs.allMetNow, legs.summary], [0, true, "✓ Nådd denne uken"]);
  const run = templateGoalPlan(templateEstimate(tpl([6]), index, lastLogged), week, goals)!;
  assert.deepEqual(run.rows.map((r) => [r.name, r.done, r.target, r.add]), [["Kondisjon", 22, 60, 38], ["Distanse", 4.1, 15, 6.2]]);
  assert.equal(run.summary, "+38 min · +6,2 km");
  const fresh = templateGoalPlan(templateEstimate(tpl([8]), index, lastLogged), week, goals)!; // cardio never logged
  assert.equal(fresh.summary, null);
  assert.equal(templateGoalPlan(templateEstimate(tpl([9]), index, lastLogged), week, goals), null); // Kjerne has no target
  assert.equal(templateGoalPlan(push, week, { ...goals, planId: "none" }), null);
  ```
- [ ] **Step 2:** Kjør selvsjekken. Forventet: FAIL, fordi esbuild ikke finner `templateStats`.
- [ ] **Step 3:** Implementer `src/composables/templateStats.ts` etter signaturene og reglene over. Toppkommentaren skal si at fila bare har type-imports pluss rene moduler, slik at den kan sjekkes utenfor Vite.
- [ ] **Step 4:** Kjør selvsjekken (forventet OK) og `npm run type-check` (forventet ren).

### Task 2: `useGridReorder.ts` — dra i rutenettet

**Files:**
- Create: `src/composables/useGridReorder.ts`
- Test: `<scratchpad>/check-grid-reorder.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface GridReorderOptions {
    getItems: () => unknown[] | null | undefined; // reordered in place
    gridEl: Ref<HTMLElement | null>;             // direct children are the items; must be position: relative
    onReordered?: () => void;
    longPressMs?: number;                         // default 400
  }
  export type Box = { left: number; top: number; width: number; height: number };
  /** Index of the box containing (x, y), skipping `skip`; null over a gap, outside, or over itself. */
  export const hitTestIndex: (x: number, y: number, boxes: Box[], skip: number) => number | null;
  /** Insert move: the item at `from` ends up at `to`, the ones between shift one step. In place. */
  export const moveItem: <T>(items: T[], from: number, to: number) => void;
  export const useGridReorder: (options: GridReorderOptions) => {
    draggingIndex: Ref<number | null>;
    dragX: Ref<number>;
    dragY: Ref<number>; // translate for the dragged item
    onItemPointerDown: (event: PointerEvent, index: number) => void;
    consumeClickSuppression: () => boolean;
  };
  ```

**Algoritmen:**
- **Langt trykk:** samme regler og konstanter som `useLongPressReorder`:
  - 400 ms trykk før dragningen starter;
  - mer enn 8 px bevegelse før det avbryter;
  - `touchmove` med `preventDefault` mens man drar;
  - klikket etter en dragning svelges;
  - `vibrate(30)` ved start og `vibrate(15)` ved slutt;
  - lytterne legges på i `onMounted` og fjernes i `onUnmounted`.
- **Ved start:** lagre `grabX/grabY`, altså pekerens posisjon minus elementets `offsetLeft/offsetTop` og rutenettets `getBoundingClientRect()`. `offset*` påvirkes ikke av `transform`.
- **Ved hver bevegelse:**
  - Pekeren i rutenettets koordinater er `px = clientX - gridRect.left` og `py = clientY - gridRect.top`.
  - `dragX = px - grabX - el.offsetLeft` og `dragY = py - grabY - el.offsetTop`.
  - `hitTestIndex(px, py, <offset-boksene til barna>, draggingIndex)` gir målet `t`. Ved treff: `moveItem(items, i, t)`, `draggingIndex = t`, og etter `nextTick` regnes `dragX/dragY` på nytt med den nye `offsetLeft/Top`, så flisa blir under fingeren.

- [ ] **Step 1: Skriv selvsjekken.**
  ```ts
  const boxes = [{ left: 0, top: 0, width: 100, height: 100 }, { left: 108, top: 0, width: 100, height: 100 },
                 { left: 0, top: 108, width: 100, height: 150 }, { left: 108, top: 108, width: 100, height: 150 }];
  assert.equal(hitTestIndex(150, 50, boxes, 0), 1);
  assert.equal(hitTestIndex(50, 50, boxes, 0), null);   // over itself
  assert.equal(hitTestIndex(104, 50, boxes, 0), null);  // gap
  assert.equal(hitTestIndex(50, 240, boxes, 3), 2);     // taller row
  assert.equal(hitTestIndex(500, 500, boxes, 0), null);
  const a = ["A", "B", "C", "D"]; moveItem(a, 0, 2); assert.deepEqual(a, ["B", "C", "A", "D"]); // insert, not swap
  const b = ["A", "B", "C", "D"]; moveItem(b, 3, 0); assert.deepEqual(b, ["D", "A", "B", "C"]);
  ```
- [ ] **Step 2:** Kjør selvsjekken. Forventet: FAIL, fordi modulen ikke finnes.
- [ ] **Step 3:** Implementer fila. Toppkommentaren skal forklare hvorfor dette er en egen variant ved siden av `useLongPressReorder`: den finner målet ut fra plassering på skjermen og setter inn, og den gamle brukes i aktiv økt.
- [ ] **Step 4:** Kjør selvsjekken (forventet OK) og `npm run type-check` (forventet ren).

### Task 3: Tallene i Vue, flisa og arket

**Files:**
- Create: `src/composables/useTemplateStats.ts`
- Modify: `src/components/TemplateCard.vue` (tegnes om til flis)
- Create: `src/components/TemplateSheet.vue`

**Interfaces:**
- Consumes:
  - Task 1;
  - `useHybridData` (`templates`, `sessions`, `exerciseIndex`) og `useTrainingGoals` (`goals`, `hasGoals`);
  - `lastLoggedByExercise`, `groupTemplateExercises`/`OTHER_GROUP` og `templateColorOf`;
  - `MUSCLE_GROUP_COLORS` og `formatTotalTime` (fra `useCardioActivities`).
- Produces:
  ```ts
  // useTemplateStats.ts
  export interface TemplateTileStats {
    history: TemplateHistory | null;   // null: never run
    kind: TemplateKind | null;         // history.kind ?? templateKindFromLibrary(...); null until known
    lastLabel: string | null;          // lastTrainedLabel(history.lastDate, new Date()); null: never run
    estimate: TemplateEstimate | null; // null until exerciseIndex is loaded
    goal: TemplateGoalPlan | null;     // null: no goals, library not loaded, or no rows
    goalPending: boolean;              // hasGoals && library not loaded yet
  }
  /** One Map for all templates — built once, not per tile. `weekTally` is useGoalStreak().thisWeekTally. */
  export const useTemplateStats: (weekTally: Ref<WeekTally>) => { statsById: ComputedRef<Map<string, TemplateTileStats>> };

  // TemplateCard.vue
  props: { template: WorkoutTemplate; stats: TemplateTileStats | undefined; startDisabled: boolean }
  emits: { start: [templateId: string]; open: [templateId: string] }

  // TemplateSheet.vue
  props: { template: WorkoutTemplate | null; stats: TemplateTileStats | undefined; startDisabled: boolean } // open while template ≠ null
  emits: { close: []; start: [templateId: string] }
  ```

- [ ] **Step 1: `useTemplateStats.ts`.**
  - Histories og `lastLogged` regnes fra `sessions` alene (bølge 1).
  - `estimate`/`goal` regnes bare når `exerciseIndex.size > 0`, og `goal` bare når `hasGoals`.
  - `index` sendes som `Map<number, LibraryEntry>`.
- [ ] **Step 2: Flisa (`TemplateCard.vue`).** Bytt innholdet ut med flisa fra spec-en → «Flisene»:
  - **Ramme:** panelflate, radius `0.875rem` og `height: 100%`.
  - **Topp:** malprikk og navn (radnavn), og metalinja `` `${n} øvelse(r) · ${lastLabel ?? "ikke trent ennå"}` ``. Startknappen ligger absolutt øverst til høyre, med 34px sirkel i 44px trykkflate, tonet i malfargen som før, `@click.stop` og `emit("start")`.
  - **Stort tall (1.5rem / 700, `letter-spacing: -0.02em`) etter `stats.kind`:**
    - `strength` viser `kg(history.avgVolumeKg)` (rundet til nærmeste 10) med «kg» i enhetsstil, og «snitt volum» under.
    - `mixed` viser det samme, men med «snitt volum · + kondisjon».
    - `cardio` viser `Math.round(avgCardioSeconds / 60)` med «min», og under `` `snitt tid · ${km} km` `` (uten km-delen når den er 0).
    - Har malen ingen historikk, står «–», med etikett etter `kind`. Mens `kind === null` er etiketten en `.skeleton`-strek.
  - **Mål-del:**
    - Når `goalPending`: skillelinje, en plassholderstrek for oppsummeringen og `min(template.exercises.length, antall mål > 0)` plassholderrader.
    - Når `goal`: skillelinje, så `summary` (tonet oransje, eller `#4ade80` når den begynner med «✓»), så én rad per `goal.rows`:
      - prikk i `MUSCLE_GROUP_COLORS[name]`, eller `#06b6d4` for `minutes`/`km`;
      - navnet;
      - til høyre `` `${done}/${target}` `` (km med `no-NO`);
      - `metNow` gir «✓ » foran og grønne tall.
  - **Trykk:** et trykk på flisa sender `emit("open")`. Flisa har `role="button"`, `tabindex="0"`, og Enter åpner den.
  - **Rydd:** fjern det gamle åpne/lukk-innholdet.
- [ ] **Step 3: Arket (`TemplateSheet.vue`).**
  - **Ramme:** `<Teleport to="body">`, og `<Transition>` med samme timing og kurver som `.ex-sheet-*` i `WorkoutSession.vue` (bakgrunn med fade, panel med `translateY(100%)`). Overgangene slås av under `prefers-reduced-motion`.
    - Panelet bruker `#1a2233` med kant `#2d3a4f`, radius `1.25rem 1.25rem 0 0`, `max-height: 88dvh`, `overflow-y: auto` og nederst `padding-bottom: calc(… + env(safe-area-inset-bottom))`.
    - Bakgrunnen er `rgba(0, 0, 0, 0.65)`. Trykk på bakgrunnen eller håndtaket, og tasten Escape, sender `emit("close")`.
  - **Innhold, i rekkefølge (spec → «Arket»):**
    1. **Topp:** prikk, navn (1.25rem / 700) og metalinja `` `${n} øvelse(r)` + (estimate?.strengthSets ? ` · ${strengthSets} sett` : "") ``. Til høyre en blyant (`router-link` til `/template/edit/:id`). Den er en ikonknapp på 44px i `#243044`/`#3d5068` med radius `0.75rem` og ikonet fra `ExerciseDetail.vue` (`.ed-icon-btn`), og har `aria-label="Rediger mal"`.
    2. **Nøkkeltall i to kolonner** (etikett i undertittel-stil, verdi 1.25rem / 700 med enheten mindre og dempet):
       - `strength`/`mixed`: «Snitt volum» (kg), «Snitt tid» (`formatTotalTime(avgMinutes * 60)`), «Sist trent» og «Økter»;
       - `cardio`: «Snitt tid» (`formatTotalTime(avgCardioSeconds)`), «Snitt distanse» (km med én desimal), «Sist trent» og «Økter»;
       - en verdi som mangler, vises som «–».
    3. **«Denne uken»** (når `goal`): tittel til venstre og `summary` til høyre. Hver rad har prikk, navn, `done/target` (+ « min»/« km» for kondisjon), og helt til høyre «✓ nådd» (grønn) når `metNow`, ellers `+${add}` (tonet oransje) når `add > 0`, ellers tomt. Når `goalPending` er seksjonen plassholdere.
    4. **Øvelsene:** gruppert med `groupTemplateExercises`, med samme markup og logikk som det gamle åpne kortet, inkludert «N sett» via `lastLoggedByExercise` og ingenting for kondisjon eller øvelser som aldri er logget. Uten bibliotek står de lagrede navnene i malens rekkefølge.
    5. **«Start økt»:** `btn-primary`, full bredde. Den sender `emit("start", id)`, og er `disabled` med samme `title` som startknappen på flisa når `startDisabled`.
    6. **Ingen «Rediger mal»-lenke nederst.**
- [ ] **Step 4:** Kjør `npm run type-check`. Forventet: ren. `TemplateSessions` sender ennå ikke `stats`, så propen er valgfri (`| undefined`) fram til Task 4.

### Task 4: Forsiden — rutenett, dra, ark og plassholdere

**Files:**
- Modify: `src/views/TemplateSessions.vue` (maldelen: script, markup og CSS `.tpl-*`)
- Modify: `DESIGN.md` (avsnittene «Malkort (forsiden)» og «Farger → Malfarger»)
- Modify: `CLAUDE.md` (setningen om malfargen: «the dot on the template card» → «the dot on the template tile»)

**Interfaces:**
- Consumes: Task 2 (`useGridReorder`, `moveItem` brukes internt), og Task 3 (`useTemplateStats`, flisa og arket).

- [ ] **Step 1: Bytt dragningen.**
  - Bytt `useLongPressReorder` mot `useGridReorder({ getItems: () => templateOrderIds.value, gridEl: templateListRef, onReordered: <som i dag> })`.
  - `.tpl-item--dragging` får `transform: translate(${dragX}px, ${dragY}px)`, og skygge og forstørrelse beholdes.
  - `@pointerdown` og `@click.capture` fungerer som i dag (`onItemPointerDown`, `consumeClickSuppression`).
- [ ] **Step 2: Rutenettet.**
  - `.tpl-list` blir `display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 0.5rem; position: relative`. Det gir to kolonner både ved 390px og ved 320px, og flere på brede skjermer.
  - `.tpl-item > *` får `height: 100%`, så flisene på samme rad blir like høye.
- [ ] **Step 3: Tall og ark.**
  - Legg `thisWeekTally` til i den eksisterende `useGoalStreak()`-destruktureringen, og kall `const { statsById } = useTemplateStats(thisWeekTally)`. `TemplateCard` får `:stats="statsById.get(template.id)"` og `@open`.
  - `openTemplateId = ref<string | null>(null)`, og `<TemplateSheet :template="templatesById.get(openTemplateId) ?? null" …>`. En mal som slettes mens arket er åpent, lukker arket.
  - Sheet `start`: sett `openTemplateId = null` først, og kall så `startWorkout(id)`.
- [ ] **Step 4: Plassholdere.** `.tpl-ph` får flisformen: samme rutenett, radius og høyde som en flis uten mål-del. Den har prikk og navn-strek, metastrek, en strek for det store tallet med etikettstrek, og en sirkel for startknappen. Vis fire stykker, og utvid `PLACEHOLDER_NAME_WIDTHS` til fire bredder.
- [ ] **Step 5: `DESIGN.md`.**
  - Skriv «Malkort (forsiden)» om til «Malfliser (forsiden)» med flisa, mål-delen, arket (blyant øverst, «Start økt» nederst), dragning med innsetting i rutenett, og to kolonner fra 320px.
  - Fjern setningen «Én kolonne på alle skjermer …».
  - I «Malfarger»: «malkortet» → «malflisa».
- [ ] **Step 6:** Kjør `npm run type-check`. Forventet: ren.

### Task 5: Ukekortet uten «Igjen for å holde streaken»

**Files:**
- Modify: `src/views/TemplateSessions.vue` (ukekortets markup, script og CSS)

- [ ] **Step 1: Fjern grenene.** Fjern disse tre grenene: plassholderen for målet (`hasGoals && !streakDataReady`), `week-card__secured` og lista `week-card__goal` med `thisWeek.gaps`.
- [ ] **Step 2: Flytt reservene.** Legg de fire reservegrenene (plassholder for summene, «Ukens sett», «Ukens kondisjon» og summene) inni `<template v-if="!hasGoals">`. Da kan ikke `setsGoalProgress.hasTarget`, som er sann når det finnes ukesmål, få «Ukens sett» til å dukke opp.
- [ ] **Step 3: Rydd i script og CSS.**
  - Fjern det som ikke lenger brukes: `reservedGoalRows`, `GAP_UNIT`, `kmFormat`, `formatGap`, `gapColor`, importene `GoalGap`/`GoalGapKind`/`MUSCLE_GROUP_COLORS`, og CSS for `.week-card__gaps`, `__gap*`, `__gaps-met` og `__secured`.
  - Behold `thisWeek` og feiringen.
- [ ] **Step 4:** Kjør `npm run type-check` og `npm run build`. Forventet: begge rene.

### Avslutning

- [ ] Én avsluttende gjennomgang av hele diffen med en fersk agent, med spec-en og Review Focus som sjekkliste.
- [ ] Sjekkliste til Eivind på telefon:
  - [ ] Forsiden viser to kolonner og har ingen «Igjen …»-liste.
  - [ ] Tallene i flisene stemmer med Ukesoversikt.
  - [ ] Et trykk på en flis åpner arket.
  - [ ] Blyanten åpner malskjemaet.
  - [ ] «Start økt» starter økta, og knappen er nedtonet når en annen økt er aktiv.
  - [ ] Hold inne og dra en flis til en annen rad. Den settes inn og bytter ikke plass med flisa der.
  - [ ] Klikket etter en dragning verken åpner arket eller starter en økt.
  - [ ] Rulling virker som før.
  - [ ] Kondisjonsmalene på samboerens telefon viser minutter og km.
  - [ ] Ved oppstart dytter plassholderne ingenting nedover.
