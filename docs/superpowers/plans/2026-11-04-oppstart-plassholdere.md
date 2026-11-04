# Oppstart uten hopp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forsiden står ferdig formet fra første tegning (med bunnmeny), viser glinsende plassholdere der data mangler, og fylles ut i to bølger uten at innhold dyttes nedover.

**Architecture:** Datalaget avklarer innloggingen før `mount` og gir et signal når øktene er lest (bølge 1). Øvelsene hentes én gang per innlogget bruker så snart brukeren er kjent, parallelt med cache og synk, med nytt forsøk etter feil (bølge 2 = `exerciseIndex` ikke tom). `App.vue` mister lasteskjermen. `TemplateSessions.vue` bytter felt for felt mellom plassholder (`.skeleton` i `style.css`) og innhold.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Supabase auth-js 2.71, Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-04-oppstart-plassholdere-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push. Commit-steg er utelatt.
- Bokmål i UI, engelske kommentarer. Følg stilen i hver fil; ingen omformatering av hele filer; ikke flytt SFC-blokker (`App.vue` har template før script — nevn avviket).
- Last `my-vue-style` før `.vue`-endringer. Les `DESIGN.md` før forsiden.
- Plassholderfarger: flate `#1f2937`, glans `#334155` (`dark-700`). Ingen nye nyanser.
- Under `prefers-reduced-motion: reduce`: ingen glans-animasjon og ingen inntoning.
- Datalaget: følg mønsteret i `useSupabaseData`; ingen endring i synk-reglene.
- Verifisering per oppgave: `npm run type-check` ren. Til slutt `npm run build` ren.

## Review Focus

1. **Oppstart der `initializeAuth` feiler** (IndexedDB-feil, `getSession`-feil): `whenAuthResolved()` må likevel løses, ellers monteres appen aldri.
2. **Ikke innlogget ved oppstart → logger inn:** innloggingssiden vises uten plassholdere; etter innlogging hentes øvelsene (bruker-id går fra `null` til id), og forsiden går plassholder → innhold.
3. **Offline kald start:** bølge 1 fra cache; øvelsene feiler med én feilmelding og glinser; når nettet kommer (`online`) eller appen hentes fram, prøves det igjen og innholdet kommer — uten ny feilmelding per forsøk.
4. **Tilbake til forsiden senere** (alt lastet): ingen plassholdere og ingen inntoning ved hver navigasjon.
5. **Ny enhet uten cache:** «Ingen økter opprettet enda» blinker ikke før første henting er ferdig; offline uten cache viser tom tilstand når `loadData` er ferdig.

---

### Task 1: Datalaget — innlogging avklart tidlig og signal for bølge 1

**Files:**
- Modify: `src/composables/useSupabaseData.ts` (state ~137–145, `loadData` 206–283, `initializeAuth` 439–…, `signOut`, `resetState`, `SIGNED_OUT`-grenen, eksporten)
- Modify: `src/composables/useHybridData.ts` (eksporten)

**Interfaces:**
- Produces (fra `useSupabaseData`, videre via `useHybridData` med samme navn):
  ```ts
  authResolved: Ref<boolean>          // initial getSession attempt finished (signed in or not)
  whenAuthResolved: () => Promise<void> // resolves once authResolved is true; never rejects
  localDataReady: Ref<boolean>        // wave 1: templates/sessions painted from cache, or first load attempt finished when there is no cache
  ```

- [ ] **Step 1:** `initializeAuth`: kall `getSession` først, og sett `currentUser`/`isAuthenticated` og `authResolved = true` før `initIndexedDB()` og 100 ms-pausen (de beholdes, i samme rekkefølge, foran `loadData`). `authResolved` settes også i `finally`, så feil aldri blokkerer `mount`.
- [ ] **Step 2:** `loadData`: sett `localDataReady = true` rett etter at cachen er malt (når `cachedData` finnes) og i `finally` (dekker «ingen cache» etter synk-forsøk og tidlig retur når synk ikke skal kjøre).
- [ ] **Step 3:** Nullstill `localDataReady = false` i `signOut`, `SIGNED_OUT`-grenen og `resetState`.
- [ ] **Step 4:** Eksporter de tre fra `useSupabaseData` og `useHybridData`.
- [ ] **Step 5: Verifiser.** `npm run type-check` → ren.

