# Malene på forsiden — nytt design — design

## Hvorfor

Malene («treningsøkter») på forsiden tar for mye plass: hvert kort viser hele øvelseslista, så Eivind må bla langt for å se alle malene sine. Aktiv økt ligger midt på siden og må letes fram. Malene har heller ingen farge lenger etter at økttypene ble fjernet, så de er vanskelige å skille fra hverandre i lista og i Historikk.

## Hva

### Malkortene (variant B fra skissene)

- Hver mal er et **smalt kort med fargekant** i malens farge (venstrekant 4px), i panelstilen fra `DESIGN.md` (`#111827`, kant `#1f2937`).
- **Lukket** viser kortet: navnet (radnavn-stil), og i en metalinje én prikk per muskelgruppe malen trener + «N øvelser». Til høyre en chevron og en **rund startknapp** (▶) fylt med malens farge.
- **Trykk på kortet** åpner og lukker det (ikke startknappen). Åpent viser det øvelsene **gruppert etter muskelgruppe**: en undertittel per gruppe (prikk i gruppens farge + navnet i versaler), og under den øvelsene. Til høyre for en styrkeøvelse står «N sett» fra forrige gang (samme tall som økta starter med, `findLastLogged`); øvelser som aldri er logget, får ingen tallangivelse. **Kondisjonsøvelser viser ingenting til høyre.** (Eivinds beslutning.) Nederst en tekstlenke «Rediger mal» til `/template/edit/:id`.
- **Grupperingen gjelder bare visningen på kortet.** Rekkefølgen i malen og i økta er den Eivind har satt i skjemaet. (Eivinds beslutning.)
- Seks lukkede maler skal få plass innenfor én telefonskjerm (390 × 844, installert app) når man har bladd ned til lista. Ukekortet over står uendret, så lista begynner fortsatt under det. (Vår beslutning: Eivinds ønske er at lista blir kort å bla gjennom, ikke at forsiden bygges om.)
- Startknappen er nedtonet og virker ikke mens en økt er aktiv, som i dag. Nedtellingen før økta starter er uendret.
- Overskriften «Treningsøkter» og «+ Ny økt» beholdes; resten av appen kaller malene økter.

### Knappen for aktiv økt (variant C)

- Erstatter seksjonen «Aktiv Økt» og den blå boksen «Du har en aktiv økt». Vises **bare på forsiden** (Eivinds beslutning), og bare når det finnes en aktiv økt.
- En mørk flis **fast nederst til høyre**, over bunnmenyen på mobil (med safe area), i fargene til arket i aktiv økt (`#1a2233`, kant `#2d3a4f`). Innhold: en ring som fylles etter fremdrift (oransje), øktnavnet, tiden siden start, og under «7 av 18 sett».
- Trykk åpner økta (`/workout/:id`), som «Fortsett økt» i dag.
- **En økt med bare kondisjon:** ringen er hel og cyan og følger ingen fremdrift (en løpetur er én runde som først telles når den lagres), og andre linje viser «Aktiv tid mm:ss» (samme beregning som toppen av aktiv økt, `liveExerciseSeconds`). (Eivinds beslutning.)
- Å avbryte en økt gjøres inne i økta. Sveipet for å avbryte på forsiden forsvinner med det gamle kortet. «Avbryt»-knappen i toppen av aktiv økt var skjult på mobil og vises nå på alle skjermer, som rød tekstknapp med 44px trykkflate (lagt til etter testing — uten den kunne en økt ikke avbrytes på telefon).
- Lista får nok plass nederst til at flisen aldri dekker siste mal.

### Fargen på malen

- Eivind velger fargen selv blant **de åtte muskelgruppefargene** i `src/data/muscle-groups.json`; malene og muskelgruppene **deler fargekoder** (Eivinds beslutning).
- Fargen vises på malkortet (kant og startknapp) og som **prikk foran øktnavnet i Historikk**. Ingen andre steder.
- Historikk viser fargen malen har **nå** (oppslag på `templateId`). Har økta ingen mal lenger (slettet), eller malen ingen farge, er prikken grå. (Eivinds beslutning: grå viser at malen er slettet.)
- **Fargevalg i skjemaet (variant B):** en liten fargerute til venstre i navnefeltet; trykk åpner en palett med de åtte fargene (4 × 2), valg lukker den.
- Nye maler starter med oransje valgt. Maler fra før har ingen farge og er grå til Eivind velger en.

