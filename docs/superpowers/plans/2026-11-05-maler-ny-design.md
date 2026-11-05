# Malene på forsiden — nytt design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kompakte malkort med valgfri farge og øvelser gruppert per muskelgruppe når de åpnes, en flytende flis for aktiv økt på forsiden, fargevalg i malskjemaet, og malfargen som prikk i Historikk.

**Architecture:** En ny `color`-kolonne på `workout_templates` mappes gjennom `useSupabaseData` som navn og øvelser. En liten fargemodul (`templateColors.ts`) gir paletten (muskelgruppefargene) og grå reserve. En ren grupperingsfunksjon (`templateGroups.ts`) er selvsjekket i Node. To nye komponenter, `TemplateCard.vue` og `ActiveSessionButton.vue`, tar over forsidens malliste og aktiv-økt-seksjon.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Supabase, Node 22 `--experimental-strip-types` for selvsjekk.

**Spec:** `docs/superpowers/specs/2026-11-05-maler-ny-design-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push. Commit-steg er utelatt.
- Bokmål i UI, engelske kommentarer. Følg stilen i fila; ingen omformatering av hele filer. Nye `.vue`-filer: `<script setup lang="ts">` → template → style (`my-vue-style`, last den før `.vue`-endringer). Les `DESIGN.md` før UI.
- Farger: paletten er nøyaktig `color`-verdiene i `src/data/muscle-groups.json`, i fil-rekkefølge. Standard for nye maler `#f97316`. Uten farge / slettet mal: `#475569`. Flisen: `#1a2233`, kant `#2d3a4f`; ring oransje `#f97316`, cyan `#06b6d4` for bare kondisjon.
- Trykkflater minst 44px (også startknappen og fargeruta).
- Under `prefers-reduced-motion: reduce`: ingen pulsering eller animasjon.
- SQL `14_` må kjøres før deploy (Eivind kjører den).
- Verifisering: selvsjekk der oppgaven har en + `npm run type-check`; til slutt `npm run build`.

## Review Focus

1. **Maler uten farge** (alle eksisterende, også i IndexedDB-cachen og ventende endringer): grå kant og startknapp, grå prikk i Historikk, ingen feil.
2. **Fargeendring offline:** går gjennom `updateTemplateOffline`/køen og lagres med `color` når nettet kommer.
3. **Mal med øvelser som ikke finnes i biblioteket, eller før biblioteket er lastet:** kortet tegnes; prikker er plassholdere til bølge 2; ukjente havner under «Annet».
4. **Aktiv økt etter omstart av appen:** flisen viser samme «N av M sett» som toppen av økta (lokal kopi først).
5. **Historikk-økt fra slettet mal** (`templateId` null eller ukjent): grå prikk.

---

### Task 1: Datalaget — `color` på maler, palett, SQL

**Files:**
- Create: `supabase-setup/14_template_color.sql` — `ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS color TEXT;` med kommentarhode som `13_` (formål, ikke-destruktiv, må kjøres før deploy).
- Create: `src/composables/templateColors.ts`
- Modify: `src/types/workout.ts` (`WorkoutTemplate`), `src/composables/useSupabase.ts` (`workout_templates` Row/Insert/Update), `src/composables/useSupabaseData.ts` (`formattedTemplates` ~391, `addTemplate` insert + push ~857–870, `updateTemplate` ~899–903)
- Modify: `CLAUDE.md` («Data model»: maler har valgfri `color`, en av muskelgruppefargene; `NULL` = grå; «neste nummer» → `15_`)

**Interfaces:**
- Produces:
  ```ts
  // types/workout.ts
  interface WorkoutTemplate { id: string; name: string; color?: string | null; exercises: ExerciseTemplate[] }
  // templateColors.ts
  export const TEMPLATE_COLORS: string[];            // muscle-groups.json colours, file order
  export const DEFAULT_TEMPLATE_COLOR = "#f97316";
  export const NO_TEMPLATE_COLOR = "#475569";
  /** The template's colour, or grey when it has none or doesn't exist (deleted). */
  export const templateColorOf: (template: { color?: string | null } | null | undefined) => string;
  ```

- [ ] **Step 1:** SQL-fila, typer og fargemodulen.
- [ ] **Step 2:** `useSupabaseData`: les `t.color ?? null` i `formattedTemplates`; send `color: template.color ?? null` ved insert og ta den med i det som pushes; send `color: updates.color` i `updateTemplate` (udefinert blir utelatt av supabase-js, så eldre køinnslag ikke nullstiller fargen).
- [ ] **Step 3: Verifiser.** `npm run type-check` → ren.

