# Vektenheter: lbs og kroppsvekt — design

## Hvorfor

Volum regnes i dag som `vekt × reps` der vekt alltid tolkes som kg. To ting gjør tallet feil:

- **lbs-maskiner** føres som kg. Treningssenteret har f.eks. to brystpressmaskiner — én i kg, én i lbs — og hvilken Eivind bruker avhenger av hva som er ledig.
- **Kroppsvektøvelser** (dips, pull-ups) føres bare med ekstravekten («10 kg»), ikke med de ~90 kg kroppen veier. Pull-ups uten ekstravekt kan i dag ikke logges i det hele tatt — et sett med vekt 0 regnes som tomt.

Målet er at volum og vekttall i appen stemmer med det som faktisk ble løftet.

## Mål

- Velge enhet per øvelse i den aktive økta: **kg**, **lbs** eller **+ kroppsvekt**.
- Kroppsvekt legges inn på profilsiden.
- **Kg er enheten appen viser overalt.** lbs regnes om; kroppsvekt legges til.
- Gjelder fra nå av.

## Ikke-mål

- Ingen omregning av gamle økter. Sett uten enhet er kg, som før.
- Ingen «motstand/nivå»-enhet (strikk, stablenivåer) — ikke et problem for Eivind.
- Ingen andel av kroppsvekt per øvelse (armhevinger ≈ 65 %). «+ kroppsvekt» teller hele kroppsvekten.
- Ingen enhet på maler (`ExerciseTemplate`) — maler lagrer ikke vekt som brukes i dag.

## Begrensninger

- `useSetMetrics.ts` er eneste sannhet for hva et sett er verdt (CLAUDE.md). Ingen `weight * reps` inline.
- Økter lagres som JSONB (`exercises`) — ingen databaseendring trengs. Profildata ligger i `user_metadata`.
- Norsk tallformat: komma som desimaltegn i inndata og visning.
- Telefonen først; trykkflater ≥ 44 px (DESIGN.md).
- Kondisjon påvirkes ikke.

## Tilnærminger

- **A. Lagre det som ble skrevet inn + enhet, regn om ett sted (valgt).** Settet beholder `weight` slik det ble tastet (100) og får `weightUnit` (`'lbs'`). En hjelper i `useSetMetrics` gir belastning i kg; `setVolume` og alle visninger bruker den. Tallet maskinen viste er bevart, og ekstravekten i dips holdes atskilt fra kroppsvekten. Kostnad: rundt 50 steder som leser `set.weight` direkte må over på hjelperen.
- **B. Regne om ved inntasting** (vekt alltid lagret i kg, kroppsvekt bakt inn). Valgt bort: tallet fra maskinen forsvinner (neste gang står det 45,4, ikke 100), dips lagres som «100 kg» så fremgangen på ekstravekten drukner, og avrunding hoper seg opp.

UI: **variant A fra skissene** — én velger per øvelse øverst i arket, ikke en knapp per sett-rad.

## Datamodell

På `WorkoutSet` (feltet `weightUnit` finnes allerede i typen, men brukes ikke):

- `weightUnit?: 'kg' | 'lbs'` — enheten `weight` ble skrevet inn i; mangler = `'kg'`.
- `withBodyweight?: boolean` — ny. Kroppsvekten er en del av belastningen; `weight` er da ekstravekten (i kg eller lbs). Lagt til etter godkjenning: andre brukere kan ha dip-belte med lbs-skiver.
- `weight` — tallet slik det ble skrevet inn.
- `bodyweight?: number` — ny. Kroppsvekt i kg kopiert fra profilen når `withBodyweight` slås på. Et øyeblikksbilde, så gamle sett ikke endrer seg når kroppsvekten i profilen endres.
- Første (ucommittede) versjon lagret «kg + kroppsvekt» som `weightUnit: 'bodyweight'`; den leses fortsatt som kg + kroppsvekt.

Profil: `user_metadata.bodyweight` (kg, tall).

**Lagringsrunden må beholde feltene.** `useSupabaseData` bygger settene på nytt ved lagring (`updateWorkoutSession` m.fl., felt for felt) — `weightUnit`, `withBodyweight` og `bodyweight` må tas med der, ellers forsvinner de ved første lagring. Det samme gjelder IndexedDB-speilingen.

## Regler (`useSetMetrics`)

