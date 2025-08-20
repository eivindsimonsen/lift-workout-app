# Caching Issue Fix

## Problem Description

Appen hadde et problem hvor økter som ble fullført ikke ble riktig synkronisert mellom lokal state og Supabase. Dette resulterte i at:

1. Økter ble fullført og lagret i historikken
2. Når appen ble lukket og åpnet igjen, var økten fortsatt aktiv
3. Dette skjedde fordi caching ikke ble oppdatert umiddelbart etter endringer

## Root Cause

Problemet lå i `useSupabaseData.ts` hvor:

1. **Cache Update Timing**: Cachen ble ikke oppdatert umiddelbart etter at økter ble fullført/avbrutt/startet
2. **Visibility Change Handler**: Synkronisering skjedde kun når cache var "stale" (>5 minutter)
3. **Focus Events**: Ingen synkronisering når appen fikk fokus

## Solution Implemented

### 1. Immediate Cache Updates

Alle funksjoner som endrer session state oppdaterer nå cachen umiddelbart:

- `completeWorkoutSession()` - oppdaterer cache etter fullføring
- `abandonWorkoutSession()` - oppdaterer cache etter avbrudd
- `startWorkoutSession()` - oppdaterer cache etter start

### 2. Enhanced Visibility Change Handler

- Synkroniserer data hver gang siden blir synlig (ikke kun når cache er stale)
- Redusert delay fra 500ms til 200ms for bedre responsivitet

### 3. Focus Event Handler

- Ny handler som synkroniserer data når appen får fokus
- Hjelper med å løse problemer på mobile enheter

### 4. Force Sync Function

- Ny `forceSyncData()` funksjon for manuell synkronisering
- Eksponert via `useHybridData` og `useSupabaseData`

### 5. Debug Tools

- Debug-knapper i `TemplateSessions.vue` for å:
  - Tvinge synkronisering
  - Vise session detaljer
  - Se debug-informasjon om app state

## Code Changes

### useSupabaseData.ts

```typescript
// Immediate cache updates in completeWorkoutSession
const completeWorkoutSession = async (sessionId: string) => {
  // Update local state immediately
  // Update in Supabase
  // Immediately update local cache
};

// Enhanced visibility change handler
const handleVisibilityChange = () => {
  // Always sync when page becomes visible
  loadData(0, true); // Force refresh
};

// New focus handler
const handleFocus = () => {
  // Sync data when app gains focus
  loadData(0, true);
};

// New force sync function
const forceSyncData = async () => {
  await syncWithSupabase();
};
```

### TemplateSessions.vue

```vue
<!-- Debug buttons -->
<button @click="forceSyncData">Tving synkronisering</button>
<button @click="showSessionDetails">Vis session detaljer</button>

<!-- Debug info section -->
<div class="debug-info">
  <p>Totalt antall økter: {{ workoutData.sessions.value.length }}</p>
  <p>Aktive økter: {{ activeSessions.length }}</p>
  <!-- ... -->
</div>
```

## Testing

For å teste at fixen fungerer:

1. Start en økt
2. Fullfør økten
3. Lukk appen
4. Åpne appen igjen
5. Økten skal nå være markert som fullført

## Debug Commands

Hvis problemet fortsetter:

1. Bruk "Tving synkronisering" knappen
2. Sjekk debug-informasjonen
3. Bruk "Vis session detaljer" for å se alle økter
4. Sjekk browser console for feilmeldinger

## Future Improvements

1. **Real-time Sync**: Implementer Supabase real-time subscriptions
2. **Conflict Resolution**: Håndter konflikter mellom lokal og remote data
3. **Offline Queue**: Bedre håndtering av offline endringer
4. **Cache Validation**: Valider cache data mot Supabase for konsistens
