# Dra arkene ned for å lukke — design

## Hvorfor

Bunnarkene har en strek øverst som sier at man kan dra dem ned, men det går ikke. I dag lukkes de bare ved et trykk på streken eller utenfor arket.

## Hva

- Gjelder de to arkene med strek:
  - arket for malen på forsiden ([TemplateSheet.vue](../../../src/components/TemplateSheet.vue));
  - arket for øvelsen i aktiv økt (`.ex-sheet` i [WorkoutSession.vue](../../../src/views/WorkoutSession.vue)).
- **Bare toppen kan gripes** (Eivinds valg): streken og header-området.
  - I malarket er headeren «Push» med blyanten.
  - I øktarket er det øvelsesnavnet med pilene.
  - Resten av arket ruller og virker som i dag. Tallfelt, sveip for å slette sett og rulling påvirkes ikke.
- **Arket følger fingeren nedover.** Det går ikke over toppen, og bakgrunnen tones ut i takt med dragningen.
- **Når man slipper:**
  - Arket lukkes hvis det er dratt mer enn en fjerdedel av høyden sin, eller er sveipet raskt nedover. Da glir det ut og lukkes.
  - Ellers spretter det tilbake.
- **Trykk virker som før.** Et trykk uten bevegelse på streken lukker, og et trykk på blyanten eller pilene virker. Klikket som følger etter en dragning, svelges.
- **Når arket er rullet ned,** kan det ikke dras. Da må man rulle opp først. Toppen er da uansett ute av syne.
- Under `prefers-reduced-motion` skjer det uten animasjon.

## Tilnærming

- **Valgt:** én felles composable (`useSheetDrag`) som begge arkene bruker, med samme terskler og samme følelse.
- **Gripeflaten** får `touch-action: none`, så nettleseren ikke tar over gesten for å rulle. Da kommer pekerhendelsene fram, også på iPhone.
- **Valgt bort:** å kunne gripe hvor som helst når arket er rullet helt opp. Det kunne lukke arket ved et uhell midt i en økt.

## Begrensninger

- `useLongPressReorder`, sveip for å slette og resten av logikken i `WorkoutSession.vue` røres ikke. Bare arkets markup og stil får gripeflaten.
- `npm run type-check` og `npm run build` skal være rene.
