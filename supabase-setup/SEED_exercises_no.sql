-- Seed exercises for a specific user (Norwegian names)
-- 1) Bytt ut eposten under med din Supabase-bruker
-- 2) Kjør i Supabase SQL Editor
-- 3) Trygt å kjøre flere ganger (ON CONFLICT DO NOTHING)

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'REPLACE_WITH_YOUR_EMAIL@example.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Replace the email in this script with your actual user email.';
  END IF;

  INSERT INTO exercises (user_id, name, muscle_groups)
  VALUES
    -- Bryst
    (v_user_id, 'Benkpress', ARRAY['Bryst']::text[]),
    (v_user_id, 'Incline Benkpress', ARRAY['Bryst']::text[]),
    (v_user_id, 'Decline Benkpress', ARRAY['Bryst']::text[]),
    (v_user_id, 'Dumbbell Benkpress', ARRAY['Bryst']::text[]),
    (v_user_id, 'Incline Dumbbell Press', ARRAY['Bryst']::text[]),
    (v_user_id, 'Dumbbell Flyes', ARRAY['Bryst']::text[]),
    (v_user_id, 'Cable Flyes', ARRAY['Bryst']::text[]),
    (v_user_id, 'Push-ups', ARRAY['Bryst']::text[]),
    (v_user_id, 'Dips', ARRAY['Bryst']::text[]),
    (v_user_id, 'Machine Chest Press', ARRAY['Bryst']::text[]),

    -- Rygg
    (v_user_id, 'Markløft', ARRAY['Rygg']::text[]),
    (v_user_id, 'Pull-ups', ARRAY['Rygg']::text[]),
    (v_user_id, 'Chin-ups', ARRAY['Rygg']::text[]),
    (v_user_id, 'Stangroing', ARRAY['Rygg']::text[]),
    (v_user_id, 'Hantelroing', ARRAY['Rygg']::text[]),
    (v_user_id, 'Kableroing', ARRAY['Rygg']::text[]),
    (v_user_id, 'Nedtrekk', ARRAY['Rygg']::text[]),
    (v_user_id, 'T-Bar Roing', ARRAY['Rygg']::text[]),
    (v_user_id, 'Face Pulls', ARRAY['Rygg']::text[]),
    (v_user_id, 'Shrugs', ARRAY['Rygg']::text[]),

    -- Ben
    (v_user_id, 'Knebøy', ARRAY['Ben']::text[]),
    (v_user_id, 'Frontbøy', ARRAY['Ben']::text[]),
    (v_user_id, 'Beinpress', ARRAY['Ben']::text[]),
    (v_user_id, 'Rumensk Markløft', ARRAY['Ben']::text[]),
    (v_user_id, 'Beinhev i maskin', ARRAY['Ben']::text[]),
    (v_user_id, 'Lårcurl', ARRAY['Ben']::text[]),
    (v_user_id, 'Tåhev', ARRAY['Ben']::text[]),
    (v_user_id, 'Utfall', ARRAY['Ben']::text[]),
    (v_user_id, 'Bulgarian Split Squats', ARRAY['Ben']::text[]),
    (v_user_id, 'Hip Thrusts', ARRAY['Ben']::text[]),
    (v_user_id, 'Good Mornings', ARRAY['Ben']::text[]),

    -- Armer
    (v_user_id, 'Stangcurl', ARRAY['Armer']::text[]),
    (v_user_id, 'Hantelcurl', ARRAY['Armer']::text[]),
    (v_user_id, 'Hammer Curls', ARRAY['Armer']::text[]),
    (v_user_id, 'Preacher Curls', ARRAY['Armer']::text[]),
    (v_user_id, 'Concentration Curls', ARRAY['Armer']::text[]),
    (v_user_id, 'Dips for triceps', ARRAY['Armer']::text[]),
    (v_user_id, 'Triceps Pushdowns', ARRAY['Armer']::text[]),
    (v_user_id, 'Skull Crushers', ARRAY['Armer']::text[]),
    (v_user_id, 'Overhead Triceps Extensions', ARRAY['Armer']::text[]),
    (v_user_id, 'Smal benkpress', ARRAY['Armer']::text[]),

    -- Skuldre
    (v_user_id, 'Militærpress', ARRAY['Skuldre']::text[]),
    (v_user_id, 'Hantelpress over hode', ARRAY['Skuldre']::text[]),
    (v_user_id, 'Sidehev', ARRAY['Skuldre']::text[]),
    (v_user_id, 'Fronthev', ARRAY['Skuldre']::text[]),
    (v_user_id, 'Bakside skulder flyes', ARRAY['Skuldre']::text[]),
    (v_user_id, 'Upright Rows', ARRAY['Skuldre']::text[]),
    (v_user_id, 'Arnold Press', ARRAY['Skuldre']::text[]),
    (v_user_id, 'Cable Lateral Raises', ARRAY['Skuldre']::text[]),

    -- Flere muskelgrupper
    (v_user_id, 'Overhead Press', ARRAY['Skuldre','Armer']::text[]),
    (v_user_id, 'Clean and Press', ARRAY['Skuldre','Ben','Rygg']::text[]),
    (v_user_id, 'Snatch', ARRAY['Skuldre','Ben','Rygg']::text[]),
    (v_user_id, 'Kettlebell Swings', ARRAY['Ben','Rygg']::text[]),
    (v_user_id, 'Burpees', ARRAY['Bryst','Ben']::text[]),
    (v_user_id, 'Mountain Climbers', ARRAY['Bryst','Ben']::text[]),
    (v_user_id, 'Planke', ARRAY['Bryst','Rygg']::text[]),
    (v_user_id, 'Russian Twists', ARRAY['Bryst','Rygg']::text[])
  ON CONFLICT (user_id, name) DO NOTHING;
END $$ LANGUAGE plpgsql;
