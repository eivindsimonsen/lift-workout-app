# Oppstart uten hopp — plassholdere på forsiden — design

## Hvorfor

Når appen åpnes, kommer forsiden i biter: først et skall uten bunnmeny, så øktene, så streak og muskelgrupper — og innholdet flytter seg underveis. Det ser rart ut. Forsiden er siden som alltid vises ved oppstart. Den skal stå ferdig formet fra første øyeblikk, vise at det jobbes, og fylles ut uten at noe flytter seg.

## Slik er det i dag

- **Lasteskjermen i `App.vue` vises nesten aldri.** Den venter på `hasInitialized`, som settes når `workoutData.isLoading` er `false` — og det er den fra start (`useSupabaseData`: `isLoading = ref(false)`, og oppstartens `loadData` slår den ikke på).
- **Forsiden tegnes først uten bunnmeny, og så på nytt.** Ruteren har sjekket økten før `mount`, men `isAuthenticated` i datalaget blir `true` først etter `initIndexedDB`, 100 ms pause og `getSession` i `initializeAuth`. Til da tegnes siden i «ikke innlogget»-grenen i `App.vue`; når flagget snur, byttes `<main>` (annen `key`) og forsiden monteres på nytt med topplinje og bunnmeny.
- **Forsiden tegnes tom.** `TemplateSessions.vue` bruker `workoutData.isLoading` (alltid `false` her), så ukekortet vises med tomme dager og «Ingen økter opprettet enda» kan blinke forbi før cachen er lest.
- **Øvelsene kommer sist.** `useHybridData.initializeAuth` henter øvelsene først etter at `userData.initializeAuth()` er ferdig — inkludert nettverkssynken. Først da kommer streaken og muskelgruppene på malkortene, og ukekortet bytter fra «Ukens sett» til streak og «Igjen for å …», så alt under flytter seg.
- **Øvelsene hentes bare ved oppstart.** Logger man inn uten å starte appen på nytt (`Login.vue` gjør `router.push('/')`), hentes de ikke.

## Hva

### Rammen er der fra første tegning

- Appen tegnes først når innloggingen er avklart. En beskyttet side tegnes aldri i «ikke innlogget»-grenen, så topplinje og bunnmeny er der fra første bilde, og forsiden monteres ikke på nytt.
- Lasteskjermen i `App.vue` («Laster… / Starter app… / Sist synkronisert») fjernes.
- Forsidens faste deler står der med en gang: «Økter», ukekortets ramme med «Denne uken», «Uke N» og ukedagene, «Treningsøkter» med «+ Ny økt», og malkortenes ramme med «Rediger» og «Start Økt».

### To bølger fyller inn

Hvert felt som venter på data, viser en plassholder på nøyaktig samme plass og i samme størrelse som innholdet. Når dataene er der, toner innholdet inn (kort overgang) på samme sted.

1. **Bølge 1 — «øktene er lest»:** maler og økter er lest fra telefonen (IndexedDB). Finnes ingen cache (ny enhet, første innlogging), er bølgen ferdig når første henting fra nettet er ferdig eller har feilet. Fyller: prikkene på ukedagene, aktive økter, malkortenes navn, antall øvelser og øvelsesnavn, motivasjonslinja, og ukestallene når brukeren ikke har mål.
2. **Bølge 2 — «øvelsene er lastet»** (`exerciseIndex` er ikke tom; finnes i dag som `exercisesReady` / streakens `ready`): streaken med kjeden, «Igjen for å holde streaken / nå ukesmålet» eller «Uka er i boks», og muskelgruppens prikk og navn på hver øvelse i malkortene.

- **Ukekortets målområde:** har brukeren mål (`useTrainingGoals().hasGoals`, kjent så snart brukeren er kjent), viser det plassholdere for streak og målliste fram til bølge 2. Uten mål viser det plassholdere for de vanlige ukestallene fram til bølge 1. Mellomformen «Ukens sett» før streaken er klar, forsvinner.
- **Høyden på målområdet** er ukjent til bølge 2: «Uka er i boks» er kort, og målista har én rad per mål som ikke er nådd. Plassholderen reserverer det største: streak-hodet med metalinje, kjeden, og én rad per mål i planen (muskelgrupper med mål > 0, pluss kondisjonsmålene). Når bølge 2 kommer, kan kortet bli lavere, og innholdet under glir opp én gang. (Eivinds beslutning: dette er greit; alternativet med en lokal kopi av øvelsesbiblioteket ble valgt bort.)
- **Malkortenes høyde** avhenger av antall øvelser og er ukjent før bølge 1. Plassholderkortene får et typisk antall rader; de ekte kortene kommer i bølge 1, som leses fra telefonen på en brøkdel av et sekund. (Vår beslutning.)
- **«Ingen økter opprettet enda»** vises bare etter bølge 1, og bare når det ikke finnes maler.
- **Aktive økter:** seksjonen vises bare når det finnes en aktiv økt. Den kommer i bølge 1, som leses fra telefonen og er rask. (Vår beslutning: det er sjelden og tar en brøkdel av et sekund.)
- **Hvor lenge det glinser:** til dataene kommer, uansett hvor lang tid det tar. Ingen tidsgrense og ingen reserveform. Feiler hentingen av øvelser, viser appen allerede «Kunne ikke laste øvelser.», og plassholderne blir stående. (Eivinds beslutning: det viktigste er at man ser at det jobbes; glinser det for alltid, vet man at noe er galt.)