### Task 2: Gruppering per muskelgruppe (ren funksjon + selvsjekk)

**Files:**
- Create: `src/composables/templateGroups.ts` (ingen imports, så Node kan kjøre den)
- Test: `<scratchpad>/check-template-groups.ts`

**Interfaces:**
- Produces:
  ```ts
  export const OTHER_GROUP = "Annet";
  /** Groups in order of first appearance; exercises keep template order; unresolved ids go under OTHER_GROUP, last. */
  export const groupTemplateExercises: <T extends { exerciseId: number }>(exercises: T[], categoryOf: (exerciseId: number) => string | undefined) => { group: string; exercises: T[] }[];
  ```

- [ ] **Step 1: Selvsjekk:**
  ```ts
  const cat: Record<number, string> = { 1: "Bryst", 2: "Skuldre", 3: "Bryst", 4: "Triceps" };
  const of = (id: number) => cat[id];
  const ex = (...ids: number[]) => ids.map((exerciseId) => ({ exerciseId }));
  const g = groupTemplateExercises(ex(1, 2, 3, 4), of);
  assert(JSON.stringify(g.map((x) => x.group)) === '["Bryst","Skuldre","Triceps"]');      // first appearance
  assert(JSON.stringify(g[0].exercises.map((e) => e.exerciseId)) === "[1,3]");               // template order within group
  const u = groupTemplateExercises(ex(99, 2), of);
  assert(JSON.stringify(u.map((x) => x.group)) === '["Skuldre","Annet"]');                   // unresolved last
  assert(groupTemplateExercises([], of).length === 0);
  const input = ex(3, 1); groupTemplateExercises(input, of);
  assert(input[0].exerciseId === 3);                                                         // input not reordered
  ```
- [ ] **Step 2:** Kjør `node --experimental-strip-types <scratchpad>/check-template-groups.ts` → feiler (modulen finnes ikke).
- [ ] **Step 3:** Implementer.
- [ ] **Step 4:** Selvsjekken → alle OK. `npm run type-check` → ren.

### Task 3: `TemplateCard.vue`

**Files:**
- Create: `src/components/TemplateCard.vue`

**Interfaces:**
- Consumes: `templateColorOf` (Task 1), `groupTemplateExercises`/`OTHER_GROUP` (Task 2), `findLastLogged` og `isSetCounted` fra `useSetMetrics`, `exerciseIndex` via `useHybridData`, `muscle-groups.json` for gruppefarger.
- Produces: `<TemplateCard :template="t" :start-disabled="bool" @start="(id: string) => …" />`

- [ ] **Step 1:** Lukket: kort i panelstil med `border-left: 4px solid <templateColorOf>`; radnavn; metalinje med én prikk per gruppe (unntatt «Annet») + «N øvelser»; chevron; rund startknapp (≥44px, fylt med malfargen, ▶) som emitter `start` med `stopPropagation` og er nedtonet/`disabled` når `startDisabled`. Hele kortet ellers er én `<button type="button" :aria-expanded>` som veksler åpen/lukket (lokal state, start lukket).
- [ ] **Step 2:** Åpen: per gruppe en undertittel (prikk i gruppens farge, navnet i versaler; «Annet» grå), så øvelsene (navn fra biblioteket via `exerciseIndex`, ellers lagret navn). Til høyre «N sett» = tellende sett i `findLastLogged(workoutData.sessions.value, id)` for styrke; ingenting for kondisjon (`trackingType` fra `exerciseIndex`) eller aldri logget. Nederst tekstlenke «Rediger mal» → `/template/edit/:id`.
- [ ] **Step 3:** Før `exerciseIndex` har innhold: prikkene i metalinja er `.skeleton .skeleton--circle` (samme størrelse); åpent innhold venter på samme måte (plassholderstreker per øvelse).
- [ ] **Step 4: Verifiser.** `npm run type-check` → ren.

### Task 4: `ActiveSessionButton.vue`

**Files:**
- Create: `src/components/ActiveSessionButton.vue`

**Interfaces:**
- Consumes: `isCardioExercise` (`useSetMetrics`), `liveExerciseSeconds` og `formatClock` (`useCardioTimer`).
- Produces: `<ActiveSessionButton :session="WorkoutSession" />` (router-link til `/workout/:id`).

