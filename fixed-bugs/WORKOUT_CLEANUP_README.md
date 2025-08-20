# Workout Cleanup Implementation

## Problem Description

Tidligere lagret appen hele økten til Supabase når brukeren fullførte den, inkludert alle ufullførte øvelser og sett med 0-verdier. Dette resulterte i:

1. **Unødvendig data**: Øvelser og sett som ikke bidrar til statistikkene ble lagret
2. **Inflated statistics**: Statistikkene ble påvirket av ufullførte øvelser
3. **Database bloat**: Lagring av data som ikke har verdi for brukeren

## Solution Implemented

### 1. Data Cleanup Before Completion

Når brukeren fullfører eller avbryter en økt, ryddes dataene opp før de sendes til Supabase:

- **Fjern ufullførte øvelser**: Øvelser uten fullførte sett fjernes
- **Fjern ufullførte sett**: Sett med 0 vekt/reps eller ufullførte sett fjernes
- **Bare fullførte data lagres**: Kun øvelser og sett som faktisk bidrar til statistikkene lagres

### 2. User Experience Improvements

- **Visual warnings**: Brukeren ser hvilke øvelser og sett som vil bli fjernet
- **Clear confirmation**: Bekreftelsesmeldingen informerer om hvor mange øvelser/sett som fjernes
- **Consistent behavior**: Samme opprydding skjer både ved fullføring og avbrudd

### 3. Technical Implementation

#### New Functions Added

```typescript
// Main cleanup function
const cleanupSessionData = async (sessionData: WorkoutSession): Promise<WorkoutSession>

// Updated completion functions
const completeWorkout = async () => { /* ... */ }
const abandonWorkout = async () => { /* ... */ }
```

#### Cleanup Logic

1. **Filter exercises**: Behold kun øvelser med minst ett fullført sett
2. **Filter sets**: Behold kun fullførte sett med vekt > 0 og reps > 0
3. **Remove empty exercises**: Fjern øvelser som ender opp uten sett etter opprydding
4. **Log cleanup**: Detaljert logging av hva som fjernes

#### UI Indicators

- **Exercise warnings**: Gule advarsler for øvelser som vil bli fjernet
- **Set warnings**: Mindre advarsler for ufullførte sett
- **Confirmation messages**: Informasjon om antall øvelser/sett som fjernes

## Benefits

### For Users
- **Cleaner statistics**: Kun faktiske treningsopplevelser påvirker statistikkene
- **Better insights**: Mer nøyaktige data om treningsprogresjon
- **Clear feedback**: Forstår hva som skjer med ufullførte øvelser

### For System
- **Reduced storage**: Mindre unødvendig data i databasen
- **Better performance**: Raskere spørringer og statistikkberegninger
- **Data integrity**: Kun meningsfulle data lagres permanent

## Example Scenarios

### Scenario 1: Partial Workout Completion
**Before**: Bruker fullfører økt med 3 øvelser, men kun 1 har fullførte sett
- **Result**: Kun den fullførte øvelsen lagres, 2 ufullførte øvelser fjernes

### Scenario 2: Incomplete Sets
**Before**: Øvelse har 4 sett, men kun 2 er fullført
- **Result**: Kun de 2 fullførte settene lagres, 2 ufullførte sett fjernes

### Scenario 3: Zero Values
**Before**: Sett med 0 vekt eller 0 reps
- **Result**: Disse settene fjernes automatisk

## Code Changes Made

### WorkoutSession.vue
- Added `cleanupSessionData()` function
- Updated `completeWorkout()` and `abandonWorkout()` functions
- Enhanced confirmation dialogs with cleanup information
- Added visual warnings for incomplete exercises and sets

### Key Features
- **Automatic cleanup**: Data ryddes opp automatisk før lagring
- **User transparency**: Brukeren ser nøyaktig hva som skjer
- **Consistent behavior**: Samme opprydding ved fullføring og avbrudd
- **Detailed logging**: Console logging for debugging og overvåking

## Future Enhancements

### Potential Improvements
1. **Selective cleanup**: La brukeren velge hvilke ufullførte øvelser som skal beholdes
2. **Template preservation**: Behold øvelsesstrukturen for fremtidige økter
3. **Progress tracking**: Spor progresjon mot mål selv for ufullførte øvelser
4. **Recovery options**: Mulighet til å gjenopprette ufullførte øvelser

### Configuration Options
- **Cleanup preferences**: La brukeren konfigurere opprydding
- **Threshold settings**: Definer hva som regnes som "ufullført"
- **Auto-cleanup**: Automatisk opprydding etter en viss tid

## Testing

### Test Cases
1. **Complete workout with mixed completion status**
2. **Abandon workout with incomplete exercises**
3. **Edge cases with zero values**
4. **Multiple incomplete exercises and sets**
5. **Verify data integrity in Supabase**

### Verification
- Check console logs for cleanup information
- Verify only completed data is stored in database
- Confirm statistics are calculated correctly
- Test both online and offline scenarios