### Øvelsene hentes tidligere og også etter innlogging

- Øvelsene hentes så snart det finnes en innlogget økt — ved oppstart med en gang `getSession` har svart, parallelt med cache-lesing og synk, og etter innlogging. Aldri uten innlogget bruker.
- **Én gang per innlogget bruker.** `SIGNED_IN` fyrer også hver gang appen kommer tilbake i forgrunnen (auth-js 2.71), så hentingen skal ikke gjentas når biblioteket allerede er lastet for samme bruker, og samtidige kall slås sammen. (Vår beslutning.)
- **Nytt forsøk etter feil.** Har hentingen feilet (for eksempel offline-start på senteret), prøves den igjen når nettet kommer tilbake (`online`) og når appen kommer i forgrunnen. Feilmeldingen «Kunne ikke laste øvelser.» vises ved første feil, ikke ved hvert nye forsøk. Slik blir «glinser til det kommer» ikke «glinser til appen startes på nytt». (Vår beslutning.)

### Gjenoppretting av siste side fjernes

- `App.vue` sender i dag brukeren til `sessionStorage.lastRoute` ved `mount` hvis innlogget og på `/`. Steget kjører nesten aldri i dag, fordi `isAuthenticated` ennå er `false` ved `mount`. Når appen venter på avklart innlogging, ville det begynt å virke — og da tegnes forsiden først og byttes ut med en annen side, akkurat det hoppet vi fjerner. Steget fjernes, så oppførselen blir som i dag: forsiden ved oppstart. (Vår beslutning.)

### Utseende (variant B fra skissene)

- Plassholderen er flater i `#1f2937` med en svak glans som glir over (`#334155`, `dark-700`), med samme avrunding som innholdet de står for: streker for tekst, sirkler for prikker.
- Under `prefers-reduced-motion: reduce` står plassholderne stille i grått, og innholdet bytter uten overgang (DESIGN.md → Bevegelse).
- Glansen er én felles stil i `src/style.css`, så andre sider kan bruke den senere. `DESIGN.md` får et kort avsnitt «Plassholdere ved lasting» som beskriver mønsteret.

## Tilnærming

- **A (valgt):** plassholderne bor inne i forsiden, felt for felt. Datalaget gir et eksplisitt signal for bølge 1; bølge 2 bruker signalet som finnes. Innloggingen avklares før første tegning. Øvelsene hentes parallelt.
- **B (valgt bort):** en egen skjelettkopi av forsiden som vises til dataene er der. To oppsett må holdes like for at ingenting skal hoppe, og bølge 2 trenger plassholdere på den ekte siden uansett.
- **C (valgt bort):** gjenbruke `isLoading` for oppstarten. Historikk, Statistikk, malskjemaet og andre sider leser samme flagg og ville endret oppførsel ved kald start — mer enn det som er bedt om.

## Mål, ikke-mål og anti-mål

- **Mål:** ingen ny montering av forsiden ved oppstart; man ser at det jobbes; innholdet kommer så tidlig som mulig; ingenting dytter annet innhold nedover når det kommer.
- **Ikke-mål:** andre sider enn forsiden (de åpnes med data allerede lastet); endring av synk-reglene (cache først, 30 min, ikke ved ventende endringer) utover at øvelsene hentes parallelt; lokal kopi av øvelsesbiblioteket (valgt bort av Eivind).
- **Anti-mål:** en fullskjerms lasteskjerm; at «Ingen økter opprettet enda» blinker forbi; at innhold dytter annet innhold nedover når det kommer. (At målområdet blir lavere og innholdet under glir opp én gang, er godtatt.)

## Begrensninger

- PWA, telefonen først (390 px), bokmål i UI, engelske kommentarer. Følg `DESIGN.md` og `my-vue-style`.
- Datalaget: endringer følger mønsteret i `useSupabaseData` (IndexedDB-snapshot ved hver mutasjon er urørt).
- Ingen testrunner: `npm run type-check` og `npm run build` må være rene; oppførselen verifiseres i appen.

## Overlatt til den som bygger

- Navn og plassering på signalet for bølge 1, og hvordan `App.vue`/`main.ts` venter på avklart innlogging.
- Om plassholderne blir en liten komponent eller en CSS-klasse med hjelpemarkup.
- Hvor mange malkort plassholderen viser før bølge 1 (et skjermfylt antall; flere kort legges til nederst og flytter ikke det som er synlig).
- Nøyaktige mål på plassholderne, innenfor regelen «samme plass, samme størrelse».