### Oppstart

- Plassholderne fra oppstartsarbeidet følger den nye formen: før øktene er lest (bølge 1) vises plassholderkort i samme størrelse som de lukkede malkortene. Muskelgruppeprikkene er plassholdere til øvelsesbiblioteket er lastet (bølge 2). Flisen for aktiv økt kommer i bølge 1; den er festet til skjermen og flytter ikke noe.

## Tilnærming

- **Valgt (A): ny kolonne `color` på `workout_templates`.** Ny SQL-fil `supabase-setup/14_template_color.sql` legger til en valgfri `TEXT`-kolonne (ingen standardverdi; `NULL` = grå). Fargen mappes i `useSupabaseData` som navn og øvelser (lesing, opprettelse, oppdatering, IndexedDB-snapshot og offline-kø følger samme vei). **SQL-en må kjøres før koden deployes**, ellers feiler lagring av maler.
- **Valgt bort (B): fargene i `user_metadata`** — malen blir delt på to steder, fargen følger ikke sletting og går ikke gjennom offline-køen.
- **Valgt bort: fargen inne i `exercises`-JSONB** — ville endret formatet på alle eksisterende maler.

## Mål, ikke-mål og anti-mål

- **Mål:** alle malene synlige uten å bla (opptil seks på en telefon); aktiv økt alltid ett trykk unna på forsiden; malene lette å skille på farge.
- **Ikke-mål:** endre rekkefølgen øvelsene har i malen eller i økta; vise malfargen andre steder enn forsiden og Historikk; endre ukekortet; endre øvelsesradene i skjemaet; knappen for aktiv økt på andre sider.
- **Anti-mål:** at grupperingen på kortet endrer økta; at flisen dekker innhold; en fargeplukker med fritt valg (bare paletten).

## Begrensninger

- Følg `DESIGN.md` (panel, radnavn, metatekst, undertittel i panel, «Farge bare når den betyr noe») og `my-vue-style`. Bokmål i UI, engelske kommentarer.
- Telefonen først (390px, tommel); trykkflater minst 44px (`style.css`), også startknappen.
- Ingen testrunner: `npm run type-check` og `npm run build` må være rene.
- Startup-signalene `localDataReady` og `exerciseIndex` brukes som i dag.

## Våre beslutninger (kan endres i gjennomgang)

- Fargen lagres som fargekode (hex); paletten hentes fra `muscle-groups.json`.
- Malkortet og knappen for aktiv økt blir egne komponenter (`TemplateCard.vue`, `ActiveSessionButton.vue`), siden `TemplateSessions.vue` er over tusen linjer.
- Muskelgruppene på kortet står i den rekkefølgen de først dukker opp i malen; øvelsene innen en gruppe i malens rekkefølge. Øvelser som ikke kan slås opp i biblioteket samles under «Annet» sist.
- Flere kort kan være åpne samtidig; alle er lukket når siden åpnes.
- Tiden i flisen skrives som klokke («32:14», «1:05:12») etter `DESIGN.md` → Tid, og teller hvert sekund. Sett-tallene er de samme som i toppen av aktiv økt (fullførte / alle sett).
- Fremdriften leses fra den lokale kopien av økta (`localStorage` `workout-session-<id>`) når den finnes, ellers fra økta i store — slik at flisen og toppen av aktiv økt viser samme tall også etter omstart av appen.
- Finnes det mer enn én aktiv økt (skal ikke skje), viser flisen den nyeste.
- En mal laget fra en tidligere økt starter med oransje, som andre nye maler.
- Fra 768px står de åpne og lukkede kortene i to kolonner med `align-items: start`, så et åpent kort ikke strekker naboen.
- Grå prikk og grå kant/startknapp: `#475569`.
- Flisen står nederst til høyre med samme avstand til kanten også på desktop (ingen bunnmeny der).
- `DESIGN.md` får avsnitt for malkortet, flisen for aktiv økt og malfarger; `CLAUDE.md` får `color` under «Data model».

## Overlatt til den som bygger

- Nøyaktige mål, innenfor `DESIGN.md`.
- Hvordan paletten lukkes ved trykk utenfor, og tastaturstøtte.
- Om oppslaget av muskelgrupper per mal bygges én gang for alle malene.
