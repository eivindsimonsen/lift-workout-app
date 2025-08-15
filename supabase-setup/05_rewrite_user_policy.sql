-- Oppdater workout_templates policyer
DROP POLICY IF EXISTS "Users can view own templates" ON workout_templates;
CREATE POLICY "Users can view own templates" ON workout_templates FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON workout_templates;
CREATE POLICY "Users can insert own templates" ON workout_templates FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON workout_templates;
CREATE POLICY "Users can update own templates" ON workout_templates FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON workout_templates;
CREATE POLICY "Users can delete own templates" ON workout_templates FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Oppdater workout_sessions policyer
DROP POLICY IF EXISTS "Users can view own sessions" ON workout_sessions;
CREATE POLICY "Users can view own sessions" ON workout_sessions FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON workout_sessions;
CREATE POLICY "Users can insert own sessions" ON workout_sessions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON workout_sessions;
CREATE POLICY "Users can update own sessions" ON workout_sessions FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON workout_sessions;
CREATE POLICY "Users can delete own sessions" ON workout_sessions FOR DELETE USING ((SELECT auth.uid()) = user_id);