# 🗄️ Supabase Setup Guide for Treningsloggen

## 📋 **Steg-for-steg oppsett**

### **1. Opprett Supabase Prosjekt**

1. Gå til [supabase.com](https://supabase.com) og logg inn
2. Klikk "New Project"
3. Velg organisasjon og gi prosjektet et navn (f.eks. "treningsloggen")
4. Velg en database passord
5. Velg region (nærmest deg)
6. Klikk "Create new project"

### **2. Få API Nøkler**

1. Gå til **Settings** → **API** i Supabase dashboard
2. Kopier **Project URL** og **anon public** key
3. Opprett en `.env.local` fil i prosjektroten:

```env
VITE_SUPABASE_URL=din_project_url_her
VITE_SUPABASE_ANON_KEY=din_anon_key_her
```

### **3. Opprett Database Schema**

Gå til **SQL Editor** i Supabase dashboard og kjør følgende SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Workout Types (statisk data)
CREATE TABLE workout_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Exercises (statisk data)
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  workout_types TEXT[] NOT NULL,
  muscle_groups TEXT[] NOT NULL,
  equipment TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users (for fremtidig autentisering)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- 4. Workout Templates
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workout_type TEXT REFERENCES workout_types(id),
  exercises JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Workout Sessions
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  workout_type TEXT REFERENCES workout_types(id),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER DEFAULT 0,
  total_volume INTEGER DEFAULT 0,
  exercises JSONB NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Insert default workout types
INSERT INTO workout_types (id, name, description, color) VALUES
  ('push', 'Push', 'Bryst, skuldre, triceps', '#f97316'),
  ('pull', 'Pull', 'Rygg, biceps', '#3b82f6'),
  ('legs', 'Legs', 'Ben, glutes', '#10b981'),
  ('upper', 'Upper', 'Øvre kropp', '#8b5cf6'),
  ('lower', 'Lower', 'Nedre kropp', '#f59e0b'),
  ('full-body', 'Full Body', 'Hele kroppen', '#ef4444');

-- 7. Insert default exercises
INSERT INTO exercises (id, name, category, workout_types, muscle_groups, equipment, description) VALUES
  ('bench-press', 'Benkpress', 'push', ARRAY['push', 'upper', 'full-body'], ARRAY['bryst', 'triceps', 'skuldre'], 'barbell', 'Klassisk brystøvelse som også aktiverer triceps og foran skuldre'),
  ('overhead-press', 'Militærpress', 'push', ARRAY['push', 'upper', 'full-body'], ARRAY['skuldre', 'triceps'], 'barbell', 'Stående press som fokuserer på skuldre og triceps'),
  ('squat', 'Squat', 'legs', ARRAY['legs', 'lower', 'full-body'], ARRAY['quadriceps', 'glutes', 'hamstrings'], 'barbell', 'Konge av benøvelser som treffer hele bena'),
  ('deadlift', 'Deadlift', 'pull', ARRAY['pull', 'lower', 'full-body'], ARRAY['rygg', 'glutes', 'hamstrings'], 'barbell', 'Konge av alle øvelser som treffer hele bakkroppen'),
  ('pull-ups', 'Pull-ups', 'pull', ARRAY['pull', 'upper', 'full-body'], ARRAY['rygg', 'biceps'], 'bodyweight', 'Kroppsvektøvelse som treffer rygg og biceps'),
  ('dips', 'Dips', 'push', ARRAY['push', 'upper', 'full-body'], ARRAY['bryst', 'triceps'], 'bodyweight', 'Kroppsvektøvelse som treffer bryst og triceps');

-- 8. Create indexes for better performance
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(date);
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_workout_sessions_template_id ON workout_sessions(template_id);
```

### **4. Installer Dependencies**

```bash
npm install
```

### **5. Test Supabase Tilkobling**

1. Start utviklingsserveren: `npm run dev`
2. Åpne browser console
3. Du skal se grønne Supabase loggmeldinger når data lastes

### **6. Migrer fra JSON til Supabase**

For å bytte fra JSON til Supabase, endre import i komponenter fra:

```typescript
import { useWorkoutData } from '@/composables/useWorkoutData'
```

Til:

```typescript
import { useSupabaseData } from '@/composables/useSupabaseData'
```

Og endre `workoutData` til `supabaseData`.

### **7. Row Level Security (RLS)**

For å aktivere sikkerhet, kjør følgende SQL:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (eksempel - tilpass til dine behov)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = supabase_id);

CREATE POLICY "Users can view own templates" ON workout_templates
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own sessions" ON workout_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

### **8. Autentisering (Fremtidig)**

For å legge til brukerautentisering:

1. Gå til **Authentication** → **Settings** i Supabase
2. Konfigurer email/password auth
3. Oppdater `useSupabaseData.ts` til å bruke `auth.uid()` i stedet for `'default-user'`

### **9. Backup og Restore**

- **Backup**: Supabase tar automatisk backup hver dag
- **Manual backup**: Gå til **Settings** → **Database** → **Backups**
- **Restore**: Kontakt Supabase support for restore

### **10. Monitoring**

- **Logs**: Gå til **Logs** i Supabase dashboard
- **Metrics**: Se database ytelse under **Database** → **Usage**
- **Real-time**: Aktiver real-time subscriptions for live updates

## 🔧 **Feilsøking**

### **Vanlige Problemer:**

1. **"Missing Supabase environment variables"**
   - Sjekk at `.env.local` eksisterer og har riktige verdier
   - Restart utviklingsserveren

2. **"Permission denied"**
   - Sjekk RLS policies
   - Verifiser at API nøklene er riktige

3. **"Connection timeout"**
   - Sjekk at Supabase prosjektet er aktivt
   - Verifiser region og URL

4. **"Data not loading"**
   - Sjekk browser console for feilmeldinger
   - Verifiser at tabellene er opprettet
   - Sjekk at data er insertet

## 📚 **Neste Steg**

1. **Implementer autentisering**
2. **Legg til real-time updates**
3. **Implementer offline support**
4. **Legg til data eksport/import**
5. **Implementer backup strategi**

---

**🎉 Gratulerer! Du har nå en full Supabase-integration for Treningsloggen!** 