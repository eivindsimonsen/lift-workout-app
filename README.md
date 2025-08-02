# Treningsloggen

En minimalistisk og stilren treningslogg bygget med Vue 3, TypeScript og TailwindCSS.

## 🎯 Konsept

Treningsloggen handler om å alltid ta neste steg — neste repetisjon. Det er en motiverende, men oversiktlig loggbok som hjelper deg med å se utvikling over tid og gjøre det enklere å være konsistent med treningen.

## ✨ Funksjoner

- **Dashboard**: Oversikt over siste økter, totalvolum og raske handlinger
- **Ny Økt**: Enkel registrering av treningsøkter med øvelser, sett og repetisjoner
- **Historikk**: Søk og filtrer gjennom alle tidligere økter
- **Statistikk**: Se progresjon over tid med grafer og analyser
- **Lokal lagring**: Alle data lagres lokalt i nettleseren
- **Responsivt design**: Fungerer perfekt på både desktop og mobil

## 🛠️ Teknologi

- **Vue 3** med Composition API
- **TypeScript** for type-sikkerhet
- **TailwindCSS** for styling
- **Composables** for state management
- **Vue Router** for navigasjon
- **Vite** som build tool

## 🚀 Kom i gang

### Forutsetninger

- Node.js (versjon 16 eller høyere)
- npm eller yarn

### Installasjon

1. Klon prosjektet:
```bash
git clone <repository-url>
cd treningsloggen
```

2. Installer avhengigheter:
```bash
npm install
```

3. Start utviklingsserver:
```bash
npm run dev
```

4. Åpne nettleseren og gå til `http://localhost:5173`

### Build for produksjon

```bash
npm run build
```

## 📱 Bruk av applikasjonen

### Registrere en ny økt

1. Klikk på "Start Økt" på dashboard eller naviger til "Ny Økt"
2. Fyll ut øktdetaljer (navn, varighet)
3. Legg til øvelser ved å klikke "Legg til øvelse"
4. For hver øvelse, legg til sett med reps og vekt
5. Klikk "Lagre Økt" når du er ferdig

### Se historikk

- Naviger til "Historikk" for å se alle tidligere økter
- Bruk søkefunksjonen for å finne spesifikke økter
- Sorter etter dato, navn, varighet eller volum
- Klikk på en økt for å se detaljer

### Analysere statistikk

- Gå til "Statistikk" for å se progresjon over tid
- Se ukentlig volum og mest brukte øvelser
- Følg din utvikling med motivasjonelle elementer

## 🎨 Design

Applikasjonen bruker et mørkt tema med oransje aksentfarge (#F97316) for å skape en solid og motiverende følelse. Designet er minimalistisk og fokuserer på brukervennlighet.

### Farger

- **Primærfarge**: Oransje (#F97316)
- **Bakgrunn**: Mørk (#0f172a)
- **Kort**: Mørkere grå (#1e293b)
- **Tekst**: Hvit og grå nyanser

## 📊 Data Struktur

Applikasjonen lagrer følgende data lokalt:

- **Workout**: Øktdetaljer med navn, dato og varighet
- **Exercise**: Øvelser med navn
- **Set**: Sett med reps, vekt, varighet og andre detaljer

## 🔧 Utvikling

### Prosjektstruktur

```
src/
├── components/     # Gjenbrukbare komponenter
├── views/         # Side-komponenter
├── composables/   # Vue composables
├── types/         # TypeScript type definisjoner
├── router/        # Vue Router konfigurasjon
└── style.css      # Globale stiler
```

### Nye funksjoner

For å legge til nye funksjoner:

1. Opprett nye komponenter i `src/components/`
2. Legg til nye routes i `src/router/index.ts`
3. Oppdater store hvis nødvendig i `src/stores/`
4. Legg til TypeScript typer i `src/types/`

## 📝 Lisens

Dette prosjektet er laget som en personlig treningslogg.

## 🤝 Bidrag

Dette er et personlig prosjekt, men feedback og forslag er alltid velkomne!

---

**Treningsloggen** - Ta neste steg mot dine mål! 💪 