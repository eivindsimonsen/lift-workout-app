# Malfliser på forsiden — design

## Hvorfor

Malkortene på forsiden ble tegnet om for en uke siden (smale kort som åpnes), men designet har ikke falt i smak etter en ukes bruk. Kortene sier lite om økta før man åpner dem. Eivind vil se hva en økt pleier å være (snittvolum), og hva den gir mot ukesmålet, når han velger økt. Samtidig vil han rydde i ukekortet: lista «Igjen for å holde streaken» skal bort fra forsiden. Den finnes allerede i Ukesoversikt, og flisene tar over rollen med å vise hvor uka står, per mal.

Skissene ble laget i nettleseren. Eivind valgte fliser i to kolonner (B), med det han likte fra ukesmål-skissen (E): «+N sett mot målet» og «Ben er nådd». De to ble slått sammen til variant A i andre runde. Til slutt ble «Rediger mal» flyttet til en blyant i arket.

## Hva

### Ukekortet

- Delen med ukesmålet fjernes fra ukekortet når brukeren har ukesmål: lista «Igjen for å holde streaken» / «Igjen for å nå ukesmålet», plassholderen for den, og linja «Alle mål nådd. Resten av uken er bonus.».
- Med ukesmål står bare overskriften, streaken med kjeden og dagsporet igjen. Ingenting kommer i stedet for lista.
- Uten ukesmål vises reservene som i dag («Ukens sett», «Ukens kondisjon» eller summene). Merk: `setsGoalProgress.hasTarget` er også sann når brukeren har ukesmål, så reservene må vises bare når `!hasGoals`. Ellers dukker «Ukens sett» opp når lista fjernes.
- Hele kortet lenker fortsatt til Ukesoversikt, der det som er igjen står.

### Flisene

- Malene står som fliser i et rutenett, **to kolonner på telefonen** (390px). Hver flis er en panelflate (`#111827`, kant `#1f2937`) med litt mindre radius enn et panel. Flisene på samme rad får samme høyde.
- Hver flis viser fra toppen:
  - malens fargeprikk, navnet, og under det en metalinje «5 øvelser · i går», alltid på én linje. Flisa har ingen startknapp, og økta startes fra arket. (Endret etter testing: Eivind fjernet play-knappen, og metalinja brøt ulikt fra flis til flis.)
  - **snittvolumet som det store tallet** («7 840 kg», under det «snitt volum»);
  - en skillelinje og **ukesmålet**:
    - En oppsummering i tonet oransje («+9 sett mot målet») sier hva økta vil gi mot det som mangler denne uken.
    - Er alle gruppene i malen nådd, står det «✓ Nådd denne uken» i grønt.
    - Under kommer én rad per muskelgruppe malen trener og som har et ukesmål: prikk i gruppens farge, navnet, og «6/15» (sett hittil denne uken mot målet). En gruppe som er nådd, får grønn ✓ og grønne tall.
- **Kondisjonsmal** (øktene fra malen har bare kondisjon, se «Styrke eller kondisjon» under Tallene):
  - Det store tallet er snittiden («38 min»), med «snitt tid · 6,2 km» under.
  - Ukesmålet viser «+38 min · +6,2 km» og radene «Kondisjon 22/60» og «Distanse 4,1/15». Radnavnene er de samme som i `goalStreak.ts`.
  - Kilo og minutter står aldri i samme tall.
- **Blandet mal** (styrke og kondisjon): kilo er det store tallet, og det står «snitt volum · + kondisjon» under, etter `DESIGN.md`. Ukesmålet viser både muskelgruppene og kondisjonsradene.
- **Uten ukesmål** har flisa ingen mål-del. En mal uten grupper med mål får heller ingen.
- **En mal som aldri er kjørt** viser «–» som stort tall med «ikke trent ennå» under, og metalinja har bare «N øvelser». Ukesmålet vises likevel, med anslaget beskrevet under.

### Arket

- Et trykk på flisa åpner et **bunnark** i samme stil som arket i aktiv økt (ark `#1a2233`, kant `#2d3a4f`, håndtak øverst, mørk bakgrunn bak). Arket lukkes med trykk på bakgrunnen eller på håndtaket.
- Øverst står prikken, navnet og metalinja «5 øvelser · 15 sett». **Øverst til høyre står en blyant** (ikonknapp i feltfargene `#243044` / `#3d5068`, 44px) som går til `/template/edit/:id`. «Rediger mal» nederst i arket finnes ikke lenger. (Eivinds beslutning.)
- Så kommer fire nøkkeltall i to kolonner:
  - styrke: snitt volum, snitt tid, sist trent og antall økter;
  - kondisjon: snitt tid, snitt distanse, sist trent og antall økter.
