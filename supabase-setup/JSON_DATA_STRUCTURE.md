# JSON Data Structure for Supabase

Denne filen dokumenterer JSON-strukturen for data som sendes til og hentes fra Supabase i Next Rep Workout App.

## 📊 **Data Typer**

### 1. **Users (Brukere)**
```sql
-- Tabell: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**JSON Struktur:**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 2. **Workout Types (Treningsøvelse-typer)**
```sql
-- Tabell: workout_types
CREATE TABLE workout_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL
);
```

**JSON Struktur:**
```json
{
  "id": "push",
  "name": "Push",
  "description": "Øvelser som trener bryst, skuldre og triceps",
  "color": "#f97316"
}
```

**Eksempel Data:**
```json
[
  {
    "id": "push",
    "name": "Push",
    "description": "Øvelser som trener bryst, skuldre og triceps",
    "color": "#f97316"
  },
  {
    "id": "pull",
    "name": "Pull", 
    "description": "Øvelser som trener rygg og biceps",
    "color": "#3b82f6"
  },
  {
    "id": "legs",
    "name": "Legs",
    "description": "Øvelser som trener ben og glutes",
    "color": "#10b981"
  }
]
```

### 3. **Exercises (Øvelser)**
```sql
-- Tabell: exercises
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  workout_types TEXT[],
  muscle_groups TEXT[]
);
```

**JSON Struktur:**
```json
{
  "id": "bench-press",
  "name": "Benkpress",
  "category": "Bryst",
  "workout_types": ["push"],
  "muscle_groups": ["Bryst", "Triceps", "Skuldre"]
}
```

**Kategorier (category):**
- `"Bryst"` - Brystmuskulatur
- `"Rygg"` - Ryggmuskulatur  
- `"Ben"` - Benmuskulatur
- `"Skuldre"` - Skuldermuskulatur
- `"Armer"` - Armmuskulatur
- `"Kjerne"` - Kjerne/core

**Workout Types:**
- `"push"` - Push-øvelser
- `"pull"` - Pull-øvelser
- `"legs"` - Ben-øvelser

**Muscle Groups:**
- `"Bryst"` - Pectoralis major/minor
- `"Rygg"` - Latissimus dorsi, trapezius
- `"Ben"` - Quadriceps, hamstrings, glutes
- `"Skuldre"` - Deltoids
- `"Armer"` - Biceps, triceps, forearms
- `"Kjerne"` - Abs, obliques, lower back

### 4. **Workout Templates (Treningsøvelse-maler)**
```sql
-- Tabell: workout_templates
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  workout_type TEXT REFERENCES workout_types(id),
  exercises JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**JSON Struktur:**
```json
{
  "id": "uuid-string",
  "user_id": "user-uuid",
  "name": "Push Day",
  "description": "Bryst, skuldre og triceps",
  "workout_type": "push",
  "exercises": [
    {
      "exercise_id": "bench-press",
      "sets": 3,
      "reps": 8,
      "weight": 80,
      "rest_time": 120
    },
    {
      "exercise_id": "shoulder-press",
      "sets": 3,
      "reps": 10,
      "weight": 50,
      "rest_time": 90
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Exercise Template Struktur:**
```json
{
  "exercise_id": "string",     // Referanse til exercise.id
  "sets": "number",            // Antall sett
  "reps": "number",            // Antall repetisjoner
  "weight": "number",          // Vekt i kg
  "rest_time": "number"        // Hviletid i sekunder
}
```

### 5. **Workout Sessions (Treningsøkter)**
```sql
-- Tabell: workout_sessions
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  exercises JSONB NOT NULL
);
```

**JSON Struktur:**
```json
{
  "id": "uuid-string",
  "user_id": "user-uuid",
  "template_id": "template-uuid",
  "name": "Push Day - 15.01.2024",
  "status": "completed",
  "started_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T11:30:00Z",
  "exercises": [
    {
      "exercise_id": "bench-press",
      "sets": [
        {
          "set_number": 1,
          "reps": 8,
          "weight": 80,
          "completed": true,
          "notes": "Felt bra"
        },
        {
          "set_number": 2,
          "reps": 6,
          "weight": 80,
          "completed": true,
          "notes": "Tungt"
        }
      ]
    }
  ]
}
```

**Set Struktur:**
```json
{
  "set_number": "number",      // Sett nummer (1, 2, 3...)
  "reps": "number",            // Antall repetisjoner
  "weight": "number",          // Vekt i kg
  "completed": "boolean",      // Om settet er fullført
  "notes": "string"            // Notater (valgfritt)
}
```

**Status Verdier:**
- `"active"` - Økten er pågående
- `"completed"` - Økten er fullført
- `"paused"` - Økten er satt på pause

## 🔄 **CRUD Operasjoner**

### **Create (Opprett)**
```typescript
// Opprett ny øvelse
const newExercise = {
  id: "new-exercise",
  name: "Ny Øvelse",
  category: "Bryst",
  workout_types: ["push"],
  muscle_groups: ["Bryst", "Triceps"]
}

// Opprett ny template
const newTemplate = {
  name: "Ny Template",
  workout_type: "push",
  exercises: [...]
}
```

### **Read (Les)**
```typescript
// Hent alle øvelser
const exercises = await supabase
  .from('exercises')
  .select('*')

// Hent templates for en bruker
const templates = await supabase
  .from('workout_templates')
  .select('*')
  .eq('user_id', userId)
```

### **Update (Oppdater)**
```typescript
// Oppdater øvelse
await supabase
  .from('exercises')
  .update({ name: "Oppdatert Navn" })
  .eq('id', exerciseId)

// Oppdater template
await supabase
  .from('workout_templates')
  .update({ exercises: newExercises })
  .eq('id', templateId)
```

### **Delete (Slett)**
```typescript
// Slett øvelse
await supabase
  .from('exercises')
  .delete()
  .eq('id', exerciseId)

// Slett template
await supabase
  .from('workout_templates')
  .delete()
  .eq('id', templateId)
```

## 📝 **Notater**

- Alle UUID-er genereres automatisk av Supabase
- Timestamps oppdateres automatisk
- Foreign key constraints sikrer dataintegritet
- JSONB-felter tillater fleksible datastrukturer
- Alle brukerdata er isolert med `user_id` foreign key
