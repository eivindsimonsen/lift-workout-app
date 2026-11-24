# Malfarge som toning på forsiden — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Malflisene og panelet for aktiv økt toner inn malfargen fra hjørnet/ringen, som skisse B.

**Architecture:**
- Ren CSS i de to komponentene, med malfargen som CSS-variabel og `color-mix()`. En flat reserve står foran, så eldre nettlesere får dagens utseende.
- `TemplateSessions.vue` slår opp malen til aktiv økt i `templatesById` og sender fargen som prop til `ActiveSessionButton`.

**Tech Stack:** Vue 3, TypeScript, scoped CSS.

**Spec:** `docs/superpowers/specs/2026-11-24-malfarge-toning-design.md`

## Global Constraints

- **Git og stil:** ikke commit, stage, branch eller push. Kommentarer på engelsk. `my-vue-style` (script → template → style). Ikke omformater hele filer.
- **Flis:** `linear-gradient(155deg, color-mix(in srgb, var(--tpl-color) 22%, #111827) 0%, #111827 62%)`, kant `color-mix(in srgb, var(--tpl-color) 30%, #1f2937)`.
- **Aktiv økt:** `linear-gradient(90deg, color-mix(in srgb, <farge> 24%, #1a2233) 0%, #1a2233 70%)`, kant `color-mix(in srgb, <farge> 40%, #2d3a4f)`, ringspor `color-mix(in srgb, <farge> 25%, #243044)`. Trykket: samme toning over `#243044`.
- **Reserve:** hver `color-mix`-deklarasjon har en flat deklarasjon foran seg med dagens verdi.
- **Fargen til aktiv økt:** malens egen `color`, ellers `null`. `null` gir dagens farger: `#f97316`, eller `#06b6d4` for bare kondisjon.
- **Sjekk:** `npm run type-check` og `npm run build` rene. Skjermbilde av forsiden innlogget (Playwright i scratchpad, 390×844, `serviceWorkers: "block"`), bare lesing.

## Review Focus

1. **Mal uten farge eller slettet mal i aktiv økt** gir dagens oransje (eller cyan) panel, ikke grått (Task 2).
2. **Sveip for å avbryte**: toningen er ugjennomsiktig, så den røde bakgrunnen bak `SwipeableCard` synes ikke gjennom før man sveiper (Task 2, skjermbilde).
3. **Løftet flis under dra** beholder toningen og skyggen (Task 1, manuelt på telefon).
4. **Gråtonet mal uten farge** på flisa ser ut omtrent som i dag og ikke skitten (Task 1, skjermbilde).
5. **Kondisjonsøkt fra mal med farge** får hel ring i malfargen (Task 2).

---

### Task 1: Toning på malflisene

**Files:**
- Modify: `src/components/TemplateCard.vue` (`.tpl-tile`, `.tpl-tile:active`)

**Interfaces:**
- Consumes: `--tpl-color` som flisa allerede setter fra `templateColorOf(props.template)`.

- [ ] **Step 1:** Gi `.tpl-tile` toningen og kanten fra Global Constraints, med flat `background: #111827` / `border-color: #1f2937` foran.
- [ ] **Step 2:** `.tpl-tile:active` får kant `color-mix(in srgb, var(--tpl-color) 55%, #1f2937)`, med `#334155` foran som reserve.
- [ ] **Step 3:** `npm run type-check`. Forventet: ingen feil.

### Task 2: Toning og malfarge i panelet for aktiv økt

**Files:**
- Modify: `src/components/ActiveSessionButton.vue`
- Modify: `src/views/TemplateSessions.vue` (der `<ActiveSessionButton>` brukes, og script)

**Interfaces:**
- Produces: `ActiveSessionButton` tar prop `color: string | null` (malens egen farge, `null` uten farge eller mal).
- Consumes: `templatesById` i `TemplateSessions.vue`.

- [ ] **Step 1:** I `TemplateSessions.vue`: `activeSessionColor = computed(() => templatesById.value.get(activeSession.value?.templateId ?? "")?.color || null)`, og send den som `:color`.
- [ ] **Step 2:** I `ActiveSessionButton.vue`: `ringColor` blir `props.color ?? (isCardioOnly ? "#06b6d4" : "#f97316")`. Sett den som `--tint` på hele panelet i stedet for bare på ringen.
- [ ] **Step 3:** Panelets bakgrunn, kant, trykket tilstand og ringspor fra Global Constraints, med flate reserver.
- [ ] **Step 4:** Ringen maskeres (`mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4.5px))`, også `-webkit-mask`) i stedet for den indre sirkelen i `#1a2233`, så toningen synes midt i. Den pulserende prikken står sentrert i ringen som før.
- [ ] **Step 5:** `npm run type-check`. Forventet: ingen feil.

### Task 3: Dokumentasjon og sjekk

**Files:**
- Modify: `DESIGN.md` (Malfliser, Panel for aktiv økt, Ikke gjør)
- Modify: `CLAUDE.md` (linja om malfarge under Data model)

- [ ] **Step 1:** `DESIGN.md`: Malfliser beskriver toningen fra øvre venstre hjørne og den tonede kanten (fjern «uten fargekant» og «en markør, ikke en flate»). Panel for aktiv økt beskriver toningen fra ringen, ring i malfargen og reserven uten farge. «Ikke gjør» får unntaket for malfargetoningen på forsiden.
- [ ] **Step 2:** `CLAUDE.md`: malfargen toner også malflisa og panelet for aktiv økt på forsiden.
- [ ] **Step 3:** `npm run build`. Forventet: bygget uten feil.
- [ ] **Step 4:** Skjermbilde av forsiden innlogget, 390 og 320 px bredde. Sammenlign med skisse B.