- Deretter **«Denne uken»**:
  - Øverst til høyre står oppsummeringen fra flisa.
  - Én rad per gruppe viser «6/15» og til høyre «+6» (tonet oransje), eller «✓ nådd» i grønt.
- Deretter øvelsene, gruppert per muskelgruppe som i dagens åpne kort, med «N sett» fra forrige gang. Kondisjonsøvelser og øvelser som aldri er logget, viser ingenting til høyre.
- Nederst står **«Start økt»** (`btn-primary`, full bredde). Den lukker arket og starter nedtellingen som i dag. Mens en annen økt er aktiv, er den nedtonet og virker ikke.

### Tallene

- **Økter fra malen** er fullførte økter med malens `templateId`. Den nyeste av dem gir «sist trent», og antallet gir «Økter».
- **Styrke eller kondisjon:** om det store tallet og nøkkeltallene i arket er kilo, tid eller kilo med «+ kondisjon», avgjøres av øktene snittet bygger på, ved hjelp av `trackingType` på øvelsene i øktene. Det gir to fordeler:
  - Tallet kan vises i bølge 1, også uten nett når biblioteket ikke er lastet.
  - Det store tallet beskriver alltid det samme som snittet det viser.

  En mal som aldri er kjørt, får typen fra biblioteket. Til det er lastet, står «–» med plassholder der etiketten skal stå. Har malen blitt endret siden sist, for eksempel med en ny kondisjonsdel, følger det store tallet det øktene inneholdt. Mål-delen bruker derimot malen slik den er nå, gjennom biblioteket. (Vår beslutning.)
- **Snitt volum** er snittet av volumet i de **siste 8** øktene fra malen (færre hvis det ikke finnes 8). Volumet regnes med `setVolume` på tellende sett (`isSetCounted`), aldri `weight * reps` direkte. Tallet rundes til nærmeste 10 kg på flisa.
- **Snitt tid:**
  - For styrke er det snittet av øktenes `duration` (minutter), skrevet som sum-tekst («56 min», «1 t 4 min»).
  - For kondisjon er det snittet av aktiv tid (summen av `setDuration` på tellende sett), som er det kondisjonsmålet måler.
  - **Snitt distanse** regnes på samme måte med `setDistance`.
- **«Sist trent»** skrives som «i dag», «i går», ukedag innen sju dager («mandag»), og ellers dato («5. nov»).
- **«6/15»** er sett hittil denne uken mot ukesmålet: `thisWeekTally` fra `useGoalStreak` og `goals` fra `useTrainingGoals`. Det er de samme tallene som Ukesoversikt og «Ukesmålet» i aktiv økt bruker.
- **«+N»** er hva malen vil gi, begrenset til det som mangler. En gruppe som er nådd, gir 0.
  - Det regnes med `sessionGoalRows(thisWeekTally, anslag, grupper, harKondisjon, goals)` fra `goalStreak.ts`, altså samme regel som aktiv økt.
  - `anslag` er en tenkt økt bygd av malens øvelser:
    - For styrkeøvelser brukes `startingSetCount` (sett fra forrige gang, ellers 3), altså det økta faktisk starter med.
    - For kondisjonsøvelser brukes tid og distanse fra forrige gang (`findLastLogged`). Er øvelsen aldri logget, gir den 0.
  - «+N sett» er summen av styrkeradene. Hver rad er `todayShare × target`, avrundet.

### Rekkefølge og dra

- Hold inne på en flis og dra for å flytte den. Flisa følger fingeren både bortover og nedover, og er løftet med skygge og svak forstørrelse som i dag. Rekkefølgen lagres som i dag (`templateOrder.ts`).
- Når fingeren er over en annen flis, **settes flisa inn på den plassen**, og flisene imellom flytter seg ett hakk, som på en hjemskjerm. To fliser bytter altså ikke plass. Med A B / C D og A dratt til C blir det B C / A D. Ved bytte ville hver flis man drar forbi, blitt stokket om. (Vår beslutning.)
- Dette er **en egen dra-funksjon for rutenettet**, ved siden av `useLongPressReorder`. Den følger de samme reglene:
  - et langt trykk på 400 ms;
  - bevegelse på over 8 px før det avbryter, så rulling virker;
  - siden ruller ikke mens man drar;
  - klikket etter en dragning svelges;
  - telefonen vibrerer ved start og slutt.

  `useLongPressReorder` og bruken i malskjemaet og aktiv økt røres ikke. (Eivinds beslutning.)

