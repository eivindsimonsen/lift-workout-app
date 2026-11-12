# DESIGN.md

Designstilen for LIFT. Nye sider, og sider som tegnes om, følger dette. Fasiten er **Ukesoversikt** ([WeekDetails.vue](src/views/WeekDetails.vue)), **Øktdetaljer** ([SessionDetails.vue](src/views/SessionDetails.vue)), **Historikk** ([History.vue](src/views/History.vue)), **Øvelsesdetaljer** ([ExerciseDetail.vue](src/views/ExerciseDetail.vue)), **Statistikk** ([Stats.vue](src/views/Stats.vue)) og **Profil** ([Profile.vue](src/views/Profile.vue)). Står noe her i strid med de sidene, er det dokumentet som skal rettes.

Bare innloggingssidene bruker fortsatt den gamle `.card`-stilen. Se [Kjente avvik](#kjente-avvik) nederst.

## Prinsipper

- **Paneler, ikke kort i kort.** Et panel samler ett tema, for eksempel «Styrke» eller «Kondisjon». Innholdet i panelet deles med tynne skillelinjer, ikke med nye bokser.
- **Typografi før bokser.** Hierarkiet skal komme fra størrelse, vekt og farge på teksten. Trenger du en ramme for å skille to ting, er det ofte for mange ting.
- **Venstrejustert.** Tall og tekst står venstrejustert. Midtstilte flis-rutenett med ikon over tall gir dashbordpreg og brukes ikke.
- **Farge bare når den betyr noe.** Oransje betyr styrke eller hovedhandling, cyan betyr kondisjon, og muskelgruppene har hver sin farge. Alt annet er gråtoner.
- **Styrke og kondisjon står hver for seg.** Kilo og kilometer blandes aldri i samme panel eller diagram.
- **Telefonen først.** Alt designes for 390 px bredde og tommel. Desktop er en bredere versjon av det samme.

## Farger

Fargene er i dag hex-verdier i scoped CSS, ikke variabler. Bruk verdiene under, og ikke finn på nye nyanser.

### Flater

| Rolle | Verdi | Brukes til |
|---|---|---|
| Side | `#0f172a` (`dark-900`) | `body` |
| Panel | `#111827`, kant `#1f2937` | Paneler |
| Skillelinje | `#1f2937`, 1 px | Mellom rader og seksjoner i et panel |
| Innfelt | `#0d1117` | Spor bak søyler, sett-brikker, notater |
| Ark og felt (aktiv økt) | ark `#1a2233`, kant `#2d3a4f`, felt `#243044`, feltkant `#3d5068` | Bunnarket og inndatafelt |

### Tekst

| Nivå | Verdi | Brukes til |
|---|---|---|
| Primær | `#fff` / `#f1f5f9` | Titler, nøkkeltall, navn |
| Sekundær | `#e2e8f0` / `#cbd5e1` | Verdier i lister og brikker |
| Dempet | `#94a3b8` | Metalinjer, enheter, seksjonstitler |
| Svak | `#64748b` | Etiketter og hjelpetekst. Aldri informasjon man *må* lese, fordi kontrasten er lav. |

### Aksenter

| Betydning | Verdi | Tonet variant (piller og valgt tilstand) |
|---|---|---|
| Styrke, hovedhandling og valgt | `#f97316` (`primary-500`), trykket `#ea580c` | bakgrunn `#f9731618`, kant `#f9731640`, tekst `#fdba74` |
| Kondisjon | `#06b6d4`, levende og tekst `#22d3ee` | bakgrunn `#06b6d414`, kant `#06b6d440` |
| Fullført og mål nådd | `#22c55e` / `#4ade80` | bakgrunn `#16a34a1a`, kant `#16a34a50` |
| Sletting og nedgang | `#ef4444` / `#f87171` | trykket `#7f1d1d40` |
| Pause | `#f59e0b` | Bare som tilstand på klokka |

- **Muskelgrupper** har faste farger i [muscle-groups.json](src/data/muscle-groups.json). Hent fargene derfra, ikke hardkod dem.
- **Malfarger** er de samme åtte kodene (`templateColors.ts` leser dem fra samme fil). Malfargen brukes på malflisa og i arket for malen, som prikk i Historikk og under «Økter denne uken» i Ukesoversikt, og i kalenderen i Statistikk. En mal uten farge, og en økt fra en slettet mal, er grå `#475569` — unntatt i kalenderen, der de blir oransje så en treningsdag aldri ser utrent ut.
- Bryst bruker samme oransje som styrkeaksenten. Det er greit, siden gruppen alltid står med navn ved siden av.
- Grønt og rødt betyr status (fullført og opp, slett og ned). Bruk dem aldri til å vise størrelse, for eksempel anstrengelse.

## Typografi

Fonten er Inter (Google Fonts, se `index.html`) og brukes overalt. Tallene formateres med `Intl` og `no-NO`, altså mellomrom i tusener og desimalkomma («12 400 kg», «77,5»).

| Rolle | Størrelse og vekt | Farge |
|---|---|---|
| Sidetittel | 1.5rem / 700 | `#fff` |
| Metalinje under tittel | 0.8125rem / 400, punktum-skille «·» | `#94a3b8` |
| Seksjonstittel (panel) | 0.75rem / 700, versaler, `letter-spacing: 0.08em` | `#94a3b8` |
| Undertittel i panel | 0.6875rem / 600, versaler, `letter-spacing: 0.05em` | `#64748b` |
| Nøkkeltall | 1.25rem / 700, enhet 0.8125rem / 500 | tall `#fff`, enhet `#94a3b8` |
| Hovedtall for én aktivitet | 2.5rem / 700, `letter-spacing: -0.02em` | `#fff` |
| Radnavn | 0.9375rem / 600 | `#f1f5f9` |
| Metatekst i rad | 0.75rem | `#64748b` |

- `tabular-nums` brukes bare der tall står under hverandre (lister, akser) og på klokker som teller live. Store, enkeltstående tall bruker vanlige siffer.
- Enheten står etter tallet i mindre, dempet tekst: «4 700 <small>kg</small>».
- Tid: én aktivitet skrives som klokke («1:32:12»), og summer som tekst («3 t 5 min»). Se `formatDuration` og `formatTotalTime`.

## Mønstre

### Panel og seksjonstittel

```css
.panel {
  padding: 1.125rem;
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 1rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}
```

- Panelene har `space-y-5` (1.25rem) mellom seg.
- En seksjonstittel som navngir styrke eller kondisjon, har en prikk på 0.5rem i aksentfargen foran seg.
- Inne i et panel får hver ny del `margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #1f2937`.

### Header

Siden har ingen kort øverst. Først kommer tilbakeknappen, så tittelen, så én metalinje med det viktigste konteksten (dato, varighet). Tilbakeknappen ser lik ut på alle sider og peker til forelderen i brødsmulene:

```html
<router-link
  to="/"
  class="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors"
  aria-label="Tilbake til …">
  <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
  </svg>
</router-link>
```

### Nøkkeltall

- Et rutenett med etikett over og tall under, venstrejustert.
- To kolonner på mobil og fire fra 640 px.
- Ingen bakgrunn eller ramme per tall.

### Rader i lister

- Radene skilles med en tynn linje over (`border-top: 1px solid #1f2937`) og har `padding: 0.875rem 0`.
- Navnet står til venstre og hovedverdien til høyre (`margin-left: auto`). Detaljer går i en metalinje under.

### Navigerbare lister (Historikk)

- Rader som åpner en annen side, går helt ut til panelets kanter (panelet har `overflow: hidden`, raden `padding: 0.875rem 1.125rem`). Da fyller trykket tilstand (`#161f2e`) hele raden. Til høyre står en chevron i `#475569`.
- Grupper, for eksempel måneder, får en seksjonstittel **utenfor** panelet, med antall til høyre. Grupper bare når rekkefølgen gir mening (dato), ikke når lista er sortert på noe annet.
- Høyreverdien sier hva økta var: kilo for styrke og tid for kondisjon. En blandet økt viser kilo med «+ kondisjon» under, så kilo og minutter aldri slås sammen til ett tall.

### Brikker og piller

| Type | Utseende |
|---|---|
| Pille | Radius 999px, tonet aksentfarge. Brukes til PR, anstrengelse og av/på-valg som «+ Km». |
| Av/på-pille | Av: felt-palett. På: tonet oransje, med × for å slå av. |

### Settliste

- Sett vises som én linje per sett i faste kolonner: nummer, vekt og reps. Bruk `tabular-nums`, med vekten høyrejustert så «80» og «77,5» står på linje ved enheten.
- Listen skal se lik ut med tre sett og med åtte. Ikke bruk brikker som brytes over flere linjer.
- Enhetene («kg», «reps») står i liten, svak tekst.
- Det tyngste settet fremheves i tonet oransje **bare når det er alene om å være tyngst**. Blant like sett er det første ikke spesielt.

### Søyler

- Sporet er innfelt (`#0d1117`). Fyllet har aksent- eller muskelgruppefarge.
- Høyde 0.3125–0.5rem. **Rett i starten, 4 px avrunding i enden.**
- Etikett og verdi står i tekstfarger ved siden av søylen, aldri i søylens farge.

### Plassholdere ved lasting

- Siden tegnes med en gang. Faste tekster (titler, ukedager, knapper) står fra start; bare det som venter på data, er plassholdere.
- En plassholder står **på samme plass og i samme størrelse** som innholdet den holder av: strek for tekst (`.skeleton`), sirkel for prikker (`.skeleton .skeleton--circle`). Når høyden er ukjent, reserveres det største, så innholdet aldri dytter noe nedover.
- `.skeleton` er flate `#1f2937` med en glans i `#334155` som glir over. `.fade-in` toner inn innhold som erstatter en plassholder — bare da, ikke ved hvert besøk.
- Ingen tidsgrense: plassholderen glinser til dataene kommer. Under `prefers-reduced-motion: reduce` står den stille.
- Fasit: forsiden ([TemplateSessions.vue](src/views/TemplateSessions.vue)).

### Malfliser (forsiden)

- **Fliser i rutenett** ([TemplateCard.vue](src/components/TemplateCard.vue)): to kolonner på telefon, også ved 320px, og flere på brede skjermer (`repeat(auto-fill, minmax(8.5rem, 1fr))`). Flisene på samme rad er like høye. Flisa er en panelflate med radius 0.875rem og uten fargekant. Malfargen står som en prikk foran navnet. Den er en markør, ikke en flate. Flisa har ingen startknapp: økta startes fra arket.
- **Innhold, ovenfra:**
  - navnet, på én linje;
  - tre tall under hverandre i samme format, stort tall med liten etikett under, så flisene står likt:
    - antall øvelser;
    - sist trent: «i dag», «i går», ukedagen eller datoen;
    - siste økt: kilo når økta hadde styrke, minutter når den bare var kondisjon, aldri kilo og minutter i ett tall. Hadde økta begge deler, står det «siste økt · + kondisjon» under kiloene.

    En mal som aldri er kjørt, viser «–» for siste økt og sist trent.

  Flisa viser ikke ukesmålet. Det står i arket.
- **Tallene** kommer fra [templateStats.ts](src/composables/templateStats.ts). Mål-delen i arket regner med samme regel (`sessionGoalRows`) som «Ukesmålet» i aktiv økt. Da er arket, Ukesoversikt og aktiv økt enige.
- **Arket:** et trykk på flisa åpner et bunnark ([TemplateSheet.vue](src/components/TemplateSheet.vue)) i arkets farger. Det har:
  - en blyant øverst til høyre (ikonknapp i feltfargene) som åpner malskjemaet;
  - fire nøkkeltall;
  - «Denne uken» med «+N» per gruppe;
  - øvelsene gruppert per muskelgruppe med «N sett» fra forrige gang;
  - «Start økt» (`btn-primary`) nederst.

  Grupperingen er bare visning, og økta følger rekkefølgen i malen.
- **Rekkefølge:** hold inne og dra en flis for å endre den. [useGridReorder.ts](src/composables/useGridReorder.ts) setter flisa inn der fingeren er, og flisene imellom flytter seg ett hakk, som på en hjemskjerm. Flisa løftes med skygge og svak forstørrelse. Rekkefølgen lagres på telefonen per bruker (`templateOrder.ts`), og nye maler havner nederst.

### Streak i Ukesoversikt

- **Plassering:** en kompakt rad i et eget panel rett under dagsporet. Den vises bare for inneværende uke, og bare med ukesmål.
- **Innhold:** flamme og «3 uker på rad» (eller «Start en ny streak»). Hva som gjenstår, står i målpanelene under.
- **Reglene** ligger bak «Slik fungerer det ›»: alle ukesmålene innen søndag, hvert mål for seg (er du langt over på ett, veier det ikke opp for et annet), og ett mål som mangler når uka er over, starter streaken på nytt. De er lukket når siden åpnes.
- **Forsiden** viser bare tallet, kjeden og «Rekord N». Streaken forklares bare i Ukesoversikt.

### Flis for aktiv økt (forsiden)

- [ActiveSessionButton.vue](src/components/ActiveSessionButton.vue): fast nederst til høyre, over bunnmenyen, i arkets farger (`#1a2233`, kant `#2d3a4f`). En ring fylles oransje etter fullførte sett; navn, tid som klokke og «N av M sett». Bare kondisjon: hel cyan ring og «Aktiv tid».
- Bare på forsiden.

### Knapper

- `btn-primary`: én hovedhandling per visning.
- `btn-secondary`: andre handlinger.
- `btn-sm`: kompakte varianter.
- Sletting er en tekstknapp (`#f87171`), ikke en stor rød knapp, med mindre sletting er hele poenget med visningen.

### Kalender (Statistikk)

- Dagene er avrundede ruter (radius 0.5rem) på innfelt bakgrunn.
- En treningsdag er fylt med fargen til malen økta ble startet fra (slik malen er nå). Har malen ingen farge eller er slettet, brukes oransje, så dagen aldri ser utrent ut. Flere økter samme dag fra ulike maler deler ruta i like loddrette striper, første økt til venstre. Ingen forklaring under kalenderen.
- Dagens dato får en hvit ring. Dager utenfor måneden er nesten usynlige.
- Måneden har pilknapper i samme stil som ikonknappene. Over rutenettet står antall treningsdager og hviledager i måneden, fram til i dag. Hviledager vises som et nøytralt tall, ikke som et brudd.

### Prestasjoner

- Kompakte rader med emoji, tittel og beskrivelse. Oppnådde merker kommer først.
- Ikke oppnådde merker vises i gråtoner med dempet tittel, så de leses som mål og ikke som trofeer.
- Bare de første vises, med «Vis alle (N)» for resten.

### Skjema (Profil)

- Feltene er stablet i én kolonne på mobil og står i to fra 768 px. Etiketten står over feltet (0.8125rem / 600, `#cbd5e1`). «valgfritt» står dempet etter etiketten, og hjelpeteksten står under (0.75rem, `#64748b`).
- Felt bruker den felles `.input-field`-klassen.
- Handlingen står nederst i panelet etter en skillelinje: full bredde på mobil, høyrejustert fra 640 px. Én `btn-primary` per side. Andre skjema på samme side bruker `btn-secondary`.
- Utlogging er en rad i rød tekst i et eget panel nederst, ikke en stor rød knapp.

### Bunnark (aktiv økt)

- Brukes til redigering underveis i økta. Arket kan være opptil 3/4 av skjermhøyden, det samme som malarket på forsiden, og innholdet holdes kompakt. Blir innholdet høyere, scroller det inne i arket.
- Mens et ark er åpent, står siden bak helt stille ([useBodyScrollLock.ts](src/composables/useBodyScrollLock.ts)). `body` er låst, og sveip som arket ikke selv kan scrolle, blir avbrutt. Det gjelder sveip på bakgrunnen, og sveip i et ark som får plass. På iPhone går slike sveip ellers forbi den låste `body` og flytter siden.
- Hover-stiler gjelder bare med mus (`hoverOnlyWhenSupported` i Tailwind, og `@media (hover: hover)` rundt egne `:hover`-regler). Ellers blir hover hengende på det som lå under fingeren når arket lukkes med et trykk.
- Håndtaket øverst er en tynn strek, men hele toppen av arket er trykkflate for å lukke.
- **Dra ned for å lukke** ([useSheetDrag.ts](src/composables/useSheetDrag.ts)) gjelder både dette arket og malarket på forsiden:
  - Bare toppen kan gripes: streken og headeren. Den har `touch-action: none`, og resten av arket ruller og virker som før.
  - Arket følger fingeren, og bakgrunnen tones ut.
  - Det lukkes etter en fjerdedel av høyden eller ved et raskt sveip, og spretter ellers tilbake.
- Hold arket kompakt, men skjul ikke felt som brukeren vil fylle ut underveis. Kondisjonsarket viser anstrengelse og notat i alle tilstander.
- Arket har ingen egen knapp for å fullføre. Økta fullføres med «Fullfør Økt» på selve øktsiden, så det finnes bare én måte å avslutte på.
- **Sett og runder virker likt:**
  - Nye legges til med den tonede oransje knappen med +-ikon («+ Sett» / «+ Runde») under lista, med en kort oppsummering til venstre.
  - De slettes ved å sveipe raden til venstre, som viser en rød bakgrunn med søppelkasse.
  - Sveiper du bort den siste raden, fjernes hele øvelsen, med bekreftelse.

## Mobil og berøring

- **Referansebredde:** 390 px, med 16 px sidemarg (`px-4` på `main`). Sjekk 320 px også.
- **Trykkflater:** `style.css` gir alle knapper og felt minst 44 px. Bare tette rutenett der hver rute er et eget mål, som anstrengelse 1–10 og ukevelgeren, kan gå under, og da med `min-width: 0` / `min-height: 0` lokalt.
- **Safe area:** bruk `env(safe-area-inset-bottom)` nederst i ark og faste elementer.
- **Bevegelse:** pulserende eller animerte detaljer slås av under `prefers-reduced-motion: reduce`.
- **PWA:** appen skal fungere i alle store mobil- og desktopnettlesere, og som installert app.

## Diagrammer

- **Én måleenhet per akse.** Kilo og minutter vises i hvert sitt diagram eller hver sin rad, aldri med to y-akser.
- **Én serie, én farge.** Cyan for kondisjon, oransje for volum. Da trengs ingen legend, fordi tittelen sier hva det er.
- **Tomme perioder vises** som tomme søyler, så opphold i treningen synes.
- **Rutenett** er heltrukne hårstreker (`#334155`), aldri stiplede.
- **Ingen tall på hver søyle.** Vis heller utvalgte tall, som snitt og beste uke, under diagrammet.
- Søylene følger samme form som over: rett start, 4 px avrunding, maks 24 px brede.
- Bruk [CardioWeeklyChart.vue](src/components/CardioWeeklyChart.vue) som mal.
- **Søyler for mengde, linje for nivå.**
  - Mengder (minutter, kilo per uke) vises som søyler som starter på null.
  - Et nivå over tid (tyngste sett per uke) vises som en 2 px linje med 8 px punkter og en 2 px ring i panelfargen.
  - Uker uten data blir hull i linja, ikke en forbindelse.
  - Under grafen står start- og sluttverdien («Fra 67,5 kg i uke 33 til 80 kg i uke 42»).
  - Se tyngste sett i [ExerciseDetail.vue](src/views/ExerciseDetail.vue).
- **Tall i stedet for søyler når verdiene ligger tett**, for eksempel snitt kg per rep fra 69 til 78. Søyler fra null blir da like lange og bare støy. Vis i stedet en rad med etikett og tall, eldst til venstre.

## Ikke gjør

- Ikon i farget firkant over hvert nøkkeltall.
- Gradienter, glød og glass-effekter.
- Emoji i grensesnittet. Unntaket er prestasjonsmerkene, som allerede har dem.
- Kort inne i kort.
- Midtstilte rutenett med tall i aksentfarge som eneste innhold.
- Rødt og grønt for størrelse, eller statusfarger brukt som seriefarger.
- Nye hex-verdier som «nesten» matcher en eksisterende.

## Kjente avvik

Dette bryter med stilen i dag og ryddes når den aktuelle siden tegnes om:

- **Innloggingssidene** (Login, ResetPassword) bruker `.card` (`#1e293b` / `#334155`).
- **`.input-field` i `style.css`** setter `border-dark-600` og nullstiller den rett etter med `border: 1px solid;`. Da blir kantfargen tekstfargen, altså hvit, på alle felt i appen. Det er en enlinjes retting, men den endrer alle skjemaene samtidig.
- **Tilbakeknappens farger** (`#3F302A` / `#4A3A32`) er hardkodet i fem filer. Den bør bli en felles komponent.
- **Seksjonstitlene i Ukesoversikt** bruker `#6b7280`, mens resten følger `#94a3b8`, som har bedre kontrast.
- **Alle farger er hex i scoped CSS.** De bør på sikt bli CSS-variabler, så dette dokumentet og koden ikke kan komme ut av takt.
