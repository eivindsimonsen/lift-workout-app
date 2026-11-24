# Ønskeliste

Funksjoner vi vil legge til en gang, men ikke ennå. Hver av dem tas gjennom samme løp som før: skisse, design, plan, bygging. Notatene under hver er utgangspunkt fra koden slik den er nå, ikke vedtatte løsninger.

Sist oppdatert 2026-11-24.

## Ønsket

### Supersett

To (eller flere) øvelser som kjøres vekselvis, for eksempel benkpress og roing.

- Øvelsene i en mal og en økt er en flat liste (`exercises` som JSONB). Et supersett trenger en gruppering i den lista, i både mal og økt, så historikken beholder den.
- Aktiv økt ([WorkoutSession.vue](src/views/WorkoutSession.vue)) må hoppe mellom øvelsene i gruppa i stedet for å gå videre til neste øvelse.
- Avklar: kan kondisjon være med i et supersett (sirkeltrening)?

### Forslag til progresjon

Appen sier ikke bare hva du løftet sist, men hva du bør prøve neste gang: «3×10 på 60 kg to økter på rad → prøv 62,5 kg».

- Bygger på «Sist»-hintene i aktiv økt. Progresjon måles alltid i `setProgressKg` ([useSetMetrics.ts](src/composables/useSetMetrics.ts)), så lbs og kroppsvekt + ekstra vekt blir riktig.
- Avklar: hvilken regel (dobbel progresjon er et godt utgangspunkt), og om rep-området settes per øvelse i malen.

### Pauseuker

Marker en uke som ferie, sykdom eller deload, så streaken fryses i stedet for å brytes.

- Streaken regnes i [goalStreak.ts](src/composables/goalStreak.ts) (`streakFromWeeks`). En pauseuke verken bryter eller øker den.
- Pauseukene kan lagres i `user_metadata`, som målhistorikken.
- Avklar: skal det være en grense for antall pauseuker, så streaken fortsatt betyr noe?

### Mandagsoppsummering

Første gang appen åpnes i en ny uke, viser forsiden et kort med forrige uke: økter, sett, mål nådd eller ikke, og streaken.

- Tallene finnes allerede i `useWeekStats(-1)` og `useGoalStreak`.
- Vises én gang per uke per enhet, som feiringen av streaken (`lift-streak-celebrated` i [TemplateSessions.vue](src/views/TemplateSessions.vue)).
- Ingen emoji (DESIGN.md). Uka er enheten, ikke dagen.

### Kondisjonsrekorder

PR-øyeblikk for kondisjon: raskeste 5 km og 10 km, beste tempo og lengste distanse.

- [useCardioActivities.ts](src/composables/useCardioActivities.ts) har allerede lengste aktivitet. Raskeste og beste tempo mangler.
- Avklar: hvor de vises (øvelsessiden, Statistikk, oppsummeringen etter økta), og hvordan intervaller med flere runder regnes.

### Øvelsesbiblioteket offline

Biblioteket lagres ikke på telefonen i dag. Uten dekning vises verken streaken eller målene, og Ukesmål-siden står på «Laster øvelser…».

- [useExercises](src/composables/useExercises.ts) henter rett fra Supabase. Biblioteket kan lagres i IndexedDB (`LIFTDB`), som maler og økter.
- Biblioteket er felles for begge brukerne (RLS er åpen), så en endring fra den ene må nå den andres kopi.
- Dette er nærmest en feilretting og bør trolig komme først.

### Eksport og backup til CSV

Last ned all treningshistorikk som CSV, så dataene er dine uansett hva som skjer med appen.

- Én rad per sett: dato, økt, øvelse, settnummer, vekt og enhet, reps, tid, distanse og anstrengelse.
- Øvelsesnavn slås opp gjennom `exerciseIndex`, siden en id kan peke på både en øvelse og en variant.
- Knappen hører trolig hjemme på Profil.

## Vurdert og valgt bort

Foreslått 2026-11-24, og Eivind ville ikke ha dem. Ikke foreslå dem igjen uten at han tar dem opp selv.

- Hviletimer mellom sett
- Oppvarmingssett som ikke teller
- Skivekalkulator
- Felles uke for de to brukerne
