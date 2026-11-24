# Ukesmål på forsiden — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Streaken forklares der den vises (en liten (i) på forsiden som åpner et ark), panelet og siden heter «Ukesmål», og ukesiden mister streakraden.

**Architecture:**
- Nytt bunnark `StreakInfoSheet.vue` etter mønsteret i `TemplateSheet.vue` (Teleport, `useSheetDrag`, `useBodyScrollLock`).
- Ukepanelet på forsiden blir en `<section>` med en usynlig `router-link` strukket over hele panelet. (i) og «Sett opp» ligger over lenka som vanlige knapper.
- `WeekGoalsSettings` monteres også på forsiden, så arket og linja uten mål kan åpne den direkte.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, scoped CSS.

**Spec:** `docs/superpowers/specs/2026-11-24-ukesmal-forside-design.md`

## Global Constraints

- **Git og stil:** ikke commit, stage, branch eller push (steget «Commit» hoppes over i hver oppgave). `my-vue-style`. Kommentarer på engelsk, UI-tekst på bokmål. Ikke omformater hele filer; behold anførselstegnene filen bruker.
- **Tekster (eksakt):**
  - panel: «Ukesmål»; lenkas `aria-label`: `` `Ukesmål, uke ${weekNumber}` ``;
  - (i): `aria-label="Slik fungerer streaken"`;
  - ark: tittel «Ukestreak», tall «På rad nå» og «Rekord», verdi «1 uke» / «N uker», rekord 0 som «–», knapp «Endre ukesmål»;
  - reglene, ordrett fra `WeekDetails.vue:357-359` (med `<strong>` rundt «alle ukesmålene innen søndag»);
  - uten mål: «Ingen ukesmål ennå.» og knappen «Sett opp» med chevron;
  - brødsmula: «Ukesmål».
- **Farger:** (i) `#64748b`, ikonet 0.75rem, trykkflate en usynlig sirkel på 2.75rem. Arket `#1a2233`, kant `#2d3a4f`, håndtak `#3d5068`. Arkknappen i feltpaletten: `#243044`, kant `#3d5068`, tekst `#e2e8f0`. Trykket panel: kant `#334155`. «Sett opp» `#fdba74`, 600.
- **Lag:** lenka `z-index: 1`, knappene over den `position: relative; z-index: 2`. Knappene er søsken av lenka, aldri barn.
- **Sjekk:** `npm run type-check` og `npm run build` rene. Skjermbilder innlogget med Playwright i scratchpad (390×844, `isMobile`, mørk, `serviceWorkers: "block"`), bare lesing. Lagre aldri i målinnstillingene.

## Review Focus

1. **Et trykk på (i) eller «Sett opp»** åpner ikke ukesiden. URL-en blir `/` (Task 4, steg 2).
2. **Trykket tilstand og fokus** på panelet ser ut som i dag: hele den runde kanten blir `#334155`, uten dobbel kant (Task 4, steg 3).
3. **Fra arket til målinnstillingene:** arket lukkes, innstillingene åpnes, og etter at de lukkes kan siden scrolle (Task 4, steg 2).
4. **Streak 0:** «Start en ny streak» med (i) bak, og arket viser «0 uker» (Task 1, steg 1; Task 4, steg 4).
5. **Bruker uten mål:** forsiden viser linja og ingen (i). Ukesiden viser «Sett opp ukesmål» også i en tom uke (Task 2, steg 4; Task 3, steg 3). Kan ikke kjøres live uten å skrive mål, så det leses i diffen.

---

### Task 1: Arket «Ukestreak»

**Files:**
- Create: `src/components/StreakInfoSheet.vue`

**Interfaces:**
- Produces:
  ```ts
  defineProps<{ open: boolean; current: number; best: number }>();
  defineEmits<{ (e: "close"): void; (e: "edit-goals"): void }>();
  ```

