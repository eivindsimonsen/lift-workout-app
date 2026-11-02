# Ukestreak — design

## Hvorfor

Eivind vil ha mer motivasjon til å fullføre ukesmålet. En streak teller hvor mange uker på rad målet er nådd. Uka er fortsatt enheten — hviledager bryter ingenting, så dette er i tråd med treningsfilosofien (ingen daglige streaks).

## Mål

- Telle sammenhengende uker der ukesmålet er nådd, og vise tallet på forsiden.
- Prestasjoner for 3, 5, 10, 15 og 30 uker på rad.
- Gamle uker vurderes mot målet som gjaldt da. Å øke målet skal ikke ta fra deg streaken.

## Ikke-mål

- Daglige streaks eller «dager på rad».
- Streak på uke-detaljsiden (`WeekDetails.vue`) — kun forsiden.
- Varsler, «jokeruker» eller redigering av historiske mål.

## Når er en uke godkjent

- **Styrke:** hver muskelgruppe med mål > 0 har minst så mange tellede sett. Ikke summen — alle gruppene hver for seg. Grupper uten mål ignoreres.
- **Kondisjon** (vår beslutning): minutter-målet og km-målet må begge nås hvis de er satt (> 0). Samme avrunding som `cardioGoalProgress` i `useWeekStats`.
- Har en plan både styrke- og kondisjonsmål, må alt være nådd.
- En uke uten mål (`planId: 'none'` eller ingen mål > 0) er ikke godkjent.
- Hva som er et tellet sett, og hvilken muskelgruppe det hører til, avgjøres som i dag: `isSetCounted`/`setDuration`/`setDistance` fra `useSetMetrics` og oppslag via `exerciseIndex` på id. Kondisjon telles aldri som sett i en muskelgruppe.

## Streak-regler

- **Nåværende streak:** tell bakover fra forrige uke så lenge ukene er godkjent. Er inneværende uke allerede godkjent, legges den til (+1). En pågående uke som ikke er nådd ennå, bryter ikke streaken.
- **Beste streak:** lengste sammenhengende rekke over hele historikken (inkludert inneværende uke hvis godkjent).
- Prestasjonene bruker beste streak, så et merke beholdes når det først er tatt.

## Tilnærming

Vurderte:

- **A. Frys resultat ved ukeslutt** — lagre «godkjent/ikke» per uke i `user_metadata`. Krever skriving etter hver uke (offline, flere enheter) og starter på 0 uten historikk. Valgt bort.
- **B. Målhistorikk + utregning (valgt)** — lagre når målene endret seg, og regn ut streaken fra øktene. Ingen jobb ved ukeslutt, virker offline, gir streak fra eksisterende historikk med en gang. Kjent konsekvens: sletter du en gammel økt, eller flyttes en øvelse til en annen muskelgruppe / slettes fra biblioteket, kan gamle uker endre seg. Akseptert — slettede økter skal ikke telle.

## Målhistorikk (B)

- Lagres i `user_metadata` ved siden av `trainingGoals`, og speiles lokalt slik målene gjør i dag (`useTrainingGoals`), slik at streaken vises offline og med en gang.
- Form: liste med `{ from: <mandag i uka som ISO-dato>, goals: TrainingGoals }`, sortert på `from`.
- `saveGoals` legger til en oppføring for inneværende uke, eller erstatter den hvis det allerede finnes en for samme uke.
- **Første lagring** når historikken er tom: legg først inn de *forrige* målene som gjeldende for all tid før denne uka, deretter de nye. Uten dette ville eldre uker blitt vurdert mot de nye målene — akkurat det vi vil unngå.
- **Oppslag:** en uke vurderes mot siste oppføring med `from` ≤ ukas mandag. Uker før første oppføring bruker den eldste. Tom historikk → dagens mål.
- Endring midt i en uke gjelder dermed hele den uka (samme mål som forsiden viser).
- Normaliseres med `normalizeGoals` ved lesing, som målene i dag.