### Task 2: Øvelsene — én gang per bruker, parallelt, nytt forsøk etter feil

**Files:**
- Modify: `src/composables/useExercises.ts` (modul-state 39–40, `loadExercises` 55–107, eksport ~360)
- Modify: `src/composables/useHybridData.ts` (`initializeAuth` ~176–181)
- Modify: `CLAUDE.md` (avsnittet om `useExercises` og «Boot order»)

**Interfaces:**
- Consumes: `currentUser` fra Task 1 (settes nå rett etter `getSession`).
- Produces (fra `useExercises`):
  ```ts
  /** Loads the library once per signed-in user; concurrent calls share one request. */
  ensureExercisesLoaded: (userId: string) => Promise<void>
  /** Retries the last failed load for the same user; no-op if nothing failed. */
  retryExercisesIfFailed: () => Promise<void>
  ```
  `loadExercises(force)` beholdes som intern/bakoverkompatibel inngang.

- [ ] **Step 1:** Modul-state: `_inflight: Promise<void> | null`, `_loadedFor: string | null`, `_failedFor: string | null`, `_errorShown: boolean`. `ensureExercisesLoaded` returnerer straks når `_loadedFor === userId`, gjenbruker `_inflight`, ellers henter. Suksess: `_loadedFor = userId`, `_failedFor = null`, `_errorShown = false`. Feil: `_failedFor = userId`; «Kunne ikke laste øvelser.» vises bare når `_errorShown` er `false`, som så settes.
- [ ] **Step 2:** `useHybridData.initializeAuth`: før `await userData.initializeAuth()`, sett opp (bare én gang, modul-flagg) en `watch` på `userData.currentUser.value?.id` med `immediate: true` som kaller `ensureExercisesLoaded(id)` når id finnes, og lyttere på `window` `online` og `document` `visibilitychange` (synlig) som kaller `retryExercisesIfFailed()`. Fjern `await exercisesStore.loadExercises(true)` etter `initializeAuth`.
- [ ] **Step 3:** `CLAUDE.md`: øvelsene hentes én gang per innlogget bruker så snart brukeren er kjent (parallelt med cache og synk), med nytt forsøk ved `online`/synlig etter feil; «Boot order» oppdateres (ingen loader i `App.vue`, `mount` venter på `whenAuthResolved`).
- [ ] **Step 4: Verifiser.** `npm run type-check` → ren. `grep -n "loadExercises(true)" src/composables/useHybridData.ts` → ingen treff.

### Task 3: App-skallet — vent på innlogging, fjern lasteskjerm og gjenoppretting

**Files:**
- Modify: `src/main.ts` (`bootstrap`)
- Modify: `src/App.vue` (lasteblokk 5–17 og `v-else`-innpakningen, `hasInitialized`, `isLoading`, `formatLastSyncTime`, de to watcherne 468–493, `lastRoute`-gjenoppretting 366–370)
- Modify: `src/router/index.ts` (`lastRoute`-lagringen ~220–230, som bare leses av `App.vue`)
- Modify: `index.html` (plan-beslutning: `<style>html,body{background:#0f172a}</style>` i `<head>`, så det ikke blinker hvitt før CSS-en er lastet)

**Interfaces:**
- Consumes: `whenAuthResolved` fra Task 1.

- [ ] **Step 1:** `main.ts`: etter `await router.isReady()`, `await workoutData.whenAuthResolved()` før `app.mount`. Oppdater kommentarene (ingen loader lenger).
- [ ] **Step 2:** `App.vue`: fjern lasteskjermen og alt som bare finnes for den; innholdet som lå i `v-else`, rendres direkte. Fjern `lastRoute`-gjenopprettingen. Fjern `lastRoute`-lagringen i ruteren.
- [ ] **Step 3:** `index.html`: bakgrunnsfargen inline.
- [ ] **Step 4: Verifiser.** `npm run type-check` → ren. `grep -rn "lastRoute\|hasInitialized\|Starter app" src` → ingen treff.

### Task 4: Felles plassholderstil

