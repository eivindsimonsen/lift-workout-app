# Antall sett fra forrige gang — design

## Hvorfor

Hver styrkeøvelse i en aktiv økt starter i dag med tre tomme sett, uansett hvor mange du pleier å ta. Tok du fire sett bicepscurl sist, må du legge til et fjerde hver gang; tar du bare to, ligger det et tomt sett igjen. Økta skal starte med det du faktisk gjorde forrige gang.

## Hva

- **Antall sett følger forrige gang.** En styrkeøvelse som havner i en aktiv økt — når økta startes fra en mal (`useSupabaseData.startWorkoutSession`) og når øvelsen legges til underveis (`WorkoutSession.vue`, `addExerciseToSession`) — får like mange tomme sett som ble logget forrige gang. To sett sist gir to sett nå. (Eivinds beslutning: noen øvelser gjøres med bare to sett.)
- **«Forrige gang»** er den siste fullførte økta der øvelsen (samme `exerciseId`) har minst ett sett som teller (`isSetCounted`). Det er samme regel som «Sist 8×60kg» bruker i dag, og hintet flyttes over på den felles hjelperen, så de to alltid viser til samme økt.
- **Aldri gjort før:** tre sett, som i dag.
- **Kondisjon er uendret:** én runde som vokser. (Eivinds beslutning.)
- **Bare nye økter og nylagte øvelser.** En økt som allerede er i gang, beholder settene sine.
- **Visningen er uendret.** «Sist 8×60kg» står som før; antall sett ses på radene.
- **Malfeltene `sets`, `reps` og `weight` fjernes** fra `ExerciseTemplate` og malskjemaet. De ble brukt i et utfaset forsøk, leses aldri, og settes i dag til 0/0 eller 3/10. Gamle maler beholder verdiene i JSONB; koden leser og skriver dem ikke lenger. (Eivinds beslutning.)

## Tilnærming

- **Valgt:** én felles, ren hjelper (ved siden av `useSetMetrics`, som eier regelen for når et sett teller) som finner forrige logging av en øvelse i fullførte økter. Begge stedene som lager sett, og `getLastPerformance` i `WorkoutSession.vue`, bruker den.
- **Valgt bort:** telle på hvert sted for seg — to kopier av «forrige gang» som kan begynne å vise forskjellige økter.
- **Valgt bort:** lagre antallet på malen — det er feltet som ble faset ut, og det ville blitt utdatert ved neste økt.

## Ikke-mål

- Ingen forhåndsutfylling av vekt eller reps per sett.
- Ingen endring i hvordan settene vises eller ryddes når økta fullføres.
- Ingen endring for kondisjon.

## Overlatt til den som bygger

- Navn og fil for hjelperen, og om den returnerer selve øvelsesinnslaget eller bare antallet (begge brukes).
