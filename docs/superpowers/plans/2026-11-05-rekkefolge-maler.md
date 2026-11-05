# Rekkefølge på malene — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold inne og dra malkortene på forsiden for å endre rekkefølgen; rekkefølgen lagres på telefonen per bruker.

**Architecture:** En liten modul `templateOrder.ts` (uten imports) sorterer malene etter en lagret id-liste og leser/skriver den i `localStorage`. `TemplateSessions.vue` holder en id-liste i render-rekkefølge som `useLongPressReorder` flytter i, og lagrer den etter hvert dra. `TemplateCard.vue` endres ikke.

**Tech Stack:** Vue 3, TypeScript, Node 22 `--experimental-strip-types` for selvsjekk.

**Spec:** `docs/superpowers/specs/2026-11-05-rekkefolge-maler-design.md`

## Global Constraints

- Ikke commit, stage, branch eller push. Kommentarer på engelsk, stilen i fila, ingen omformatering. Last `my-vue-style` før `.vue`-endringer.
- `localStorage`-tilgang alltid i try/catch; uten lagring faller lista tilbake til opprettelsesrekkefølge.
- Verifisering: selvsjekk + `npm run type-check`; til slutt `npm run build`.

## Review Focus

1. **Mal opprettet eller slettet etter at rekkefølgen er lagret:** ny mal nederst, slettet forsvinner, resten beholder rekkefølgen.
2. **Mal oppdatert (navn/farge) etter et dra:** kortet viser ny verdi (lista holder id-er, ikke gamle objekter).
3. **Trykk og startknapp:** et kort trykk åpner/lukker og starter som før; klikket etter et dra svelges (verken åpning eller start).
4. **To brukere / bytte bruker:** rekkefølgen er per bruker-id.
5. **Uten lagring (privat modus, full lagring):** ingen feil, opprettelsesrekkefølge.

---

### Task 1: `templateOrder.ts` + selvsjekk

**Files:**
- Create: `src/composables/templateOrder.ts`
- Test: `<scratchpad>/check-template-order.ts`

**Interfaces:**
- Produces:
  ```ts
  /** Saved order first (ids not present are skipped), then the rest in the order given. Input not mutated. */
  export const orderTemplates: <T extends { id: string }>(templates: T[], order: string[]) => T[];
  export const loadTemplateOrder: (userId: string) => string[];        // [] when missing/unreadable
  export const saveTemplateOrder: (userId: string, ids: string[]) => void;
  // localStorage key: `lift-template-order:<userId>`
  ```

- [ ] **Step 1: Selvsjekk:**
  ```ts
  const t = (...ids: string[]) => ids.map((id) => ({ id }));
  const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join(",");
  assert(ids(orderTemplates(t("a", "b", "c"), [])) === "a,b,c");            // no saved order → as given
  assert(ids(orderTemplates(t("a", "b", "c"), ["c", "a"])) === "c,a,b");    // saved first, new at the end
  assert(ids(orderTemplates(t("a", "b"), ["x", "b", "a"])) === "b,a");      // deleted ids skipped
  const input = t("a", "b"); orderTemplates(input, ["b", "a"]);
  assert(ids(input) === "a,b");                                             // input not mutated
  assert(ids(orderTemplates(t("a", "b"), ["b", "b", "a"])) === "b,a");      // duplicates in saved order don't duplicate
  ```
- [ ] **Step 2:** `node --experimental-strip-types <scratchpad>/check-template-order.ts` → feiler (modulen finnes ikke).
- [ ] **Step 3:** Implementer.
- [ ] **Step 4:** Selvsjekken → OK. `npm run type-check` → ren.

### Task 2: Dra malkortene på forsiden

**Files:**
- Modify: `src/views/TemplateSessions.vue` (malistens markup og CSS `.tpl-list`)
- Modify: `DESIGN.md` («Malkort»: hold inne og dra; én kolonne)

**Interfaces:**
- Consumes: Task 1, `useLongPressReorder` (`draggingIndex`, `dragTranslateY`, `onRowPointerDown(event, index)`, `consumeClickSuppression()`).

- [ ] **Step 1:** `templateOrderIds = ref<string[]>([])`, satt til `orderTemplates(workoutData.templates.value, loadTemplateOrder(userId)).map(t => t.id)` av en watch på mal-id-ene (`map(id).join`) og bruker-id (`immediate`). Rendr `templateOrderIds` → mal via et `Map` på id (hopp over ukjente).
- [ ] **Step 2:** `useLongPressReorder({ getItems: () => templateOrderIds.value, listEl: <ref på .tpl-list>, onReordered: () => saveTemplateOrder(userId, [...templateOrderIds.value]) })`.
- [ ] **Step 3:** Hvert `TemplateCard` i en omslutning (`.tpl-item`, key = id) med `@pointerdown="onRowPointerDown($event, index)"`, `@click.capture` som stopper og forhindrer klikket når `consumeClickSuppression()` er sann, `user-select: none`, og under dra: klassen `.tpl-item--dragging` (posisjon relativ, `z-index`, `transform: translateY(dragTranslateY) scale(1.02)`, skygge som `.ex-item--dragging` i malskjemaet).
- [ ] **Step 4:** Fjern to-kolonneregelen for `.tpl-list`. `DESIGN.md` oppdateres.
- [ ] **Step 5: Verifiser.** `npm run type-check` og `npm run build` → rene.

### Avslutning

- [ ] Én avsluttende gjennomgang av diffen med en fersk agent, med Review Focus som sjekkliste.
- [ ] Sjekkliste til Eivind: dra en mal opp og ned; lukk og åpne appen (rekkefølgen står); lag ny mal (nederst); slett en; trykk og start som før; et dra skal verken åpne kortet eller starte økt.
