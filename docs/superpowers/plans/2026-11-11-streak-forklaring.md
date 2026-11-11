# Streaken forklart i Ukesoversikt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Ukesoversikt får en kompakt streak-rad for inneværende uke («3 uker på rad · 0 av 6 mål nådd»), med reglene bak «Slik fungerer det».
- Forsiden mister «neste merke ved X».

**Architecture:**
- `evaluateWeek` i den rene modulen `goalStreak.ts` får to nye felt, `targetsMet` og `targetsTotal`, som teller alle målene: muskelgrupper og kondisjonsmål.
- `WeekDetails.vue` leser `current`, `thisWeek` og `ready` fra `useGoalStreak`, som forsiden allerede bruker.
- `TemplateSessions.vue` slutter å vise `nextMilestone`.

**Tech Stack:** Vue 3, TypeScript. Selvsjekken bundles med esbuild og kjøres i Node 22.

**Spec:** `docs/superpowers/specs/2026-11-11-streak-forklaring-design.md`

## Global Constraints

- **Ikke commit, stage, branch eller push.** Kommentarer på engelsk og UI-tekst på bokmål. Last `my-vue-style` før endringer i `.vue`, og ikke omformater hele filer.
- **Farger bare fra `DESIGN.md`:** flamme `#f97316`, radnavn `#f1f5f9`, dempet tekst `#64748b`/`#94a3b8`, skillelinje `#1f2937`. Panelet er `wk-card`.
- **Trykkflater:** minst 44px.
- **Selvsjekk:** `npx esbuild <scratchpad>/check-week-targets.ts --bundle --platform=node --format=esm --log-level=warning --outfile=<scratchpad>/check-week-targets.mjs && node <scratchpad>/check-week-targets.mjs`
- **Til slutt:** `npm run type-check` og `npm run build`.

## Review Focus

1. **Kondisjonsmål teller med i «N av M».** En plan med 6 muskelgrupper og mål for både minutter og km gir M = 8. Dekkes av Task 1, steg 1.
2. **Uten mål, eller med `planId: "none"`:** 0 av 0, og raden vises ikke. Dekkes av Task 1, steg 1, og av `v-if` i Task 2.
3. **Tidligere uke i ukevelgeren:** raden vises ikke. Sjekkes manuelt.
4. **Streak 0:** raden viser «Start en ny streak». Sjekkes manuelt.
5. **Biblioteket ikke lastet:** en plassholder i samme høyde, ingen «0 av 6» som blinker forbi. Sjekkes manuelt.

---

### Task 1: `targetsMet` / `targetsTotal` i `evaluateWeek`

**Files:**
- Modify: `src/composables/goalStreak.ts` (`WeekEvaluation`, `evaluateWeek`)
- Test: `<scratchpad>/check-week-targets.ts`

**Interfaces:**
- Produces: `WeekEvaluation` får `targetsMet: number` og `targetsTotal: number`. De teller hver muskelgruppe med mål over 0 og hvert kondisjonsmål (minutter og km) over 0. Uten mål er begge 0.

- [ ] **Step 1: Selvsjekk.**
  ```ts
  const goals = { planId: "custom", sessionsPerWeek: 0, setsPerMuscleGroup: { Ben: 24, Bryst: 15, Rygg: 15, Skuldre: 8, Biceps: 8, Triceps: 8, Kjerne: 0 }, cardio: { minutesPerWeek: 60, kilometresPerWeek: 10 } };
  const e = evaluateWeek({ setsByGroup: { Ben: 24, Bryst: 9, Rygg: 9, Skuldre: 8, Biceps: 4, Triceps: 4 }, cardioSeconds: 3600, cardioMetres: 4000 }, goals);
  assert.deepEqual([e.targetsMet, e.targetsTotal], [3, 8]);      // Ben, Skuldre, minutes met; Kjerne (0) not a target
  const none = evaluateWeek({ setsByGroup: { Ben: 30 }, cardioSeconds: 0, cardioMetres: 0 }, { ...goals, planId: "none" });
  assert.deepEqual([none.targetsMet, none.targetsTotal], [0, 0]);
  const strengthOnly = evaluateWeek({ setsByGroup: {}, cardioSeconds: 0, cardioMetres: 0 }, { ...goals, cardio: { minutesPerWeek: 0, kilometresPerWeek: 0 } });
  assert.deepEqual([strengthOnly.targetsMet, strengthOnly.targetsTotal], [0, 6]);
  ```
