# DESIGN.md

Designstilen for LIFT. Nye sider, og sider som tegnes om, følger dette. Fasiten er **Ukesoversikt** ([WeekDetails.vue](src/views/WeekDetails.vue)) og **Øktdetaljer** ([SessionDetails.vue](src/views/SessionDetails.vue)). Står noe her i strid med de to sidene, er det dokumentet som skal rettes.

Eldre sider (Statistikk, Øvelsesdetaljer, Historikk, Profil) bruker fortsatt den gamle `.card`-stilen. Se [Kjente avvik](#kjente-avvik) nederst.

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

- **Muskelgrupper** har faste farger i [muscle-groups.json](src/data/muscle-groups.json), og **treningstyper** i [workout-types.json](src/data/workout-types.json). Hent fargene derfra, ikke hardkod dem.
- Bryst og Push bruker samme oransje som styrkeaksenten. Det er greit, siden de alltid står med navn ved siden av.
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

Siden har ingen kort øverst. Først kommer tilbakeknappen, så tittelen, så én metalinje med det viktigste konteksten (type, dato, varighet). Tilbakeknappen ser lik ut på alle sider og peker til forelderen i brødsmulene:

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

### Knapper

- `btn-primary`: én hovedhandling per visning.
- `btn-secondary`: andre handlinger.
- `btn-sm`: kompakte varianter.
- Sletting er en tekstknapp (`#f87171`), ikke en stor rød knapp, med mindre sletting er hele poenget med visningen.

### Bunnark (aktiv økt)

- Brukes til redigering underveis i økta. Arket kan være opptil 88dvh høyt, men innholdet holdes kompakt.
- Håndtaket øverst er en tynn strek, men hele toppen av arket er trykkflate for å lukke.
- Vis bare det som er relevant i tilstanden du er i. Kondisjonsarket viser for eksempel anstrengelse og notat først når aktiviteten er satt på pause.

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

- **Statistikk, Øvelsesdetaljer, Historikk, Profil og innloggingssidene** bruker `.card` (`#1e293b` / `#334155`), og flere av dem har midtstilte flis-rutenett med ikoner.
- **Tilbakeknappens farger** (`#3F302A` / `#4A3A32`) er hardkodet i fem filer. Den bør bli en felles komponent.
- **Seksjonstitlene i Ukesoversikt** bruker `#6b7280`, mens resten følger `#94a3b8`, som har bedre kontrast.
- **Alle farger er hex i scoped CSS.** De bør på sikt bli CSS-variabler, så dette dokumentet og koden ikke kan komme ut av takt.
