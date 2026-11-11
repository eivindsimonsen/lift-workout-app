# Dra arkene ned for å lukke — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Malarket og øktarket kan dras ned i toppen (streken og headeren) for å lukkes.

**Architecture:**
- `useSheetDrag.ts` har tilstanden for gesten (`idle | dragging | settling | closing`) og gir stil for panel og bakgrunn, pluss handlere for gripeflaten.
- Selve beslutningene ligger i rene, eksporterte funksjoner som selvsjekken tester: om en bevegelse er en dragning nedover, og om et slipp skal lukke.
- Begge arkene kobler til gripeflaten og stilene.

**Tech Stack:** Vue 3 og TypeScript. Selvsjekken bundles med esbuild og kjøres i Node 22.

**Spec:** `docs/superpowers/specs/2026-11-11-dra-ark-ned-design.md`

## Global Constraints

- **Git og stil:** ikke commit, stage, branch eller push. Kommentarer på engelsk. Last `my-vue-style` før endringer i `.vue`, og ikke omformater hele filer.
- **I `WorkoutSession.vue`:** endre bare markupen og CSS-en til arket, pluss ett kall til composablen. Ingen annen logikk.
- **Bevegelse:** under `prefers-reduced-motion` er det ingen overganger.
- **Selvsjekk:** `npx esbuild <scratchpad>/check-sheet-drag.ts --bundle --platform=node --format=esm --log-level=warning --outfile=<scratchpad>/check-sheet-drag.mjs && node <scratchpad>/check-sheet-drag.mjs`. Til slutt `npm run type-check` og `npm run build`.

## Review Focus

1. **Et trykk på streken uten bevegelse lukker fortsatt, og pilene og blyanten virker.** Hjelperen `isDownwardDrag` gir false under 6 px (Task 1, steg 1).
2. **Et klikk etter en dragning, også en som sprett tilbake,** trykker ikke på pilene eller blyanten. Sjekkes manuelt.
3. **En dragning oppover eller sidelengs** blir ingen dragning (Task 1, steg 1).
4. **Et kort, raskt sveip** lukker, og et langsomt, kort drag spretter tilbake (Task 1, steg 1).
5. **Etter at arket er lukket med dragning, åpnes det igjen** i normal posisjon, ikke forskjøvet. Sjekkes manuelt.

---

### Task 1: `useSheetDrag.ts`

**Files:**
- Create: `src/composables/useSheetDrag.ts`
- Test: `<scratchpad>/check-sheet-drag.ts`

**Interfaces:**
- Produces:
  ```ts
  /** Downward movement before a press on the grab area becomes a drag. */
  export const DRAG_START_PX = 6;
  /** True once the movement is a drag down: more than DRAG_START_PX, and more down than sideways. */
  export const isDownwardDrag: (dx: number, dy: number) => boolean;
  /** Close when pulled past a quarter of the panel's height, or flicked down (> 0.5 px/ms) after at least 24 px. */
  export const shouldCloseSheet: (dy: number, panelHeight: number, velocityPxPerMs: number) => boolean;
  export interface SheetDragOptions { panelEl: Ref<HTMLElement | null>; isOpen: () => boolean; onClose: () => void }
  export const useSheetDrag: (options: SheetDragOptions) => {
    panelStyle: ComputedRef<Record<string, string>>;    // {} while idle, so the Transition owns the transform
    backdropStyle: ComputedRef<Record<string, string>>;
    onGrabPointerDown: (event: PointerEvent) => void;
    onGrabClickCapture: (event: MouseEvent) => void;    // swallows the click that ends a drag
  };
  ```

- [ ] **Step 1: Selvsjekk.**
  ```ts
  assert.equal(isDownwardDrag(0, 5), false);    // a tap's jitter
  assert.equal(isDownwardDrag(0, 7), true);
  assert.equal(isDownwardDrag(10, 8), false);   // more sideways than down
  assert.equal(isDownwardDrag(0, -20), false);  // upward
  assert.equal(shouldCloseSheet(160, 600, 0.1), true);   // past a quarter
  assert.equal(shouldCloseSheet(140, 600, 0.1), false);
  assert.equal(shouldCloseSheet(40, 600, 0.8), true);    // short fast flick
  assert.equal(shouldCloseSheet(20, 600, 0.8), false);   // too short even if fast
  ```
- [ ] **Step 2:** Kjør selvsjekken. Forventet: FAIL, fordi modulen ikke finnes.
- [ ] **Step 3: Implementer.**
  - **Hendelser:** `pointerdown` på gripeflaten (bare primærknappen) starter en mulig gest, men bare når `panelEl.scrollTop <= 0`. `pointermove`, `pointerup` og `pointercancel` lyttes på `window` fra `onMounted` til `onUnmounted`.
  - **Dragningen:** gesten blir en dragning når `isDownwardDrag` er sann. Da blir `dy` til `translateY(max(0, dy))`.
  - **Fart:** farten regnes fra punktene de siste 100 ms.
  - **Ved slipp:**
    - Når `shouldCloseSheet` er sann, går arket til `closing`. Panelet animeres til `translateY(<høyden>px)` (0,22 s), bakgrunnen til opasitet 0, og `onClose()` kalles etter 220 ms.
    - Ellers går arket til `settling`. Panelet animeres tilbake til 0 (0,25 s ease-out), og så til `idle`.
    - Under reduced motion er det ingen overganger og ingen ventetid.
  - **Når `isOpen` blir sann igjen** (`watch`), nullstilles alt til `idle`.
  - **Klikket som følger en dragning,** svelges av `onGrabClickCapture`.
- [ ] **Step 4:** Kjør selvsjekken (forventet OK) og `npm run type-check` (forventet ren).

### Task 2: Koble begge arkene

**Files:**
- Modify: `src/components/TemplateSheet.vue`
- Modify: `src/views/WorkoutSession.vue` (bare `.ex-sheet`-markupen, CSS-en og kallet til `useSheetDrag`)
- Modify: `DESIGN.md` («Bunnark (aktiv økt)»: arket kan dras ned i toppen)

- [ ] **Step 1: Malarket.** Legg `ref` på panelet og kall `useSheetDrag({ panelEl, isOpen: () => props.template !== null, onClose: () => emit("close") })`. Panelet får `:style="panelStyle"`, og bakgrunnen `:style="backdropStyle"`. Streken og `<header>` får `@pointerdown`, `@click.capture` og en klasse med `touch-action: none`.
- [ ] **Step 2: Øktarket.** Gjør det samme, med `isOpen: () => activeExerciseIndex.value !== null` og `onClose: closeExerciseSheet`. Gripeflaten er streken og `.ex-sheet__header`.
- [ ] **Step 3: `DESIGN.md`.** Legg til at begge arkene kan dras ned i toppen (streken og headeren), og at de lukkes etter en fjerdedel av høyden eller ved et raskt sveip.
- [ ] **Step 4:** Kjør `npm run type-check` og `npm run build`. Forventet: begge rene.

### Avslutning

- [ ] Én avsluttende gjennomgang av diffen med en fersk agent.
- [ ] Sjekkliste til Eivind på telefon, i begge arkene:
  - [ ] Dra litt ned og slipp: arket spretter tilbake.
  - [ ] Dra langt ned, eller sveip raskt: arket lukkes.
  - [ ] Et trykk på streken lukker.
  - [ ] Pilene og blyanten virker.
  - [ ] Tallfelt, sveip for å slette og rulling inne i arket virker som før.