## Visning

### Forsiden — uke-kortet (`TemplateSessions.vue`)

Valgt variant D fra skissene («Kjeden + hold liv i den»). Følg `DESIGN.md`: ingen emoji, gradienter eller glød i grensesnittet. Flammen er samme SVG som i sidens header.

Rekkefølge i kortet: header («Denne uken» · «Uke N») → streak-blokk → dagsporet (uendret) → målboksen → motivasjonsteksten (uendret).

**Streak-blokk**
- Flamme-ikon (oransje) + nåværende streak som stort tall (~1.75rem / 700) + «uker på rad».
- Metalinje under: «Rekord N · neste merke ved M». Rekord utelates når den er lik nåværende streak; neste merke utelates over 30.
- Kjeden: de siste 10 ukene som like brede ledd, eldst til venstre, inneværende uke ytterst til høyre. Godkjent = grønn (`#22c55e`), ikke godkjent = `#1f2937`, inneværende uke = innfelt spor med oransje fyll for ukas fremdrift, og helt grønn når den er godkjent.
- **Ukas fremdrift** (fyllet i siste ledd): snittet av `min(1, gjort / mål)` over alle mål uka har (hver muskelgruppe og hvert kondisjonsmål teller likt). Blir 100 % nøyaktig når uka er godkjent.
- Streak 0 (vår beslutning): skjules ikke. Overskriften blir «Start en ny streak», med rekord i metalinja hvis det finnes en. Kjeden vises som vanlig.

**Målboksen** erstatter dagens «Ukens sett X / Y»-søyle og kondisjonssøyle når brukeren har mål — totalen er ikke regelen lenger, så den skal ikke se ut som om den er det.
- Ikke godkjent: tittel «Igjen for å holde streaken» (ved streak 0: «Igjen for å nå ukesmålet»), med sum gjenstående sett til høyre. Én rad per mål som ikke er nådd: farget prikk (muskelgruppens farge), navn, «gjort / mål» og «N igjen» i tonet oransje. Kondisjonsmål får egne rader i minutter og km (cyan prikk). Under: «✓ X av Y muskelgrupper er nådd» i grønt når minst én er nådd.
- Godkjent: grønn tonet boks (`#16a34a1a` / `#16a34a50`) med hake, «Uka er i boks — N uker på rad» og «Alle mål nådd. Resten av uka er bonus.»
- Overgangen til godkjent: tallet teller opp fra N−1 til N og siste ledd blir grønt — én gang per uke per enhet (husket i `localStorage`), av under `prefers-reduced-motion: reduce`.

**Uten mål** ser kortet ut som i dag (rene totaler, ingen streak). Mens øvelsesbiblioteket ikke er lastet, vises dagens målboks uten streak-blokk, så det ikke blinker med «0».

### Statistikk

- (`Stats.vue`): fem nye prestasjoner i den eksisterende lista — «3 uker på rad», «5 uker på rad», «10 uker på rad», «15 uker på rad», «30 uker på rad». Vår beslutning: de bruker beste streak over hele historikken, uavhengig av årsfilteret, slik at en streak over nyttår ikke deles i to. Vises bare når brukeren har mål.

## Øvrig

- Oppdater linjen i `CLAUDE.md` til å si «ingen daglige streaks; ukestreaks mot ukesmålet er ok».
- Ingen databaseendring — alt ligger i `user_metadata`.

## Overlatt til den som bygger

- Hvor utregningen bor (egen composable eller i `useWeekStats`) og om muskelgruppe-tellingen trekkes ut som delt hjelpefunksjon. Krav: samme telleregler som `useWeekStats.muscleGroups`, og utregning for alle uker i én gjennomgang av øktene (ikke ett `useWeekStats`-kall per uke).
- Nøyaktige mål på avstander og skriftstørrelser innenfor rammene i `DESIGN.md`.
- Om kjeden og målboksen blir egne komponenter eller blir i `TemplateSessions.vue`.
