# Rekkefølge på malene — design

## Hvorfor

Malene på forsiden står i den rekkefølgen de ble laget. Eivind vil bestemme rekkefølgen selv, på samme måte som han endrer rekkefølge på øvelser i malskjemaet og i aktiv økt.

## Hva

- **Hold inne og dra** et malkort på forsiden for å flytte det, med samme hjelper som øvelsene (`useLongPressReorder`): et langt trykk starter dra, bevegelse før det avbryter, og klikket etter et dra svelges. Trykk for å åpne kortet og startknappen virker som før.
- Kortet som dras, løftes litt (skygge og svak forstørrelse), som raden i malskjemaet.
- **Rekkefølgen lagres på telefonen** (`localStorage`, per bruker) og gjelder fra neste gang forsiden tegnes, også offline. (Eivinds valg, alternativ A: han bruker bare appen på telefon.)
- **Nye maler havner nederst.** Maler som ikke finnes i den lagrede rekkefølgen, står etter de ordnede i opprettelsesrekkefølge; slettede id-er ignoreres.
- **Malene står i én kolonne på alle skjermer** (to-kolonneoppsettet fra 768px fjernes), siden dra virker i én kolonne og appen bare brukes på telefon. (Vår beslutning.)

## Tilnærming

- **Valgt (A):** rekkefølgen som en liste med mal-id-er i `localStorage`, nøkkel per bruker. Ingen SQL, ingen nettverk.
- **Valgt bort (B):** `user_metadata` med lokal kopi — overlever ny telefon, men krever lagring mot nettet ved hver flytting og håndtering av offline.
- **Valgt bort:** egen `sort_order`-kolonne — krever SQL og oppdatering av flere maler per flytting; mer enn nødvendig for én telefon.

## Ikke-mål

- Synk av rekkefølgen mellom enheter. Ny telefon eller slettede appdata gir opprettelsesrekkefølge igjen; ingenting annet går tapt.
- Endringer i `TemplateCard.vue`s grensesnitt.

## Overlatt til den som bygger

- Nøkkelnavn og hvor rekkefølgelogikken bor (egen liten modul er naturlig, så sorteringen kan selvsjekkes i Node).
- Hvordan dra-stilen legges på kortet uten å endre komponenten (f.eks. en omslutning per kort).