- [ ] **Step 1: Script.** `panelEl` + `useSheetDrag({ panelEl, isOpen: () => props.open, onClose: () => emit("close") })`, `useBodyScrollLock(() => props.open, panelEl)`, og Escape lukker (som `TemplateSheet.vue:115-120`). `weeksText(n: number): string` gir «1 uke» / «N uker». Rekord 0 vises som «–», så arket aldri sier «rekord 0 uker». Streak 0 vises som «0 uker».
- [ ] **Step 2: Template.** Samme ramme som `TemplateSheet.vue:124-133` med prefiks `streak-sheet`: `role="dialog"`, `aria-modal="true"`, `aria-label="Ukestreak"`, bakteppe som lukker, grab-sone med håndtak og `<h2>` «Ukestreak». Deretter et `<dl>` med to tall (etikett over verdi, som `.tpl-sheet__facts`), `<ul>` med de tre reglene og `<button type="button">` «Endre ukesmål» som sender `edit-goals`.
- [ ] **Step 3: Style.** Ta rammereglene fra `TemplateSheet.vue` (`.tpl-sheet`, `__backdrop`, `__panel`, `__grab`, `__handle`, overgangene og `prefers-reduced-motion`) under nytt prefiks. Tallene i to kolonner som `.tpl-sheet__facts`. Reglene som `.wk-streak__rules` i `WeekDetails.vue`, med skillelinje `#2d3a4f`. Knappen i full bredde, `margin-top: 1.25rem`, radius 0.625rem, med farger fra Global Constraints.
- [ ] **Step 4:** `npm run type-check`. Forventet: ingen feil.

### Task 2: Forsiden

**Files:**
- Modify: `src/views/TemplateSessions.vue` (script ved 106 og 215-262, template 339-487 og nederst ved `TemplateSheet`, style 600-615 og 717-900)
- Modify: `DESIGN.md` (183-188, 230)

**Interfaces:**
- Consumes: `StreakInfoSheet` (Task 1); `WeekGoalsSettings` med `v-model:visible`.

- [ ] **Step 1: Script.** `showStreakInfo = ref(false)`, `showGoalSettings = ref(false)`, `openGoalSettings()` som setter `showStreakInfo` til `false` og `showGoalSettings` til `true`. Fjern `formatNumber`, `totals: weekTotals`, `setsGoalProgress` og `cardioGoalProgress` (blir ubrukt). Kommentaren på linje 256 sier at reglene står i arket bak (i).
- [ ] **Step 2: Panelet.** `<router-link to="/week" class="week-card">` blir `<section class="week-card">`. Første barn er `<router-link to="/week" class="week-card__link" :aria-label="…"></router-link>`. Tittelen blir «Ukesmål».
- [ ] **Step 3: (i).** Bare i grenen med ekte streak (ikke plassholderen): inne i `.week-card__streak-label`, rett etter teksten, `<button type="button" class="week-card__info" aria-label="Slik fungerer streaken" @click="showStreakInfo = true">` med et sirkel-i-ikon (`aria-hidden`).
- [ ] **Step 4: Uten mål.** Hele `<template v-if="!hasGoals">` (plassholder, «Ukens sett», «Ukens kondisjon», totalene) erstattes av `<p v-if="!hasGoals" class="week-card__setup">` med «Ingen ukesmål ennå.» og `<button type="button" class="week-card__setup-btn" @click="showGoalSettings = true">Sett opp</button>` med chevron. Kommentaren over oppdateres.
- [ ] **Step 5: Montering.** Ved siden av `<TemplateSheet>`: `<StreakInfoSheet :open="showStreakInfo" :current="streakCurrent" :best="streakBest" @close="showStreakInfo = false" @edit-goals="openGoalSettings" />` og `<WeekGoalsSettings v-model:visible="showGoalSettings" />`.
- [ ] **Step 6: Style.**
  - `.week-card` får `position: relative`, og `.week-card:active` fjernes.
  - `.week-card__link`: `position: absolute; inset: -1px; z-index: 1; border: 1px solid transparent; border-radius: inherit`. `:active` gir kant `#334155`. `:focus-visible` gir `outline: 2px solid #f97316; outline-offset: 2px`.
  - `.week-card__info`: `position: relative; z-index: 2; min-width: 0; min-height: 0; vertical-align: super; margin-left: 0.1875rem; padding: 0; line-height: 0; color: #64748b; background: none; border: 0`. Ikonet er 0.75rem. `::before` er en sentrert, usynlig sirkel på 2.75rem.
  - `.week-card__setup`: 0.8125rem, `#94a3b8`.
  - `.week-card__setup-btn`: `position: relative; z-index: 2; inline-flex`, farge fra Global Constraints.
  - Fjern de ubrukte `.week-card__goal*`-, `.week-card__stats`- og `.week-card__stat*`-reglene.
