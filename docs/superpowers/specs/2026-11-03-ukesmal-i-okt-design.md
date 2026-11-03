# Ukesmålet i den aktive økta — design

## Hvorfor

Samme dytt som «Igjen for å nå ukesmålet» på forsiden, men midt i økta: se hvor mye som gjenstår på muskelgruppene du trener nå, og se økta di fylle uka mens du logger.

## Hva

Oppsummeringsboksen nederst i `WorkoutSession.vue` (Sett · Volum · Varighet) får en seksjon under flisene, etter en skillelinje: **«Ukesmålet»**, med én søyle per relevant mål (variant C fra skissene).

- **Hvilke grupper:** muskelgruppene til styrkeøvelsene som er i økta (oppslag via `exerciseIndex` på id), i den rekkefølgen de først dukker opp — ikke en fast liste per økttype. Legger du til biceps i en push-økt, vises Biceps også. Grupper uten mål (> 0) utelates.
- **Søylen:** det du hadde før økta i muskelgruppens farge, settene fra denne økta oppå i samme farge med redusert opasitet (ingen nye hex-verdier). Fylt opp til målet, ikke forbi. Til høyre «gjort / mål», der gjort = før + i dag. Nådd → verdien grønn med hake («9 / 9 ✓»), og raden blir stående.
- **Live:** teller sett etter hvert som de logges (`isSetCounted`), samme regler som streaken.
- **Kondisjon** (vår beslutning): har økta kondisjonsøvelser og brukeren har kondisjonsmål, får minutter («Kondisjon») og km («Distanse») egne søyler i cyan (`#06b6d4`), med samme oppdeling før/i dag.
- **Alt nådd:** når alle radene er nådd, byttes seksjonen ut med én grønn linje: «✓ Ukesmålet er nådd for Bryst, Skuldre og Triceps» (navnene fra radene, «og» før siste).
- **Skjules** når brukeren ikke har mål, mens øvelsesbiblioteket ikke er lastet, når ingen av øktas grupper har mål, og når økta hører til en annen uke enn inneværende (startet før mandag 00:00 — den teller da i forrige uke).

## Tilnærming

- **A (valgt):** gjenbruk streak-logikken. Telle-regelen for én økt trekkes ut av `useGoalStreak` som delt hjelpefunksjon; `useGoalStreak` eksponerer inneværende ukes tally fra fullførte økter. Den aktive økta teller seg selv med samme hjelpefunksjon. «Nådd» avgjøres av `evaluateWeek` på summen, så økta og forsiden alltid er enige.
- **B (valgt bort):** bruke `useWeekStats` og telle øktas sett for seg i `WorkoutSession.vue` — dupliserer telle- og målregelen i en fil som allerede er over 2000 linjer.

## Ikke-mål

- Ingen fast kobling fra økttype til muskelgrupper.
- Ingen streak-tall eller kjede i økta — den bor på forsiden.
- Ingen endring av flisene som finnes (Sett, Volum, Kondisjon, Varighet).

## Stil

`DESIGN.md` → «Søyler»: innfelt spor `#0d1117`, høyde 0.3125–0.5rem, rett start og 4 px avrunding i enden; etikett og verdi i tekstfarger. Seksjonstittelen som undertittel i panel (0.6875rem / 600, versaler). Ny del i boksen får `margin-top`/`padding-top` + `border-top` i boksens kantfarge.

## Overlatt til den som bygger

- Nøyaktige avstander og kolonnebredder, innenfor `DESIGN.md`.
- Om seksjonen blir en egen komponent eller blir i `WorkoutSession.vue`.
