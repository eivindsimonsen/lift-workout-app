# PWA Update Testing Guide

## Hvordan teste PWA-oppdateringer

### 1. Bygg og deploy

```bash
npm run build
```

### 2. Åpne appen i nettleser

- Åpne den bygde versjonen (dist-mappen)
- Installer som PWA hvis mulig

### 3. Gjør endringer i koden

- Endre noe i en Vue-komponent
- Endre versjon i package.json
- Lagre endringene

### 4. Bygg igjen

```bash
npm run build
```

### 5. Test oppdatering

- Gå tilbake til appen
- Du skal nå se "Oppdatering tilgjengelig" meldingen
- Klikk "Oppdater" for å aktivere den nye versjonen

## Feilsøking

### Hvis oppdateringen ikke vises:

1. Sjekk at service worker er registrert (DevTools > Application > Service Workers)
2. Sjekk console for feilmeldinger
3. Prøv å tømme cache og hard refresh (Ctrl+Shift+R)

### Console logging:

- 🔍 UpdateNotification: Viser oppdateringssjekk
- 🔧 SW: Viser service worker aktivitet
- 🔄 UpdateNotification: Viser når appen oppdateres

## Teknisk informasjon

### Events som lytteres til:

- `sw-update-available`: Custom event fra service worker
- `vite-plugin-pwa:update-found`: Vite PWA plugin event
- `vite-plugin-pwa:update-ready`: Vite PWA plugin event

### Service Worker konfigurasjon:

- `skipWaiting: true`: Aktiverer ny service worker umiddelbart
- `clientsClaim: true`: Tar kontroll over alle klienter
- `registerType: "prompt"`: Lar appen håndtere oppdateringer manuelt