### Oppstart

- Før øktene er lest (bølge 1) vises plassholderfliser i samme størrelse og rutenett som de ekte flisene.
- Navn, snittvolum og «sist trent» trenger bare øktene og kommer i bølge 1.
- Mål-delen trenger øvelsesbiblioteket for å finne muskelgruppene, så den er plassholder til biblioteket er lastet (bølge 2). Den skal ikke dytte noe nedover når den kommer (`DESIGN.md` → Plassholdere).

## Tilnærming

- **Valgt: egen dra-funksjon for rutenettet.** Den finner plassen under fingeren ut fra flisenes plassering på skjermen og setter flisa inn der, i stedet for å bytte med naboen over eller under. Den gamle funksjonen brukes i malskjemaet og i aktiv økt hver økt, og blir ikke rørt.
- **Valgt bort: bygge om `useLongPressReorder`** til både liste og rutenett. Da finnes koden bare ett sted, men endringen treffer dragingen i aktiv økt og malskjemaet.
- **Valgt bort: egen sorteringsmodus** med en enkel liste. Den krever minst ny kode, men da kan man ikke dra flisene direkte.
- **Arket blir en egen komponent** for forsiden, i stilen til arket i aktiv økt. Et felles ark for begge sidene er valgt bort fordi det ville endret `WorkoutSession.vue`.
- **Tallene for ukesmålet gjenbruker `sessionGoalRows` og `thisWeekTally`.** Det finnes ingen ny regel for hva som teller, så flisa, Ukesoversikt og aktiv økt alltid er enige.

## Mål, ikke-mål og anti-mål

- **Mål:**
  - Velge økt fra forsiden med det viktigste synlig: hva økta pleier å være, og hva den gir denne uken.
  - Start er fortsatt ett trykk unna.
  - Ukekortet blir kortere.
- **Ikke-mål:**
  - Endre Ukesoversikt, «Ukesmålet» i aktiv økt eller datamodellen. Det blir ingen nye kolonner og ingen SQL.
  - Anbefale eller sortere maler etter ukesmålet, slik «Passer best nå» i E gjorde.
  - Vise snittvolum andre steder.
- **Anti-mål:**
  - Tall som er uenige med Ukesoversikt eller aktiv økt.
  - Kilo og minutter i samme tall.
  - Daglige streaker.
  - Fliser som hopper når data kommer inn.
  - Å ødelegge dragingen i malskjemaet eller aktiv økt.

## Begrensninger

- Følg `DESIGN.md` og `my-vue-style`. UI-tekst på bokmål, kommentarer på engelsk. Tall formateres med `Intl` `no-NO`.
- Telefonen først (390px, tommel, og sjekk 320px). Trykkflater skal være minst 44px.
- Ingen testrunner: `npm run type-check` og `npm run build` skal være rene. Dra, arket og tallene testes på telefon.
- Appen har to brukere: Eivind trener styrke, og samboeren trener mest kondisjon. Begge typer maler må se riktige ut.

## Våre beslutninger (kan endres i gjennomgang)

- **Rutenettet:** `repeat(auto-fill, minmax(~10.5rem, 1fr))`. Det gir to kolonner på telefon og flere på brede skjermer. Arket er et bunnark også på desktop, som i aktiv økt.
- **Rekkefølgen i flisa:** muskelgruppene står i den rekkefølgen de først dukker opp i malen, som på dagens kort.
- **Arket** blir en ny komponent, for eksempel `TemplateSheet.vue`. Flisa erstatter innholdet i `TemplateCard.vue`, og navnet bestemmer den som bygger.
- **Én liste med tall:** tallene for alle malene regnes i én omgang over øktene, for eksempel i en ny `useTemplateStats`, ikke én gang per flis.
- **«15 sett»** i arkets metalinje er summen av `startingSetCount` for styrkeøvelsene, altså det samme tallet som anslaget bygger på.
- **`DESIGN.md`:** avsnittet «Malkort (forsiden)» skrives om til fliser, ark og ukesmål, og setningen om én kolonne fjernes.
- **`CLAUDE.md`:** linja om malfargen («the dot on the template card») justeres om nødvendig.

## Overlatt til den som bygger

- Nøyaktige mål og avstander, innenfor `DESIGN.md`.
- Animasjonen når arket åpnes og lukkes. Den skal slås av under `prefers-reduced-motion`.
- Tastaturstøtte og fokus i arket, og om Escape lukker det.
- Hvor mye plass mål-delen reserverer før biblioteket er lastet, så lenge ingenting dyttes nedover.
