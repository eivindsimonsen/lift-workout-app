# Test Files

Denne mappen inneholder **ALLE** test-filer som brukes for utvikling og testing av applikasjonen.

## ⚠️ VIGTIG
**Disse filene er KUN for testing og utvikling. De påvirker IKKE produksjonsmiljøet.**

## Filer

### `useWorkoutData-test.ts`
- Test-version av data-håndtering som bruker statiske JSON-filer
- Brukes av `useHybridData` for å håndtere statiske data (øvelser, økt-typer)
- **IKKE brukt for produksjon** - Supabase brukes i stedet

### `workout-sessions-example.json`
- Eksempel-data for treningsøkter
- Brukes kun for testing og utvikling
- **IKKE brukt for produksjon** - Supabase brukes i stedet

### `workout-templates-example.json`
- Eksempel-data for treningsøkt-maler
- Brukes kun for testing og utvikling
- **IKKE brukt for produksjon** - Supabase brukes i stedet

## Struktur

```
src/Test/
├── README.md                           # Denne filen
├── useWorkoutData-test.ts              # Test data-håndtering
├── workout-sessions-example.json       # Eksempel økt-data
└── workout-templates-example.json      # Eksempel mal-data
```

## Bruk

Disse filene brukes kun under utvikling for å teste funksjonalitet uten å være avhengig av Supabase. I produksjon brukes `useSupabaseData` i stedet.

## Sikkerhet

- Alle filer har "-example" eller "-test" i navnet
- Alle filer er samlet i denne Test-mappen
- Disse filene kan trygt slettes eller endres uten å påvirke produksjonsmiljøet
- Ingen av disse filene brukes i produksjon