- **Belastning i kg** for et styrkesett:
  - `kg`: `weight`
  - `lbs`: `weight × 0,45359237`
  - `withBodyweight`: i tillegg `+ bodyweight` (mangler øyeblikksbilde → bare ekstravekten)
- **Volum** = belastning i kg × reps (styrke), 0 for kondisjon — som før.
- **Fremgangsvekt** (Eivinds beslutning) — det tyngste sett, PR, 1RM og «Neste gang» sammenligner:
  - `kg`: `weight`; `lbs`: `weight × 0,45359237`
  - `withBodyweight`: bare ekstravekten (omregnet hvis lbs)
  - Slik henger gamle dips-sett («10 kg», uten enhet) sammen med nye, og fremgangen fra 10 til 15 kg ekstra synes. Volumet bruker derimot hele belastningen — det var volumet som var feil.
- **Logget sett:** uten kroppsvekt kreves reps > 0 og vekt > 0 (som i dag). Med kroppsvekt holder reps > 0 — pull-ups uten ekstravekt teller.
- Alle steder som i dag leser `set.weight` som kg går over til hjelperne: volum og lagret `totalVolume` til belastning i kg; tyngste sett, PR, 1RM-merker, snittvekt og «Neste gang» til fremgangsvekt.

## Den aktive økta (`WorkoutSession.vue`)

- **Enhetsvelger** øverst i sett-arket for styrkeøvelser: segmentert «kg · lbs» og ved siden av en av/på-pille «+ kroppsvekt» (DESIGN.md «Av/på-pille»: felt-palett av, tonet oransje med × på). Valgene skrives til alle settene i øvelsen (og `bodyweight` fra profilen når kroppsvekt er på).
- **Nye sett** arver enheten (og kroppsvekten) fra settet over.
- **Første gang en øvelse åpnes i en økt** starter velgeren på enheten fra siste gang øvelsen ble logget (siste fullførte økt med øvelsen); ellers kg.
- **Kolonneoverskrift** følger valget: «Vekt (kg)», «Vekt (lbs)», «Ekstra (kg)», «Ekstra (lbs)».
- **I arket vises tall i valgt enhet** (inndata, hjelpetekst fra forrige gang, «Sist: 10 × 100 lbs»), fordi det er det maskinen viser. Volum-kolonnen og «… kg totalt» er alltid kg.
- **+ kroppsvekt:** under velgeren «Kroppsvekt 90 kg · fra profilen». Mangler kroppsvekt: «Legg inn kroppsvekt under Profil for å få den med i volumet» (dempet tekst), og settene teller bare ekstravekten.
- **Kroppsvekt lagt inn underveis** (vår beslutning): når økta fullføres, får `bodyweight`-sett i den som mangler øyeblikksbilde, profilens kroppsvekt. Fullførte økter endres ikke.

## Resten av appen

- **Kg overalt** utenfor arket: øktdetaljer, øvelsessiden, historikk, statistikk, ukesoversikt. lbs-sett vises omregnet (maks én desimal, «45,4 kg»).
- **Kroppsvektsett i settlister** (øktdetaljer, øvelsessiden) vises som «KV + 10 kg» — samme tall som fremgangen måles i (vår beslutning). Volum ved siden av er total kg.
- **Tyngste sett, PR og 1RM** bruker fremgangsvekt (Eivinds beslutning, se «Regler»).

## Profil (`Profile.vue`)

- Nytt felt «Kroppsvekt (kg)», valgfritt, i eksisterende profilskjema; lagres i `user_metadata.bodyweight` sammen med navn/telefon. Komma godtas. Rimelig område 30–300 kg; tomt felt fjerner verdien.

## Våre beslutninger (Eivind har ikke tatt stilling)

- Arket viser valgt enhet; resten av appen viser kg.
- Kroppsvektsett i settlister vises som «KV + ekstra kg».
- Manglende kroppsvekt: hint, ikke blokkering; settet teller bare ekstravekten, men får kroppsvekten fylt inn når økta fullføres hvis den er lagt inn i profilen innen da.
- Velgeren starter på sist brukte enhet for øvelsen.

(Eivind har bestemt: fremgang på kroppsvektøvelser måles i ekstravekt, volum i total belastning.)

## Overlatt til den som bygger

- Hvor «sist brukte enhet» slås opp (ligner `getLastPerformance` i `WorkoutSession.vue`).
- Navn på hjelperne i `useSetMetrics` og formatteringen av kg med én desimal.
- Om velgeren blir en egen komponent.
