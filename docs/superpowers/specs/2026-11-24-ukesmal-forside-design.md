# Ukesmål på forsiden — design

## Hvorfor

Forsiden og Ukesoversikt snakker ikke sammen. Streaken vises på forsiden, men forklares bare i Ukesoversikt. Ukesmålene stilles inn bak et tannhjul i Ukesoversikt, og ingenting sier at det er der de bor. Eivind vil at siden skal hete det den handler om, og at streaken skal stå ett sted, med forklaringen der den vises.

Skissene ble laget i nettleseren med tre retninger for forsiden: to paneler (A), ett panel delt i to (B) og dagens kort med en (i) som åpner et ark (C). Eivind valgte C, fordi den er kompakt, med en liten (i) som en fotnote etter teksten.

## Hva

### Forsiden ([TemplateSessions.vue](../../../src/views/TemplateSessions.vue))

- **Panelet heter «Ukesmål»** i stedet for «Denne uken». Ellers er det som i dag: «Uke 48» og chevron, streak, kjede, «Rekord N» og dagsporet. Et trykk hvor som helst i panelet åpner ukesiden, som før.
- **(i) etter «uker på rad»** (eller etter «Start en ny streak»): et lite info-merke, 12 px, hevet som en fotnote, i `#64748b`. Trykkflaten er en usynlig sirkel på 44 px. Den åpner arket under.
- **Arket «Ukestreak»** (ny komponent), et bunnark i arkets farger som malarket:
  - to tall: «N uker / på rad nå» og «N uker / rekord»;
  - de tre reglene, med samme tekst som i dag i Ukesoversikt;
  - knappen «Endre ukesmål» (feltpaletten), som lukker arket og åpner `WeekGoalsSettings`.
- **Uten ukesmål:** totalene (Økter, Volum, Sett) og de to fremdriftsreservene («Ukens sett», «Ukens kondisjon») erstattes av én dempet linje: «Ingen ukesmål ennå. Sett opp ›». «Sett opp ›» åpner `WeekGoalsSettings` direkte. Resten av panelet åpner ukesiden som før.

### Ukesiden ([WeekDetails.vue](../../../src/views/WeekDetails.vue))

- Brødsmula heter **«Ukesmål»** i stedet for «Ukesoversikt». Tittelen er fortsatt «Uke 48», siden man kan bla til tidligere uker.
- **Tannhjulet blir som det er.** (Eivinds ønske, fordi en knapp med tekst tar for mye plass.)
- **Streakraden og «Slik fungerer det» fjernes**, med logikken som bare hørte til dem.
- **«Sett opp ukesmål» vises også i en tom uke.** I dag vises den bare når uka har økter, så en ny bruker uten økter ser bare tannhjulet.

### DESIGN.md

- «Streak i Ukesoversikt» skrives om til «Streak på forsiden»: (i), arket og linja uten mål.
- «Ukesoversikt» blir «Ukesmål» der siden nevnes (fasitlista, malfarger, malfliser, kjente avvik).
- Arket legges til lista over ark med «Dra ned for å lukke».

## Tilnærming

- **Valgt: overlay-lenke.** Panelet blir en `<div>`, og lenka til ukesiden blir et usynlig lag som dekker hele panelet. (i) og «Sett opp ›» ligger over laget som vanlige knapper. Det er gyldig HTML, skjermlesere håndterer det godt, og trykket oppleves som i dag.
- **Valgt bort: knapper inne i `<router-link>`** med `@click.stop.prevent`. Det er en mindre endring, men ugyldig HTML, og trykket tilstand og langtrykkmeny på mobil oppfører seg rart.
- **Valgt: nytt lite bunnark etter mønsteret i [TemplateSheet.vue](../../../src/components/TemplateSheet.vue)** (`Teleport`, `useSheetDrag`, `useBodyScrollLock`, arkfargene). Det likner skissen og oppfører seg som malarket på samme side.
- **Valgt bort: gjenbruke [SlideOver.vue](../../../src/components/SlideOver.vue).** Det gir nesten ingen ny kode, men panelet glir inn fra siden med tittellinje, likner ikke skissen og oppfører seg annerledes enn malarket.
- Tallene kommer fra `useGoalStreak` (`current`, `best`), som forsiden allerede bruker. Det blir ingen ny regel for hva som teller.

## Mål, ikke-mål og anti-mål

- **Mål:**
  - Streaken står ett sted, på forsiden, med forklaringen der den vises.
  - Navnet «Ukesmål» sier hvor målene bor.
  - En ny bruker uten mål får vite at mål finnes.
- **Ikke-mål:**
  - endringer i hvordan streaken regnes;
  - endringer i innholdet i `WeekGoalsSettings`;
  - tekst på tannhjulet;
  - ny rute eller nytt filnavn (`/week` og `WeekDetails.vue` blir);
  - hva som gjenstår denne uka på forsiden.
- **Anti-mål:**
  - Et trykk på (i) eller «Sett opp ›» som åpner ukesiden, eller omvendt.
  - Et panel som føles annerledes å trykke på enn i dag, for eksempel uten trykket tilstand.
  - Klikkbare elementer inne i en lenke.

## Begrensninger

- Følg `DESIGN.md` og `my-vue-style`. UI-tekst på bokmål, kommentarer på engelsk.
- Trykkflater minst 44 px. Hover bare med mus. `prefers-reduced-motion` respekteres i arket.
- Ingen testrunner: `npm run type-check` og `npm run build` skal være rene.

## Mine valg (kan endres i gjennomgang)

- (i) vises bare når den ekte streaken står der, ikke på plassholderen ved lasting.
- Panelets trykkede tilstand beholdes når lenka er et lag (for eksempel med `:has()` eller ved at laget tegner kanten).
- Lenka får et tilgjengelig navn, «Ukesmål, uke 48».
- «Sett opp ukesmål» på ukesiden vises for alle uker uten mål, som i dag, bare uten kravet om økter.
- Kommentarer i koden som nevner «Ukesoversikt», oppdateres.

## Overlatt til den som bygger

- Nøyaktig plassering av (i) i forhold til teksten, innenfor det skissen viste.
- Hvordan arket ser ut med streak 0 («0 uker på rad nå») og uten rekord.
