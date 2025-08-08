# 🗄️ Optimized Supabase Setup for Free Tier

## 📊 **Free Tier Strategy**

### **Store in Supabase (User Data):**
- ✅ **`workout_sessions`** - User's workout history
- ✅ **`workout_templates`** - User's custom templates  
- ✅ **`users`** - User profiles (linked to auth.users)
- ✅ **Authentication** - User login/registration

### **Keep Locally (Static Data):**
- ❌ **`workout_types`** - Static categories
- ❌ **`exercises`** - Exercise database

## 🗄️ **Simplified Database Schema**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users (linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- 2. Workout Templates (user-specific)
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workout_type TEXT NOT NULL, -- Store as string, not foreign key
  exercises JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Workout Sessions (user-specific)
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  workout_type TEXT NOT NULL, -- Store as string, not foreign key
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER DEFAULT 0,
  total_volume INTEGER DEFAULT 0,
  exercises JSONB NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(date);
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_workout_sessions_template_id ON workout_sessions(template_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Templates policies
CREATE POLICY "Users can view own templates" ON workout_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON workout_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON workout_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON workout_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON workout_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON workout_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON workout_sessions
  FOR DELETE USING (auth.uid() = user_id);
```

**Note:** No `workout_types` or `exercises` tables needed - these are kept in JSON files!

## 🔐 **Authentication Setup**

### **1. Enable Email Authentication:**
1. Go to **Authentication** → **Settings** in Supabase dashboard
2. Enable **Email auth**
3. Configure email templates (optional)

### **2. Configure Email Settings:**
- **Site URL**: Your app URL (e.g., `http://localhost:5173`)
- **Redirect URLs**: Add your app URLs
- **Email templates**: Customize if needed

### **3. Environment Variables:**
Make sure your `.env.local` has:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

## 📁 **Keep Static Data in JSON Files**

### **`src/data/workout-types.json`** (Keep this file):
```json
{
  "workoutTypes": [
    {
      "id": "push",
      "name": "Push",
      "description": "Bryst, skuldre, triceps",
      "color": "#f97316"
    },
    {
      "id": "pull", 
      "name": "Pull",
      "description": "Rygg, biceps",
      "color": "#3b82f6"
    }
  ]
}
```

### **`src/data/exercises.json`** (Keep this file):
```json
{
  "exercises": [
    {
      "id": "bench-press",
      "name": "Benkpress",
      "category": "push",
      "workoutTypes": ["push", "upper", "full-body"],
      "muscleGroups": ["bryst", "triceps", "skuldre"],
      "equipment": "barbell",
      "description": "Klassisk brystøvelse"
    }
  ]
}
```

## 🔧 **Updated Composable Strategy**

Use the hybrid composable that combines both data sources:

```typescript
// In your components, use:
import { useHybridData } from '@/composables/useHybridData'

const workoutData = useHybridData()

// This gives you access to:
// - Static data from JSON files (exercises, workoutTypes)
// - User data from Supabase (templates, sessions)
// - Authentication (currentUser, isAuthenticated, signOut)
// - All actions for user data
```

**Migration from old composables:**
```typescript
// OLD:
import { useWorkoutData } from '@/composables/useWorkoutData'

// NEW:
import { useHybridData } from '@/composables/useHybridData'
```

## 💾 **Storage Optimization Tips**

### **1. Minimize JSONB Data:**
```sql
-- Instead of storing full exercise objects, store minimal data
{
  "exerciseId": "bench-press",
  "name": "Benkpress", 
  "sets": [...]
}
```

### **2. Use Efficient Indexes:**
```sql
-- Only index what you query frequently
CREATE INDEX idx_sessions_user_date ON workout_sessions(user_id, date DESC);
```

### **3. Archive Old Data:**
```sql
-- Consider archiving sessions older than 1 year
-- Move to separate archive table or delete
```

### **4. Compress Data:**
```sql
-- Use smaller data types where possible
-- Store dates as timestamps, not full ISO strings
```

## 📈 **When to Upgrade**

Upgrade to Pro ($25/month) when you hit:
- 500MB storage limit
- 2GB bandwidth limit
- Need more than 50K users
- Want real-time features

## 🎯 **Recommended Approach:**

1. **Start with hybrid approach** (JSON + Supabase)
2. **Store only user data** in Supabase
3. **Keep static data** in JSON files
4. **Enable authentication** for user isolation
5. **Monitor usage** in Supabase dashboard
6. **Upgrade when needed**

This approach gives you the best of both worlds:
- ✅ **Fast static data** from JSON
- ✅ **Persistent user data** in Supabase
- ✅ **User authentication** and isolation
- ✅ **Stays within free tier limits**
- ✅ **Easy to scale later** 