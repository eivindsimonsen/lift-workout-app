# Malfarge som toning på forsiden — design

## Hvorfor

Malflisene og panelet for aktiv økt er nesten gråe. Malfargen står bare som en liten prikk. Eivind vil ha mer farge på forsiden, så malene skilles lettere fra hverandre og siden får mer liv.

Skissene ble laget i nettleseren med tre retninger: flat toning (A), toning fra hjørnet (B) og fargestripe (C). Eivind valgte B.

## Hva

### Malflisene

- Malfargen toner inn fra øvre venstre hjørne og blekner bort før tallene: `linear-gradient(155deg, <22 % malfarge i #111827> 0 %, #111827 45 %)`. (Endret etter gjennomgang fra 62 %, som la litt farge under det første tallet.)
- Kanten er grå `#2d3a4f`, som panelet for aktiv økt, og trykket tilstand er `#3d5068`. Plassholderflisene får samme kant. (Endret etter testing: en tonet kant på 30 % ga en farget ramme, og `#1f2937` forsvant mot toningen.)
- Prikken foran navnet blir stående.
- En mal uten farge toner i grått (`#475569`), som prikken i dag. Det ser nesten ut som i dag.
- Plassholderflisene ved lasting blir som før, uten farge.

### Panelet for aktiv økt

- Panelet toner fra venstre, altså fra ringen: `linear-gradient(90deg, <24 % farge i #1a2233> 0 %, #1a2233 70 %)`. Kanten beholder arkets `#2d3a4f`. (Endret etter testing: en tonet kant på 40 % ble en hard farget ramme.) Trykket tilstand legger toningen over `#243044`.
- Ringen og den pulserende prikken får fargen til malen økta ble startet fra. Sporet bak ringen tones svakt i samme farge.
- **Uten malfarge** (malen har ingen farge, eller er slettet) er alt som i dag: oransje ring, og hel cyan ring for en økt med bare kondisjon. Da ser panelet aldri dødt ut. (Vår beslutning.)
- **En økt med bare kondisjon fra en mal med farge** får hel ring i malfargen, ikke cyan. «Aktiv tid» sier fortsatt at det er kondisjon. (Vår beslutning.)

## Tilnærming

- **Valgt: `color-mix()` i CSS**, med malfargen som CSS-variabel. De flate verdiene (`#111827` og `#1f2937`) står i grunnregelen, og `color-mix` ligger bak `@supports`, så nettlesere uten `color-mix` (eldre enn Safari 16.2) får dagens utseende i stedet for en feil. (Endret etter gjennomgang: en flat deklarasjon foran virker ikke som reserve når verdien inneholder `var()`.)
- **Valgt bort: blande fargene i TypeScript.** Det virker overalt, men flytter fargelogikk inn i komponentene uten at det trengs.
- **Fargen til aktiv økt** kommer fra forsiden, som allerede har `templatesById`, og sendes som en prop til `ActiveSessionButton`. Komponenten slår ikke opp malen selv.
- **Ringen** blir maskert (gjennomsiktig midt i) i stedet for å ha en indre sirkel i arkfargen. Ellers ville midten vært en flat flekk oppå toningen.

## Mål, ikke-mål og anti-mål

- **Mål:** Farge som skiller malene på forsiden, og en aktiv økt som viser hvilken mal den kommer fra.
- **Ikke-mål:** Endre malarket (`TemplateSheet.vue`), Historikk, Ukesoversikt eller Statistikk. Ingen nye farger eller ny SQL.
- **Anti-mål:**
  - Tall som blir vanskeligere å lese. Toningen er borte før tallene.
  - Toning som brytes når kortet sveipes for å avbryte eller dras for å endre rekkefølge.

## Begrensninger

- `DESIGN.md` forbyr i dag gradienter og sier at malfargen er «en markør, ikke en flate». Begge deler skrives om for forsiden: et unntak for malfargetoningen på malflisene og panelet for aktiv økt.
- `CLAUDE.md` sier at malfargen farger prikken på flisa og «nothing else». Den linja oppdateres.
- `my-vue-style`, ingen testrunner: `npm run type-check` og `npm run build` skal være rene.

## Overlatt til den som bygger

- Nøyaktige prosenter innenfor det skissen viste, hvis noe ser annerledes ut på telefonen enn i skissen.