- [ ] **Step 7: DESIGN.md.**
  - «Streak i Ukesoversikt» (183-188) skrives om til «Streak på forsiden»: panelet «Ukesmål», (i) som fotnote med 44 px trykkflate, arket «Ukestreak» (tall, regler, «Endre ukesmål»), linja uten mål, og at ukesiden ikke viser streaken.
  - Legg arket til «Dra ned for å lukke» (230).
- [ ] **Step 8:** `npm run type-check`. Forventet: ingen feil.

### Task 3: Ukesiden

**Files:**
- Modify: `src/views/WeekDetails.vue` (script 10 og 40-60, template 234-238 og 332-402, style 852-955)
- Modify: `DESIGN.md` (3, 50, 172, 289)

- [ ] **Step 1:** Brødsmula `{ name: 'Ukesoversikt' }` blir `{ name: 'Ukesmål' }`.
- [ ] **Step 2:** Fjern streakraden (template 332-361), scriptet for den (40-60), importen av `useGoalStreak` og alle `.wk-streak*`-regler, også blokken med `prefers-reduced-motion`. `hasGoals` blir værende.
- [ ] **Step 3:** Flytt `<button v-if="!hasGoals" class="wk-cta">` ut av `v-else` og sett den rett etter dagsporet, der streakraden stod. Da vises den i alle uker uten mål, også tomme. (Mitt valg: ett element og samme plass i alle uker, i stedet for to kopier.)
- [ ] **Step 4:** I `DESIGN.md` blir «Ukesoversikt» til «Ukesmål» der siden nevnes (linje 3, 50, 172, 289). Grammatikken rettes der det trengs.
- [ ] **Step 5:** `npm run type-check`. Forventet: ingen feil.

### Task 4: Sjekk hele flyten

- [ ] **Step 1:** `npm run type-check` og `npm run build`. Forventet: begge rene.
- [ ] **Step 2: Forsiden** (Playwright, se Global Constraints):
  - Skjermbilde av `/`. Forventet: «Ukesmål», og (i) etter «uker på rad».
  - Trykk (i). Forventet: arket er synlig og URL-en er fortsatt `/`. Ta skjermbilde.
  - Trykk «Endre ukesmål». Forventet: arket er borte og «Ukesmål»-innstillingene er åpne. Lukk uten å lagre.
  - Kjør `window.scrollTo(0, 400)`. Forventet: `scrollY > 0`, altså er låsen sluppet.
- [ ] **Step 3: Trykket panel.** `mouse.down` midt på panelet, ta skjermbilde, `mouse.up`. Forventet: hele kanten er `#334155`, og URL-en blir `/week`.
- [ ] **Step 4: Ukesiden.** Skjermbilde av `/week`. Forventet: brødsmula «Ukesmål», tannhjulet uendret, ingen streakrad. Les koden for streak 0 og bruker uten mål (Review Focus 4 og 5).
- [ ] **Step 5:** Vis Eivind skjermbildene. Be ham prøve (i) på iPhone, siden trykkflata ikke kan testes skikkelig på Windows.