- [ ] **Step 2:** Kjør selvsjekken. Forventet: FAIL, fordi `targetsMet` er `undefined`.
- [ ] **Step 3:** Tell opp feltene i den eksisterende løkka i `evaluateWeek`. Et mål er nådd når det ikke står i `gaps`.
- [ ] **Step 4:** Kjør selvsjekken (forventet OK) og `npm run type-check` (forventet ren).

### Task 2: Streak-raden i Ukesoversikt, og forsiden uten «neste merke»

**Files:**
- Modify: `src/views/WeekDetails.vue` (script, markup rett etter dagsporet, og CSS)
- Modify: `src/views/TemplateSessions.vue` (`streakMeta`, og `nextMilestone` fjernes fra destruktureringen)
- Modify: `DESIGN.md` (nytt kort avsnitt «Streak i Ukesoversikt»)

**Interfaces:**
- Consumes: `useGoalStreak()` → `ready`, `current`, `thisWeek` (med `targetsMet`/`targetsTotal` fra Task 1). `hasGoals` kommer fra `useTrainingGoals`, som allerede er importert.

- [ ] **Step 1: Raden i `WeekDetails.vue`.**
  - **Plassering:** en `<section class="wk-card">` rett etter dagsporet, før blokken for en tom uke. Den vises når `week.isCurrentWeek.value && hasGoals`.
  - **Innhold:**
    - flamme-SVG-en fra forsiden (16px, `#f97316`);
    - `current > 0 ? "${current} ${current === 1 ? "uke" : "uker"} på rad" : "Start en ny streak"` (0.875rem / 600, `#f1f5f9`);
    - dempet `` ` · ${thisWeek.targetsMet} av ${thisWeek.targetsTotal} mål nådd` `` (0.75rem, `#64748b`);
    - til høyre en `<button>` med «Slik fungerer det» og en chevron som roterer 90° når den er åpen. Knappen har 44px høyde, 0.75rem / 500 i `#94a3b8`, og `aria-expanded`.
  - **Reglene:** `ref(false)` styrer om de vises. Åpne står de under en skillelinje (`margin-top`/`padding-top` 0.75rem, `border-top: 1px solid #1f2937`) som tre linjer med en liten prikk i `#475569`, i 0.75rem / `#94a3b8`. «alle ukesmålene innen søndag» er uthevet i `#e2e8f0`. Tekstene er ordrett:
    1. «Nå **alle ukesmålene innen søndag**, så øker streaken med én.»
    2. «Hvert mål teller for seg. Det holder ikke at summen av sett stemmer.»
    3. «Mangler ett mål når uka er over, starter streaken på nytt.»
  - **Mens `!ready`:** samme rad med `.skeleton`-streker i stedet for tall og tekst (flamme og knapp står), så høyden ikke endrer seg. Under `prefers-reduced-motion` roterer ikke chevronen.
- [ ] **Step 2: Forsiden.** I `TemplateSessions.vue` gir `streakMeta` bare `` `Rekord ${best}` `` når `best > current`, ellers en tom streng. Fjern `nextMilestone` fra destruktureringen av `useGoalStreak()`.
- [ ] **Step 3: `DESIGN.md`.** Legg til et kort avsnitt «Streak i Ukesoversikt»: raden under dagsporet, «N av M mål» teller alle målene, og reglene ligger bak «Slik fungerer det». Forsiden viser bare «Rekord N».
- [ ] **Step 4:** Kjør `npm run type-check` og `npm run build`. Forventet: begge rene.

### Avslutning

- [ ] Én avsluttende gjennomgang av diffen med en fersk agent, med Review Focus som sjekkliste.
- [ ] Sjekkliste til Eivind:
  - [ ] Ukesoversikt for denne uka viser raden, og «Slik fungerer det» åpner og lukker reglene.
  - [ ] En tidligere uke viser ingen rad.
  - [ ] Forsiden viser «Rekord N» uten «neste merke».
  - [ ] Samboerens telefon, med kondisjonsmål, teller dem med i «N av M».