- [ ] **Step 1:** Øvelsene leses fra `localStorage` `workout-session-<id>` (`exercises`) når den finnes og kan parses, ellers fra `session.exercises`. Fullførte = sett med `isCompleted`, alle = alle sett (som toppen av aktiv økt). `now` tikker hvert sekund (interval ryddes i `onUnmounted`); tid = `formatClock((now − session.date)/1000)`.
- [ ] **Step 2:** Flis: `position: fixed`, høyre 1rem; bunn over bunnmenyen på mobil (`calc(<nav-høyde> + 0.75rem + env(safe-area-inset-bottom))`), `1.5rem` fra 768px. Ring (conic-gradient) fylles oransje etter fullførte/alle; navn, tid (`tabular-nums`), «N av M sett». Bare kondisjon: hel cyan ring, andre linje «Aktiv tid <formatClock(sum liveExerciseSeconds)>».
- [ ] **Step 3: Verifiser.** `npm run type-check` → ren.

### Task 5: Forsiden tar i bruk kortene og flisen

**Files:**
- Modify: `src/views/TemplateSessions.vue` (aktiv-økt-seksjonen ~516–535, blå boks, malrutenettet og plassholderkortene ~555–615, `getExerciseGroup`, `PLACEHOLDER_ROW_WIDTHS`, `fadeExercises`, `abandonWorkout`, `formatDate`, `SwipeableCard`-import der de ikke lenger brukes)
- Modify: `DESIGN.md` (nye avsnitt «Malkort», «Flis for aktiv økt»; under Farger: malfargene er muskelgruppefargene, grå `#475569` = ingen/slettet mal)

**Interfaces:**
- Consumes: `TemplateCard`, `ActiveSessionButton`.

- [ ] **Step 1:** Fjern aktiv-økt-seksjonen og den blå boksen. Når `localReady` og det finnes en aktiv økt: `<ActiveSessionButton :session="nyeste aktive (etter date)">`.
- [ ] **Step 2:** Malene: `<TemplateCard>` per mal i en liste med 0.5rem mellomrom; fra 768px to kolonner med `align-items: start`. `@start` → eksisterende `startWorkout`; `start-disabled` = det finnes en aktiv økt. Ekstra bunnpolstring når flisen vises, så siste kort ikke dekkes.
- [ ] **Step 3:** Plassholderkort før `localReady` i samme form og høyde som et lukket `TemplateCard` (tre stykker). Tom tilstand som før.
- [ ] **Step 4:** `DESIGN.md`-avsnittene.
- [ ] **Step 5: Verifiser.** `npm run type-check` → ren. `grep -n "SwipeableCard\|Du har en aktiv økt\|getExerciseGroup" src/views/TemplateSessions.vue` → ingen treff.

### Task 6: Fargevalg i malskjemaet

**Files:**
- Modify: `src/views/TemplateForm.vue` (`templateForm`-state ~21, navnefeltet ~299–310, lagring ~172–186, redigering ~205, mal fra økt ~235)

**Interfaces:**
- Consumes: `TEMPLATE_COLORS`, `DEFAULT_TEMPLATE_COLOR`, `NO_TEMPLATE_COLOR` (Task 1).

- [ ] **Step 1:** `templateForm.color: string | null`. Ny mal og mal fra økt: `DEFAULT_TEMPLATE_COLOR`. Redigering: `foundTemplate.color ?? null`. Lagring sender `color` ved både opprettelse og oppdatering.
- [ ] **Step 2:** Fargerute (≥44px trykkflate) til venstre inne i navnefeltet, fylt med fargen (grå når `null`). Trykk åpner en palett (4 × 2 runde felt med `TEMPLATE_COLORS`, valgt med ring + ✓); valg setter fargen og lukker; trykk utenfor og Escape lukker. Etiketten blir «Navn og farge».
- [ ] **Step 3: Verifiser.** `npm run type-check` → ren.

### Task 7: Malfargen i Historikk

**Files:**
- Modify: `src/views/History.vue` (radnavnet ~287, CSS `.hx-row__name`/`.hx-row__meta` ~511–525)

**Interfaces:**
- Consumes: `templateColorOf` (Task 1).

- [ ] **Step 1:** Prikk (0.5rem) foran øktnavnet med `templateColorOf(malen med session.templateId)` (oppslag via et `Map` bygget fra `workoutData.templates`); ingen mal → grå. Metalinja får igjen `padding-left: 1rem`, så den flukter med navnet.
- [ ] **Step 2: Verifiser.** `npm run type-check` og `npm run build` → rene.

### Avslutning

- [ ] Én avsluttende gjennomgang av hele diffen med en fersk agent, med Review Focus som sjekkliste.
- [ ] Sjekkliste til Eivind: kjør `14_` først; gi en mal farge og se den på forsiden og i Historikk; åpne/lukk kort; start økt og se flisen (styrke og bare kondisjon), lukk og åpne appen midt i økta; slett en mal og se grå prikk i Historikk; lag ny mal (oransje) og mal fra økt; test på telefon med bunnmeny.
