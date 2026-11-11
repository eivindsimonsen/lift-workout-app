# Streaken forklart i Ukesoversikt — design

## Hvorfor

Etter malflisene viser forsiden ikke lenger «Igjen for å holde streaken». Det eneste som står igjen, er tallet og kjeden, og da er det lett å tro at det holder å trene én gang i uka. Regelen for streaken skal derfor stå i Ukesoversikt, kort og konsist. «Neste merke ved X» på forsiden sier ingenting om hvordan man holder streaken, og fjernes.

## Hva

### Forsiden

- Metalinja under «N uker på rad» viser bare «Rekord N», og bare når rekorden er høyere enn streaken. «Neste merke ved X» fjernes. (Eivinds ønske, variant 1 i skissen.)

### Ukesoversikt (variant C fra skissen)

- **Plassering:** en kompakt rad i et eget panel rett under dagsporet. Den vises bare for **inneværende uke** og bare når brukeren har ukesmål. Uten mål står «Sett opp ukesmål» som i dag.
- **Venstre side:** flamme (oransje, 16px) og «3 uker på rad» (radnavn-stil). (Endret etter testing: «· N av M mål nådd» ble fjernet, siden målpanelene under viser hva som gjenstår.)
  - Med streak 0 står «Start en ny streak», som på forsiden.
- **Høyre side:** knappen «Slik fungerer det ›» (dempet tekst med chevron, 44px trykkflate). Den åpner og lukker tre korte regler under raden, adskilt med en skillelinje:
  - Nå **alle ukesmålene innen søndag**, så øker streaken med én.
  - Hvert mål teller for seg. Er du langt over på ett, veier det ikke opp for et annet. (Endret etter testing: den første teksten sa lite til den som bare har kondisjonsmål.)
  - Mangler ett mål når uka er over, starter streaken på nytt.
- Reglene er lukket når siden åpnes.

## Tilnærming

- **Valgt (C):** en kompakt rad med reglene bak et trykk. Statusen er alltid synlig, og forklaringen trengs mest første gang.
- **Valgt bort (A):** et eget panel med kjede og regler. Det er tydeligst, men tar mye plass for noe man leser én gang.
- **Valgt bort (B):** én tonet linje over målene. Den er kompaktest, men gjentar regelen hver gang.
- Tallene hentes fra `useGoalStreak` (`current`, `thisWeek`), som forsiden og kjeden allerede bruker. Det blir ingen ny regel for hva som teller.

## Mål, ikke-mål og anti-mål

- **Mål:** brukeren forstår at streaken krever at *alle* ukesmålene nås, ikke bare én økt.
- **Ikke-mål:**
  - status for tidligere uker i ukevelgeren;
  - endringer i hvordan streaken regnes;
  - lista over hva som gjenstår på forsiden.
- **Anti-mål:**
  - en lang tekst som står åpen hver gang;
  - tall som er uenige med kjeden på forsiden.

## Begrensninger

- Følg `DESIGN.md` og `my-vue-style`. UI-tekst på bokmål, kommentarer på engelsk.
- `npm run type-check` og `npm run build` skal være rene.

## Våre beslutninger (kan endres i gjennomgang)

- Raden vises bare for inneværende uke.
- Mens streaken ikke er klar (biblioteket lastes), står det en plassholder på samme plass, som på forsiden.
- `DESIGN.md` får en linje om raden under Ukesoversikt-mønstrene.