**Files:**
- Modify: `src/style.css`
- Modify: `DESIGN.md` (nytt kort avsnitt «Plassholdere ved lasting», under mønstrene)

**Interfaces:**
- Produces: CSS-klassene `.skeleton` (flate `#1f2937`, glans `#334155` som glir over, avrundet 0.3125rem), `.skeleton--circle` (rund), `.fade-in` (inntoning 0.25 s). Under `prefers-reduced-motion: reduce`: `.skeleton` uten animasjon (ensfarget `#1f2937`), `.fade-in` uten animasjon.

- [ ] **Step 1:** Legg klassene i `@layer components` med egne `@keyframes`.
- [ ] **Step 2:** `DESIGN.md`: plassholderen står på samme plass og i samme størrelse som innholdet; faste tekster vises med en gang, bare data venter; `.skeleton` / `.skeleton--circle`; `.fade-in` bare når innholdet erstatter en plassholder; ingen tidsgrense.
- [ ] **Step 3: Verifiser.** `npm run type-check` → ren.

### Task 5: Forsiden med plassholdere

**Files:**
- Modify: `src/views/TemplateSessions.vue` (`isLoading` 33, ukekortet 296–438, aktive økter 440–…, maloversikten 497–…, scoped CSS)

**Interfaces:**
- Consumes: `localDataReady` (Task 1), `exerciseIndex` (bølge 2), `.skeleton`/`.skeleton--circle`/`.fade-in` (Task 4), `useTrainingGoals().goals`, `CHAIN_LENGTH` fra `@/composables/goalStreak`.
- Lokalt i fila:
  ```ts
  const localReady = computed(() => workoutData.localDataReady.value);
  const exercisesReady = computed(() => workoutData.exerciseIndex.value.size > 0);
  /** One row per target in the plan: strength groups with a target, plus cardio minutes and km. */
  const reservedGoalRows = computed<number>(/* from goals.setsPerMuscleGroup (> 0), cardio.minutesPerWeek > 0, cardio.kilometresPerWeek > 0 */);
  // Captured once at setup: fade in only where content replaces a placeholder.
  const fadeWave1 = !localReady.value;
  const fadeWave2 = !exercisesReady.value;
  ```

- [ ] **Step 1: Ukekortet** rendres alltid (fjern `v-if="!isLoading"`). Faste tekster (tittel, «Uke N», ukedagsnavn) står fra start.
  - Med mål (`hasGoals`): før `exercisesReady` vises plassholder for streak-hodet (sirkel + to streker, inkludert metalinja), kjeden (`CHAIN_LENGTH` ledd) og målpanelet (overskriftsstrek + `reservedGoalRows` rader med sirkel og to streker). Etter: dagens streak- og målinnhold, med `fade-in` når `fadeWave2`. Mellomformen «Ukens sett» før streaken er klar, vises ikke lenger når brukeren har mål.
  - Uten mål: før `localReady` plassholder for ukestall-raden; etter: dagens reserveformer.
  - Dagsprikkene er `skeleton--circle` til `localReady`. Motivasjonslinja er en strek til `localReady`.
- [ ] **Step 2: Aktive økter** rendres først når `localReady` (fjern det gamle `isLoading`-skjelettet).
- [ ] **Step 3: Malene:** før `localReady` vises to plassholderkort (navn, «N øvelser», fire rader med sirkel + strek + kort strek) med «Rediger» og «Start Økt» som ikke-klikkbare flater i samme stil som knappene. «Ingen økter opprettet enda» vises bare når `localReady` og ingen maler. I ekte kort er muskelgruppe-prikk og -navn plassholdere til `exercisesReady`. Fjern det gamle `isLoading`-skjelettet og `isLoading`-computed.
- [ ] **Step 4: Verifiser.** `npm run type-check` og `npm run build` → rene. `grep -n "isLoading" src/views/TemplateSessions.vue` → ingen treff.

### Avslutning

- [ ] Én avsluttende gjennomgang av hele diffen med en fersk agent, med Review Focus som sjekkliste.
- [ ] Sjekkliste til Eivind for manuell test: kald start på telefonen (installert PWA), kald start med «Slow 3G» og «Offline» i DevTools, utlogging/innlogging, tilbake til forsiden fra andre sider, «reduser bevegelse» på.
