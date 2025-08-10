# JSON Data Structure for Next Rep Workout App

Denne filen dokumenterer hvordan data håndteres i Next Rep Workout App, inkludert både lokale JSON-filer og Supabase-tabeller.

## 📊 **Data Kilder**

### **Lokale JSON-filer (Statisk Data)**
- `exercises.json` - Alle tilgjengelige øvelser
- `workout-types.json` - Treningsøvelse-typer (push, pull, legs)

### **Supabase Tabeller (Brukerdata)**
- `users` - Brukerinformasjon
- `workout_templates` - Treningsøvelse-maler
- `workout_sessions` - Treningsøkter

---

## 🏋️ **Øvelser (exercises.json)**

**Filplassering:** `src/data/exercises.json`

**JSON Struktur:**
```json
{
  "id": "bench-press",
  "name": "Benkpress",
  "category": "Bryst",
  "workoutTypes": ["push"],
  "muscleGroups": ["Bryst", "Triceps", "Skuldre"]
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
- `"push"` - Push-øvelser (bryst, skuldre, triceps)
- `"pull"` - Pull-øvelser (rygg, biceps)
- `"legs"` - Ben-øvelser (quadriceps, hamstrings, glutes)

**Muscle Groups:**
- `"Bryst"` - Pectoralis major/minor
- `"Rygg"` - Latissimus dorsi, trapezius
- `"Ben"` - Quadriceps, hamstrings, glutes
- `"Skuldre"` - Deltoids
- `"Armer"` - Biceps, triceps, forearms
- `"Kjerne"` - Abs, obliques, lower back

---

## 🎨 **Treningsøvelse-typer (workout-types.json)**

**Filplassering:** `src/data/workout-types.json`

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

---

## 👥 **Brukere (Supabase)**

**Tabell:** `users`

**SQL Schema:**
```sql
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

---

## 📋 **Treningsøvelse-maler (Supabase)**

**Tabell:** `workout_templates`

**SQL Schema:**
```sql
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
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Exercise Template Struktur:**
```json
{
  "exercise_id": "string",     // Referanse til exercise.id fra exercises.json
  "sets": "number",            // Antall sett
  "reps": "number",            // Antall repetisjoner
  "weight": "number",          // Vekt i kg
  "rest_time": "number"        // Hviletid i sekunder
}
```

---

## 🏃 **Treningsøkter (Supabase)**

**Tabell:** `workout_sessions`

**SQL Schema:**
```sql
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

---

## 🔄 **CRUD Operasjoner**

### **Create (Opprett)**
```typescript
// Opprett ny template
const newTemplate = {
  name: "Ny Template",
  workout_type: "push",
  exercises: [...]
}

// Start ny økt
const newSession = {
  template_id: "template-uuid",
  name: "Template Navn - Dato",
  exercises: [...]
}
```

### **Read (Les)**
```typescript
// Hent templates for en bruker
const templates = await supabase
  .from('workout_templates')
  .select('*')
  .eq('user_id', userId)

// Hent økter for en bruker
const sessions = await supabase
  .from('workout_sessions')
  .select('*')
  .eq('user_id', userId)
```

### **Update (Oppdater)**
```typescript
// Oppdater template
await supabase
  .from('workout_templates')
  .update({ exercises: newExercises })
  .eq('id', templateId)

// Oppdater økt
await supabase
  .from('workout_sessions')
  .update({ exercises: updatedExercises })
  .eq('id', sessionId)
```

### **Delete (Slett)**
```typescript
// Slett template
await supabase
  .from('workout_templates')
  .delete()
  .eq('id', templateId)

// Slett økt
await supabase
  .from('workout_sessions')
  .delete()
  .eq('id', sessionId)
```

---

## 📝 **Viktige Notater**

### **Dataflyt**
1. **Øvelser** lastes fra `exercises.json` (statisk data)
2. **Treningsøvelse-typer** lastes fra `workout-types.json` (statisk data)
3. **Brukerdata** (templates, økter) lagres i Supabase

### **Sikkerhet**
- Alle UUID-er genereres automatisk av Supabase
- Timestamps oppdateres automatisk
- Foreign key constraints sikrer dataintegritet
- Alle brukerdata er isolert med `user_id` foreign key

### **JSONB-felter**
- `exercises` i templates og økter bruker JSONB for fleksibilitet
- Dette tillater komplekse datastrukturer uten å endre databaseskjemaet

### **Ingen Exercises-tabell**
- **Viktig:** Det finnes ingen `exercises` tabell i Supabase
- Alle øvelser kommer fra `exercises.json`
- Dette gjør appen enklere å vedlikeholde og oppdatere
