# Glemt å avslutte økta — design

## Hvorfor

En økt som ikke avsluttes, går videre. Avsluttes den dagen etter, lagres hele døgnet som varighet («24 t 39 min»). Det gir feil tall i Statistikk, i Ukesoversikt, i «kg per minutt», i snittiden for malen og i merket «Maratonøkt». Den eneste måten å rette det på har vært å endre raden i Supabase.

## Hva

- **Når:** du trykker «Fullfør Økt», og det har gått **mer enn 3 timer** siden start. Ellers er alt som før.
- **Arket (variant A, Eivinds valg):** et bunnark i arkets farger kommer **i stedet for** «Er du sikker på at du vil fullføre økten?».
  - Tittel: «Økta har vart i 24 t 39 min». Metalinje: «Push · startet i går kl. 18:06» (i dag / i går / ukedag / dato).
  - «Hvor lenge trente du?» med to felt, timer og minutter, fylt inn med et forslag. Under står «Snittet ditt for Push er 1 t 5 min.»
  - `btn-primary` «Lagre 1 t 5 min», med en etikett som følger feltene. Den er sperret når feltene gir 0 min.
  - Under metalinjen (lagt til etter første runde): «Oi, det var en usedvanlig lang økt! Stemmer det, eller glemte du å avslutte den?»
  - Tekstknapp: «Ja, 24 t 39 min stemmer» (først «Nei, …», men det ble feil svar på spørsmålet over). Den lagrer som i dag, med tiden fram til nå.
  - Fjernes ufullførte sett eller øvelser ved lagring, står samme advarsel som i boksen i dag, som hjelpetekst i arket.
  - Lukkes arket (dra ned, trykk utenfor, Escape), skjer ingenting, og du er tilbake i økta.
- **Forslaget** er snittet av de siste 8 fullførte øktene fra samme mal med varighet over 0 og høyst 3 timer, så en tidligere glemt økt ikke trekker snittet opp. Uten slike økter er forslaget 1 t, og hjelpeteksten utelates.
- **Kondisjon:** en innskrevet tid under den loggede aktive tiden blir løftet til den aktive tiden, slik fullføring alltid har gjort med veggklokka. Feltet fylles da inn med den loggede tiden, og knappen viser det som faktisk lagres.
- **Stoppeklokke som går** (lagt til etter gjennomgangen): lagres arket med en innskrevet tid, kuttes tid som fortsatt går, til det som er igjen av den innskrevne tiden etter allerede logget tid. Ellers ville en glemt løpeøkt fått hele døgnet både som runde og som varighet. «… stemmer» lar klokka telle alt, som før.

## Tilnærming

- **Valgt:** `completeWorkoutSession(sessionId, durationMinutes?)` tar en valgfri varighet som erstatter veggklokka. Alt annet går samme vei som i dag: lokal state, `updateWorkoutSession` (som setter `updated_at`) og IndexedDB-øyeblikksbildet.
- Arket er en egen komponent (`LongSessionSheet.vue`) med samme oppbygning som `TemplateSheet.vue`: `useSheetDrag`, `useBodyScrollLock` og Escape for å lukke.
- Grensen, forslaget og datoteksten er rene funksjoner i `longSession.ts`, så de kan sjekkes uten nettleser.
- **Valgt bort:** å rette varigheten i ettertid på Øktdetaljer, og tidsstempel på sett for å foreslå sluttid. Eivind trenger bare fanget ved fullføring.

## Begrensninger

- Grensen er fast på 3 timer, uten innstilling.
- I `WorkoutSession.vue` endres bare `handleCompleteWorkout`, `completeWorkout` (som får en valgfri varighet), og så markupen og staten for arket.
- `npm run type-check` og `npm run build` skal være rene.
