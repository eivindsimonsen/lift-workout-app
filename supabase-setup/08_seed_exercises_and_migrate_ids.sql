-- 08_seed_exercises_and_migrate_ids.sql
-- Purpose:
--   1. Insert all default exercises (user_id = NULL = global) into exercises + exercise_variants
--   2. Build a mapping from old text slug IDs to new integer IDs
--   3. Rewrite exerciseId inside workout_sessions.exercises JSONB
--   4. Rewrite exerciseId inside workout_templates.exercises JSONB
--
-- Run AFTER 07_exercises_tables.sql on fresh/empty tables.
-- Pattern per exercise:
--   WITH e AS (INSERT exercise RETURNING id),
--        v(old_slug, vname, equip) AS (VALUES ...),
--        ins AS (INSERT variants via CROSS JOIN RETURNING id, name)
--   INSERT INTO variant_id_mapping SELECT v.old_slug, ins.id FROM ins JOIN v ON vname = ins.name

BEGIN;

CREATE TEMP TABLE IF NOT EXISTS variant_id_mapping (
  old_slug TEXT PRIMARY KEY,
  new_id   INTEGER NOT NULL
);

-- ============================================================
-- SEED: Bryst (Chest)
-- ============================================================

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Bench Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('barbell-bench-press'::TEXT,              'Barbell Bench Press'::TEXT,               'barbell'::TEXT),
  ('incline-barbell-bench-press',            'Incline Barbell Bench Press',              'barbell'),
  ('decline-barbell-bench-press',            'Decline Barbell Bench Press',              'barbell'),
  ('dumbbell-bench-press',                   'Dumbbell Bench Press',                     'dumbbell'),
  ('incline-dumbbell-press',                 'Incline Dumbbell Bench Press',             'dumbbell'),
  ('decline-dumbbell-press',                 'Decline Dumbbell Bench Press',             'dumbbell'),
  ('wide-grip-bench-press',                  'Wide Grip Barbell Bench Press',            'barbell'),
  ('close-grip-bench-press',                 'Close Grip Barbell Bench Press',           'barbell'),
  ('reverse-grip-bench-press',               'Reverse Grip Barbell Bench Press',         'barbell'),
  ('neutral-grip-dumbbell-bench-press',      'Neutral Grip Dumbbell Bench Press',        'dumbbell'),
  ('single-arm-dumbbell-bench-press',        'Single Arm Dumbbell Bench Press',          'dumbbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Smith Machine Bench Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('smith-machine-bench-press'::TEXT,     'Smith Machine Bench Press'::TEXT,                  'smith-machine'::TEXT),
  ('smith-machine-incline-press',         'Smith Machine Incline Barbell Bench Press',         'smith-machine'),
  ('smith-machine-decline-press',         'Smith Machine Decline Barbell Bench Press',         'smith-machine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Guillotine Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('guillotine-press'::TEXT, 'Guillotine Press'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Floor Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('floor-press'::TEXT, 'Floor Press'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Spoto Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('spoto-press'::TEXT, 'Spoto Press'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Banded Bench Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('banded-bench-press'::TEXT, 'Banded Bench Press'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Plate Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('plate-press'::TEXT, 'Plate Press'::TEXT, 'plate'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Isometric Bench Hold', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('isometric-bench-hold'::TEXT, 'Isometric Bench Press Hold'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Dumbbell Flyes', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('dumbbell-flyes'::TEXT,         'Dumbbell Flyes'::TEXT,          'dumbbell'::TEXT),
  ('incline-dumbbell-flyes',       'Incline Dumbbell Flyes',        'dumbbell'),
  ('decline-dumbbell-flyes',       'Decline Dumbbell Flyes',        'dumbbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Cable Flyes', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('cable-flyes'::TEXT,            'Cable Flyes'::TEXT,             'cable'::TEXT),
  ('incline-cable-flyes',          'Incline Cable Flyes',           'cable'),
  ('cable-crossover',              'Cable Crossover',               'cable'),
  ('Decline-cable-flyes',          'Decline Cable Flyes',           'cable'),
  ('low-to-high-cable-flyes',      'Low-to-High Cable Flyes',       'cable'),
  ('high-to-low-cable-flyes',      'High-to-Low Cable Flyes',       'cable')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Pec Deck Machine', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('pec-deck'::TEXT, 'Pec Deck Machine'::TEXT, 'machine'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Dumbbell Pullovers', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('dumbbell-pullovers'::TEXT, 'Dumbbell Pullovers'::TEXT, 'dumbbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Push-ups', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('push-ups'::TEXT,               'Push-ups'::TEXT,                'bodyweight'::TEXT),
  ('decline-push-ups',             'Decline Push-ups',              'bodyweight'),
  ('incline-push-ups',             'Incline Push-ups',              'bodyweight'),
  ('diamond-push-ups',             'Diamond Push-ups',              'bodyweight'),
  ('archer-push-up',               'Archer Push-up',                'bodyweight'),
  ('explosive-push-up',            'Explosive Push-up',             'bodyweight'),
  ('resistance-band-push-ups',     'Resistance Band Push-ups',      'resistance-band'),
  ('weighted-push-ups',            'Weighted Push-ups',             'bodyweight'),
  ('deficit-push-ups',             'Deficit Push-ups',              'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Dips', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('dips-chest'::TEXT,    'Dips (Chest)'::TEXT,   'parallel-bars'::TEXT),
  ('weighted-dips',       'Weighted Dips',         'parallel-bars'),
  ('assisted-dips',       'Assisted Dips',         'machine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Machine Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('cable-chest-press'::TEXT,           'Cable Chest Press'::TEXT,           'cable'::TEXT),
  ('machine-chest-press',               'Machine Chest Press',               'machine'),
  ('incline-machine-chest-press',       'Incline Machine Chest Press',       'machine'),
  ('decline-machine-chest-press',       'Decline Machine Chest Press',       'machine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Landmine Press', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('landmine-press'::TEXT,         'Landmine Press'::TEXT,          'landmine'::TEXT),
  ('kneeling-landmine-press',      'Kneeling Landmine Press',       'landmine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Other Chest Exercises', 'Bryst', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('medicine-ball-chest-pass'::TEXT, 'Medicine Ball Chest Pass'::TEXT,   'medicine-ball'::TEXT),
  ('single-arm-cable-press',         'Single Arm Cable Chest Press',     'cable'),
  ('squeeze-press',                  'Dumbbell Squeeze Press',           'dumbbell'),
  ('svend-press',                    'Svend Press',                      'plate')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

-- ============================================================
-- SEED: Skuldre (Shoulders)
-- ============================================================

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Shoulder Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('overhead-press'::TEXT,               'Military Press'::TEXT,                'barbell'::TEXT),
  ('dumbbell-shoulder-press',            'Dumbbell Shoulder Press',             'dumbbell'),
  ('barbell-shoulder-press',             'Barbell Shoulder Press',              'barbell'),
  ('seated-overhead-press',              'Seated Overhead Press',               'barbell'),
  ('seated-dumbbell-shoulder-press',     'Seated Dumbbell Shoulder Press',      'dumbbell'),
  ('kettlebell-press',                   'Kettlebell Press',                    'kettlebell'),
  ('behind-the-neck-press',              'Behind the Neck Press',               'barbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Arnold Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('arnold-press'::TEXT, 'Arnold Press'::TEXT, 'dumbbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Z-Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('z-press'::TEXT, 'Z-Press'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Bradford Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('bradford-press'::TEXT, 'Bradford Press'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Push Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('push-press'::TEXT, 'Push Press'::TEXT, 'barbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Landmine Press (Shoulders)', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('landmine-press-shoulders'::TEXT,  'Landmine Press (Shoulders)'::TEXT,  'landmine'::TEXT),
  ('single-arm-landmine-press',       'Single Arm Landmine Press',          'landmine'),
  ('viking-press',                    'Viking Press',                       'landmine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Single Arm Dumbbell Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('single-arm-dumbbell-press'::TEXT, 'Single Arm Dumbbell Press'::TEXT, 'dumbbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Scaption Raise', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('scaption'::TEXT, 'Scaption Raise'::TEXT, 'dumbbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Cuban Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('cuban-press'::TEXT, 'Cuban Press'::TEXT, 'dumbbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Overhead Cable Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('overhead-cable-press'::TEXT, 'Overhead Cable Press'::TEXT, 'cable'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Machine Shoulder Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('machine-shoulder-press'::TEXT, 'Machine Shoulder Press'::TEXT, 'machine'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Smith Machine Shoulder Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('smith-machine-shoulder-press'::TEXT, 'Smith Machine Shoulder Press'::TEXT, 'smith-machine'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Neutral Grip Dumbbell Press', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('neutral-grip-dumbbell-press'::TEXT, 'Neutral Grip Dumbbell Press'::TEXT, 'dumbbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Shoulder Raises', 'Skuldre', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('lateral-raises'::TEXT,              'Lateral Raises'::TEXT,              'dumbbell'::TEXT),
  ('front-raises',                      'Front Raises',                      'dumbbell'),
  ('cable-lateral-raises',              'Cable Lateral Raises',              'cable'),
  ('cable-front-raises',                'Cable Front Raises',                'cable'),
  ('plate-front-raises',                'Plate Front Raises',                'plate'),
  ('bent-over-lateral-raises',          'Bent Over Lateral Raises',          'dumbbell'),
  ('banded-lateral-raises',             'Banded Lateral Raises',             'resistance-band'),
  ('banded-front-raises',               'Banded Front Raises',               'resistance-band'),
  ('machine-lateral-raises',            'Machine Lateral Raises',            'machine'),
  ('lu-raises',                         'Lu Raises',                         'dumbbell'),
  ('egyptian-lateral-raises',           'Egyptian Lateral Raises',           'cable'),
  ('leaning-cable-lateral-raises',      'Leaning Cable Lateral Raises',      'cable'),
  ('cable-y-raises',                    'Cable Y-Raises',                    'cable'),
  ('dumbbell-around-the-world',         'Dumbbell Around the World',         'dumbbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Rear Deltoid', 'Skuldre', ARRAY['pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('rear-delt-flyes'::TEXT,        'Reverse Flyes (Rear Deltoid)'::TEXT, 'dumbbell'::TEXT),
  ('face-pulls',                   'Face Pulls',                         'cable'),
  ('reverse-pec-deck',             'Reverse Pec Deck',                   'machine'),
  ('cable-rear-delt-flyes',        'Cable Rear Delt Flyes',              'cable'),
  ('prone-rear-delt-raises',       'Prone Rear Delt Raises',             'dumbbell'),
  ('reverse-cable-crossover',      'Reverse Cable Crossover',            'cable'),
  ('band-pull-aparts',             'Band Pull-aparts',                   'resistance-band')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Other Shoulder Exercises', 'Skuldre', ARRAY['push','pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('upright-rows'::TEXT,          'Upright Rows'::TEXT,         'barbell'::TEXT),
  ('shrugs',                      'Shoulder Shrugs',             'barbell'),
  ('pike-push-ups',               'Pike Push-ups',               'bodyweight'),
  ('handstand-push-ups',          'Handstand Push-ups',          'bodyweight'),
  ('overhead-plate-hold',         'Overhead Plate Hold',         'plate'),
  ('farmers-carry',               'Farmer''s Carry',             'dumbbell'),
  ('overhead-carry',              'Overhead Carry',              'barbell'),
  ('waiter-carry',                'Waiter Carry',                'barbell'),
  ('prone-y-raises',              'Prone Y-Raises',              'bodyweight'),
  ('prone-t-raises',              'Prone T-Raises',              'bodyweight'),
  ('prone-w-raises',              'Prone W-Raises',              'bodyweight'),
  ('dumbbell-shrugs',             'Dumbbell Shrugs',             'dumbbell'),
  ('smith-machine-shrugs',        'Smith Machine Shrugs',        'smith-machine'),
  ('dumbbell-upright-rows',       'Dumbbell Upright Rows',       'dumbbell'),
  ('cable-upright-rows',          'Cable Upright Rows',          'cable')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

-- ============================================================
-- SEED: Rygg (Back)
-- ============================================================

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Pull-ups', 'Rygg', ARRAY['pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('pull-ups'::TEXT,             'Pull-ups'::TEXT,             'bodyweight'::TEXT),
  ('chin-ups',                   'Chin-ups',                   'bodyweight'),
  ('wide-grip-pull-ups',         'Wide Grip Pull-ups',         'bodyweight'),
  ('close-grip-pull-ups',        'Close Grip Pull-ups',        'bodyweight'),
  ('assisted-pull-ups',          'Assisted Pull-ups',          'assisted'),
  ('negative-pull-ups',          'Negative Pull-ups',          'bodyweight'),
  ('assisted-chin-ups',          'Assisted Chin-ups',          'assisted'),
  ('scapular-pull-ups',          'Scapular Pull-ups',          'bodyweight'),
  ('neutral-grip-pull-ups',      'Neutral Grip Pull-ups',      'bodyweight'),
  ('weighted-pull-ups',          'Weighted Pull-ups',          'bodyweight'),
  ('weighted-chin-ups',          'Weighted Chin-ups',          'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Lat Pulldown', 'Rygg', ARRAY['pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('lat-pulldown'::TEXT,                  'Lat Pulldown'::TEXT,                  'cable'::TEXT),
  ('wide-grip-lat-pulldown',              'Wide Grip Lat Pulldown',              'cable'),
  ('close-grip-lat-pulldown',             'Close Grip Lat Pulldown',             'cable'),
  ('cable-lat-pulldowns',                 'Cable Lat Pulldowns',                 'cable'),
  ('machine-lat-pulldowns',               'Machine Lat Pulldowns',               'machine'),
  ('cable-crossbody-lat-pulldowns',       'Cable Crossbody Lat Pulldowns',       'cable'),
  ('single-arm-lat-pulldown',             'Single Arm Lat Pulldown',             'cable'),
  ('reverse-grip-lat-pulldown',           'Reverse Grip Lat Pulldown',           'cable'),
  ('neutral-grip-lat-pulldown',           'Neutral Grip Lat Pulldown',           'cable')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Rows', 'Rygg', ARRAY['pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('barbell-rows'::TEXT,          'Barbell Rows'::TEXT,             'barbell'::TEXT),
  ('t-bar-rows',                  'T-Bar Rows',                     't-bar'),
  ('dumbbell-rows',               'Single-Arm Dumbbell Rows',       'dumbbell'),
  ('one-arm-dumbbell-rows',       'One-Arm Dumbbell Rows',          'dumbbell'),
  ('seated-cable-rows',           'Seated Cable Rows',              'cable'),
  ('pendlay-rows',                'Pendlay Rows',                   'barbell'),
  ('yates-rows',                  'Yates Rows',                     'barbell'),
  ('meadow-rows',                 'Meadow Rows',                    'barbell'),
  ('landmine-rows',               'Landmine Rows',                  'landmine'),
  ('resistance-band-rows',        'Resistance Band Rows',           'resistance-band'),
  ('machine-rows',                'Machine Rows',                   'machine'),
  ('Single Arm Cable Rows',       'Single Arm Cable Rows',          'cable'),
  ('Single Arm Machine Rows',     'Single Arm Machine Rows',        'machine'),
  ('smith-machine-rows',          'Smith Machine Rows',             'smith-machine'),
  ('chest-supported-rows',        'Chest Supported Rows',           'barbell'),
  ('scapular-rows',               'Scapular Rows',                  'barbell'),
  ('seal-rows',                   'Seal Rows',                      'barbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Deadlift', 'Rygg', ARRAY['pull','lower','full-body'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('deadlift'::TEXT,              'Deadlift'::TEXT,              'barbell'::TEXT),
  ('romanian-deadlift',           'Romanian Deadlift',           'barbell'),
  ('stiff-legged-deadlift',       'Stiff-Legged Deadlift',       'barbell'),
  ('sumo-deadlift',               'Sumo Deadlift',               'barbell'),
  ('trap-bar-deadlift',           'Trap Bar Deadlift',           'trap-bar'),
  ('rack-pulls',                  'Rack Pulls',                  'barbell'),
  ('deficit-deadlift',            'Deficit Deadlift',            'barbell'),
  ('snatch-grip-deadlift',        'Snatch Grip Deadlift',        'barbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Other Back Exercises', 'Rygg', ARRAY['pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('cable-pullovers'::TEXT,       'Cable Pullovers'::TEXT,       'cable'::TEXT),
  ('reverse-flyes',               'Reverse Flyes',               'dumbbell'),
  ('straight-arm-pulldowns',      'Straight Arm Pulldowns',      'cable'),
  ('inverted-rows',               'Inverted Rows',               'bodyweight'),
  ('good-mornings',               'Good Mornings',               'barbell'),
  ('hyperextensions',             'Hyperextensions',             'machine'),
  ('reverse-hyperextensions',     'Reverse Hyperextensions',     'machine'),
  ('bird-dogs',                   'Bird Dogs',                   'bodyweight'),
  ('superman-holds',              'Superman Holds',              'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

-- ============================================================
-- SEED: Biceps
-- ============================================================

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Bicep Curls', 'Biceps', ARRAY['pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('bicep-curls'::TEXT,                  'Barbell Bicep Curls'::TEXT,          'barbell'::TEXT),
  ('dumbbell-curls',                     'Dumbbell Bicep Curls',               'dumbbell'),
  ('standing-dumbbell-curls',            'Standing Dumbbell Curls',            'dumbbell'),
  ('seated-dumbbell-curls',              'Seated Dumbbell Curls',              'dumbbell'),
  ('hammer-curls',                       'Hammer Curls',                       'dumbbell'),
  ('preacher-curls',                     'Preacher Curls',                     'ez-bar'),
  ('concentration-curls',                'Concentration Curls',                'dumbbell'),
  ('incline-dumbbell-curls',             'Incline Dumbbell Curls',             'dumbbell'),
  ('spider-curls',                       'Spider Curls',                       'barbell'),
  ('zottman-curls',                      'Zottman Curls',                      'dumbbell'),
  ('preacher-hammer-curls',              'Preacher Hammer Curls',              'dumbbell'),
  ('cable-bicep-curls',                  'Cable Bicep Curls',                  'cable'),
  ('resistance-band-curls',              'Resistance Band Curls',              'resistance-band'),
  ('21s',                                '21s (Bicep Curls)',                   'barbell'),
  ('cross-body-hammer-curls',            'Cross Body Hammer Curls',            'dumbbell'),
  ('drag-curls',                         'Drag Curls',                         'barbell'),
  ('ez-bar-curls',                       'EZ Bar Curls',                       'ez-bar'),
  ('incline-hammer-curls',               'Incline Hammer Curls',               'dumbbell'),
  ('cable-hammer-curls',                 'Cable Hammer Curls',                 'cable'),
  ('bayesian-curls',                     'Bayesian Curls',                     'barbell'),
  ('seated-bicep-curls-machine',         'Seated Bicep Curls Machine',         'machine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Forearm Exercises', 'Biceps', ARRAY['pull','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('wrist-curls'::TEXT,                   'Wrist Curls'::TEXT,                  'barbell'::TEXT),
  ('reverse-wrist-curls',                 'Reverse Wrist Curls',                'barbell'),
  ('reverse-ez-bar-curls',                'Reverse EZ Bar Curls',               'ez-bar'),
  ('reverse-barbell-preacher-curls',      'Reverse Barbell Preacher Curls',     'ez-bar'),
  ('reverse-dumbbell-curls',              'Reverse Dumbbell Curls',             'dumbbell'),
  ('reverse-barbell-curl',                'Reverse Barbell Curl',               'barbell'),
  ('reverse-cable-curl',                  'Reverse Cable Curl',                 'cable'),
  ('reverse-curls',                       'Reverse Curls',                      'barbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Other Arm Exercises', 'Biceps', ARRAY['full-body'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('farmer-walks'::TEXT, 'Farmer Walks'::TEXT, 'dumbbell'::TEXT)
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

-- ============================================================
-- SEED: Triceps
-- ============================================================

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Tricep Exercises', 'Triceps', ARRAY['push','upper'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('tricep-dips'::TEXT,                       'Tricep Dips'::TEXT,                      'parallel-bars'::TEXT),
  ('tricep-pushdowns',                        'Cable Tricep Pushdowns',                 'cable'),
  ('skull-crushers',                          'Skull Crushers',                         'barbell'),
  ('overhead-tricep-extension',               'Overhead Tricep Extension',              'dumbbell'),
  ('rope-pushdowns',                          'Rope Pushdowns',                         'cable'),
  ('dumbbell-kickbacks',                      'Dumbbell Kickbacks',                     'dumbbell'),
  ('cable-tricep-extensions',                 'Cable Tricep Extensions',                'cable'),
  ('jm-press',                                'JM Press',                               'barbell'),
  ('resistance-band-tricep-extensions',       'Resistance Band Tricep Extensions',      'resistance-band'),
  ('dumbbell-tricep-extensions',              'Dumbbell Tricep Extensions',             'dumbbell'),
  ('tricep-dips-on-parallel-bars',            'Tricep Dips on Parallel Bars',           'parallel-bars'),
  ('bench-dips',                              'Bench Dips',                             'bench'),
  ('cable-overhead-tricep-extension',         'Cable Overhead Tricep Extension',        'cable'),
  ('single-arm-tricep-extension',             'Single Arm Tricep Extension',            'dumbbell'),
  ('tricep-kickbacks',                        'Tricep Kickbacks',                       'dumbbell'),
  ('seated-tricep-extension-machine',         'Seated Tricep Extension Machine',        'machine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

-- ============================================================
-- SEED: Ben (Legs)
-- ============================================================

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Squats', 'Ben', ARRAY['legs','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('squat'::TEXT,            'Squats'::TEXT,             'barbell'::TEXT),
  ('front-squat',            'Front Squats',             'barbell'),
  ('goblet-squat',           'Goblet Squats',            'dumbbell'),
  ('hack-squat',             'Hack Squat Machine',       'machine'),
  ('smith-machine-squat',    'Smith Machine Squat',      'smith-machine'),
  ('pistol-squats',          'Pistol Squats',            'bodyweight'),
  ('sumo-squat',             'Sumo Squats',              'barbell'),
  ('zercher-squat',          'Zercher Squats',           'barbell'),
  ('overhead-squat',         'Overhead Squats',          'barbell'),
  ('split-squats',           'Split Squats',             'barbell'),
  ('sissy-squat',            'Sissy Squat',              'bodyweight'),
  ('pendulum-squat',         'Pendulum Squat',           'machine'),
  ('belt-squat',             'Belt Squat',               'machine'),
  ('box-squat',              'Box Squat',                'barbell'),
  ('safety-bar-squat',       'Safety Bar Squat',         'barbell'),
  ('pin-squat',              'Pin Squat',                'barbell'),
  ('pause-squat',            'Pause Squat',              'barbell'),
  ('kang-squat',             'Kang Squat',               'barbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Lunges', 'Ben', ARRAY['legs','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('walking-lunges'::TEXT,        'Walking Lunges'::TEXT,          'bodyweight'::TEXT),
  ('bulgarian-split-squats',      'Bulgarian Split Squats',        'dumbbell'),
  ('curtsy-lunges',               'Curtsy Lunges',                 'bodyweight'),
  ('reverse-lunges',              'Reverse Lunges',                'bodyweight'),
  ('side-lunges',                 'Side Lunges',                   'bodyweight'),
  ('walking-lunges-barbell',      'Barbell Walking Lunges',        'barbell'),
  ('smith-machine-lunge',         'Smith Machine Lunge',           'smith-machine'),
  ('reverse-lunge-barbell',       'Barbell Reverse Lunges',        'barbell'),
  ('reverse-lunge-dumbbell',      'Dumbbell Reverse Lunges',       'dumbbell'),
  ('lateral-lunge',               'Lateral Lunges',                'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Machine Leg Exercises', 'Ben', ARRAY['legs','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('leg-press'::TEXT,             'Leg Press Machine'::TEXT,    'machine'::TEXT),
  ('leg-extensions',              'Leg Extensions',             'machine'),
  ('single-leg-curls',            'Single Leg Curls',           'machine'),
  ('seated-leg-curls',            'Seated Leg Curls',           'machine'),
  ('hip-adduction',               'Hip Adduction',              'machine'),
  ('hip-abduction',               'Hip Abduction',              'machine'),
  ('glute-kickback-machine',      'Glute Kickback Machine',     'machine'),
  ('lying-leg-curls',             'Lying Leg Curls',            'machine'),
  ('standing-leg-curls',          'Standing Leg Curls',         'machine'),
  ('tibialis-raises',             'Tibialis Raises',            'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Glute Exercises', 'Ben', ARRAY['legs','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('glute-bridges'::TEXT,         'Glute Bridges'::TEXT,         'bodyweight'::TEXT),
  ('hip-thrusts',                 'Hip Thrusts',                 'barbell'),
  ('donkey-kicks',                'Donkey Kicks',                'bodyweight'),
  ('frog-pumps',                  'Frog Pumps',                  'bodyweight'),
  ('kas-glute-bridge',            'Kas Glute Bridge',            'barbell'),
  ('b-stance-hip-thrust',         'B-Stance Hip Thrust',         'dumbbell'),
  ('banded-hip-abduction',        'Banded Hip Abduction',        'resistance-band')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Calf Exercises', 'Ben', ARRAY['legs','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('calf-raises'::TEXT,                   'Standing Calf Raises'::TEXT,          'bodyweight'::TEXT),
  ('seated-calf-raises',                  'Seated Calf Raises',                  'machine'),
  ('smith-machine-calf-raises',           'Smith Machine Calf Raises',           'smith-machine'),
  ('standing-single-leg-calf-raises',     'Standing Single Leg Calf Raises',     'bodyweight'),
  ('leg-press-calf-raises',               'Leg Press Calf Raises',               'machine'),
  ('donkey-calf-raises',                  'Donkey Calf Raises',                  'machine'),
  ('tibialis-raises-weighted',            'Weighted Tibialis Raises',            'dumbbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Plyometric Exercises', 'Ben', ARRAY['legs','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('box-jumps'::TEXT,    'Box Jumps'::TEXT,    'box'::TEXT),
  ('jump-squats',        'Jump Squats',        'bodyweight'),
  ('jump-lunges',        'Jump Lunges',        'bodyweight'),
  ('skater-jumps',       'Skater Jumps',       'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Other Leg Exercises', 'Ben', ARRAY['legs','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('step-ups'::TEXT,                    'Step-ups'::TEXT,                    'bodyweight'::TEXT),
  ('wall-sits',                         'Wall Sits',                         'bodyweight'),
  ('single-leg-romanian-deadlift',      'Single Leg Romanian Deadlift',      'dumbbell'),
  ('nordic-hamstring-curl',             'Nordic Hamstring Curl',             'bodyweight'),
  ('cable-pull-through',                'Cable Pull-through',                'cable'),
  ('sled-push',                         'Sled Push',                         'sled'),
  ('sled-drag',                         'Sled Drag',                         'sled'),
  ('farmers-walk-on-toes',              'Farmer''s Walk on Toes',            'dumbbell'),
  ('single-leg-leg-press',              'Single Leg Leg Press',              'machine'),
  ('reverse-nordic-curl',               'Reverse Nordic Curl',               'bodyweight'),
  ('copenhagen-plank',                  'Copenhagen Plank',                  'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

-- ============================================================
-- SEED: Kjerne (Core)
-- ============================================================

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Core Stability', 'Kjerne', ARRAY['full-body','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('planks'::TEXT,          'Planks'::TEXT,          'bodyweight'::TEXT),
  ('side-planks',           'Side Planks',           'bodyweight'),
  ('hollow-holds',          'Hollow Holds',          'bodyweight'),
  ('dead-bug',              'Dead Bug',              'bodyweight'),
  ('bird-dog',              'Bird Dog',              'bodyweight'),
  ('ab-wheel-rollout',      'Ab Wheel Rollout',      'bodyweight')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Core Crunches', 'Kjerne', ARRAY['full-body'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('crunches'::TEXT,         'Crunches'::TEXT,               'bodyweight'::TEXT),
  ('sit-ups',                'Sit-ups',                      'bodyweight'),
  ('bicycle-crunches',       'Bicycle Crunches',             'bodyweight'),
  ('russian-twists',         'Russian Twists',               'bodyweight'),
  ('cable-crunches',         'Kneeling Cable Crunches',      'cable'),
  ('decline-sit-ups',        'Decline Sit-ups',              'bench'),
  ('decline-crunches',       'Decline Crunches',             'bench'),
  ('weighted-sit-ups',       'Weighted Sit-ups',             'plate')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Core Leg Exercises', 'Kjerne', ARRAY['full-body','lower'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('leg-raises'::TEXT,              'Leg Raises'::TEXT,              'bodyweight'::TEXT),
  ('flutter-kicks',                 'Flutter Kicks',                 'bodyweight'),
  ('scissor-kicks',                 'Scissor Kicks',                 'bodyweight'),
  ('v-ups',                         'V-ups',                         'bodyweight'),
  ('hanging-leg-raises',            'Hanging Leg Raises',            'bodyweight'),
  ('decline-leg-raises',            'Decline Leg Raises',            'bench'),
  ('hanging-knee-raises',           'Hanging Knee Raises',           'bodyweight'),
  ('captains-chair-leg-raises',     'Captain''s Chair Leg Raises',   'machine')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Dynamic Core', 'Kjerne', ARRAY['full-body'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('mountain-climbers'::TEXT, 'Mountain Climbers'::TEXT, 'bodyweight'::TEXT),
  ('burpees',                 'Burpees',                 'bodyweight'),
  ('man-makers',              'Man Makers',              'dumbbell'),
  ('kettlebell-swings',       'Kettlebell Swings',       'kettlebell'),
  ('battle-ropes',            'Battle Ropes',            'rope')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

WITH e AS (
  INSERT INTO exercises (name, category, workout_types, user_id)
  VALUES ('Olympic Lifts', 'Kjerne', ARRAY['full-body'], NULL) RETURNING id
), v(old_slug, vname, equip) AS (VALUES
  ('turkish-get-ups'::TEXT, 'Turkish Get-ups'::TEXT, 'dumbbell'::TEXT),
  ('clean-and-press',       'Clean and Press',        'barbell'),
  ('snatch',                'Snatch',                  'barbell'),
  ('thrusters',             'Thrusters',               'barbell')
), ins AS (
  INSERT INTO exercise_variants (exercise_id, name, equipment, user_id)
  SELECT e.id, v.vname, v.equip, NULL FROM e CROSS JOIN v RETURNING id, name
)
INSERT INTO variant_id_mapping (old_slug, new_id)
SELECT v.old_slug, ins.id FROM ins JOIN v ON v.vname = ins.name;

-- ============================================================
-- MIGRATE JSONB: workout_sessions
-- Replace each exerciseId text slug with new integer id
-- ============================================================
UPDATE workout_sessions ws
SET exercises = COALESCE((
  SELECT jsonb_agg(
    CASE
      WHEN m.new_id IS NOT NULL
        THEN jsonb_set(ex, '{exerciseId}', to_jsonb(m.new_id))
      ELSE ex
    END
  )
  FROM jsonb_array_elements(ws.exercises) AS ex
  LEFT JOIN variant_id_mapping m ON m.old_slug = ex->>'exerciseId'
), '[]'::jsonb);

-- ============================================================
-- MIGRATE JSONB: workout_templates
-- ============================================================
UPDATE workout_templates wt
SET exercises = COALESCE((
  SELECT jsonb_agg(
    CASE
      WHEN m.new_id IS NOT NULL
        THEN jsonb_set(ex, '{exerciseId}', to_jsonb(m.new_id))
      ELSE ex
    END
  )
  FROM jsonb_array_elements(wt.exercises) AS ex
  LEFT JOIN variant_id_mapping m ON m.old_slug = ex->>'exerciseId'
), '[]'::jsonb);

-- ============================================================
-- VERIFY (run these after commit to confirm success)
-- ============================================================
-- SELECT COUNT(*) FROM exercises;          -- expect ~50
-- SELECT COUNT(*) FROM exercise_variants;  -- expect ~290
-- Check for any unmapped slugs still in sessions (should return 0 rows):
-- SELECT DISTINCT ex->>'exerciseId' AS remaining_slug
-- FROM workout_sessions, jsonb_array_elements(exercises) AS ex
-- WHERE (ex->>'exerciseId') !~ '^[0-9]+$';

COMMIT;
