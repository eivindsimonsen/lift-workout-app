import { ref } from "vue";
import { useSupabase } from "./useSupabase";
import { useErrorHandler } from "./useErrorHandler";
import type { ExerciseData, ExerciseVariant } from "@/types/workout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateExercisePayload {
  name: string;
  category: string;
  workoutTypes: string[];
}

export interface UpdateExercisePayload {
  name?: string;
  category?: string;
  workoutTypes?: string[];
}

export interface CreateVariantPayload {
  name: string;
  equipment?: string;
}

export interface UpdateVariantPayload {
  name?: string;
  equipment?: string;
  /** Move variant to a different parent exercise group. */
  exerciseId?: number;
}

// ---------------------------------------------------------------------------
// Singleton state — shared across all component instances
// ---------------------------------------------------------------------------

const _exercises = ref<ExerciseData[]>([]);
const _isLoading = ref(false);
let _loaded = false;

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export const useExercises = () => {
  const { supabase } = useSupabase();
  const { showError } = useErrorHandler();

  // --------------------------------------------------------------------------
  // Load
  // --------------------------------------------------------------------------

  /** Fetches all exercises (global + current user's own) with their variants. */
  const loadExercises = async (force = false) => {
    if (_loaded && !force) return;
    _isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select(`
          id,
          user_id,
          name,
          category,
          workout_types,
          exercise_variants (
            id,
            exercise_id,
            user_id,
            name,
            equipment
          )
        `)
        .order("name");

      if (error) throw error;

      _exercises.value = (data ?? []).map((row: any) => ({
        id: row.id as number,
        userId: row.user_id as string | null,
        name: row.name as string,
        category: row.category as string,
        workoutTypes: (row.workout_types ?? []) as string[],
        variants: ((row.exercise_variants ?? []) as any[])
          .map((v) => ({
            id: v.id as number,
            exerciseId: v.exercise_id as number,
            userId: v.user_id as string | null,
            name: v.name as string,
            equipment: v.equipment as string | undefined,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "no")),
      }));

      _loaded = true;
    } catch (err: any) {
      showError("Kunne ikke laste øvelser.");
      console.error(err);
    } finally {
      _isLoading.value = false;
    }
  };

  // --------------------------------------------------------------------------
  // Exercise CRUD
  // --------------------------------------------------------------------------

  /** Create a new user-owned exercise. Returns the created exercise or null. */
  const createExercise = async (
    userId: string,
    payload: CreateExercisePayload
  ): Promise<ExerciseData | null> => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .insert({
          user_id: userId,
          name: payload.name.trim(),
          category: payload.category,
          workout_types: payload.workoutTypes,
        })
        .select(`id, user_id, name, category, workout_types`)
        .single();

      if (error) throw error;

      const newExercise: ExerciseData = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        category: data.category,
        workoutTypes: data.workout_types ?? [],
        variants: [],
      };

      _exercises.value = [..._exercises.value, newExercise].sort((a, b) =>
        a.name.localeCompare(b.name, "no")
      );

      return newExercise;
    } catch (err: any) {
      showError("Kunne ikke opprette øvelse.");
      console.error(err);
      return null;
    }
  };

  /** Update a user-owned exercise. */
  const updateExercise = async (
    id: number,
    payload: UpdateExercisePayload
  ): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (payload.name !== undefined) updates.name = payload.name.trim();
      if (payload.category !== undefined) updates.category = payload.category;
      if (payload.workoutTypes !== undefined)
        updates.workout_types = payload.workoutTypes;

      const { error } = await supabase
        .from("exercises")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      const idx = _exercises.value.findIndex((e) => e.id === id);
      if (idx !== -1) {
        _exercises.value[idx] = { ..._exercises.value[idx], ...payload };
        _exercises.value = [..._exercises.value];
      }

      return true;
    } catch (err: any) {
      showError("Kunne ikke oppdatere øvelse.");
      console.error(err);
      return false;
    }
  };

  /** Delete an exercise (cascades to its variants). */
  const deleteExercise = async (id: number): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .delete()
        .eq("id", id)
        .select("id"); // returns deleted rows; empty array means RLS blocked it

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Ingen rader ble slettet. Kjør supabase-setup/10_fix_all_permissions.sql i Supabase SQL-editoren."
        );
      }

      _exercises.value = _exercises.value.filter((e) => e.id !== id);
      return true;
    } catch (err: any) {
      showError("Kunne ikke slette øvelse. Sjekk rettighetene i Supabase.");
      console.error(err);
      return false;
    }
  };

  // --------------------------------------------------------------------------
  // Variant CRUD
  // --------------------------------------------------------------------------

  /** Add a variant to an exercise. */
  const createVariant = async (
    exerciseId: number,
    userId: string | null,
    payload: CreateVariantPayload
  ): Promise<ExerciseVariant | null> => {
    try {
      const { data, error } = await supabase
        .from("exercise_variants")
        .insert({
          exercise_id: exerciseId,
          user_id: userId,
          name: payload.name.trim(),
          equipment: payload.equipment?.trim() || null,
        })
        .select(`id, exercise_id, user_id, name, equipment`)
        .single();

      if (error) throw error;

      const newVariant: ExerciseVariant = {
        id: data.id,
        exerciseId: data.exercise_id,
        userId: data.user_id,
        name: data.name,
        equipment: data.equipment ?? undefined,
      };

      const idx = _exercises.value.findIndex((e) => e.id === exerciseId);
      if (idx !== -1) {
        const variants = [
          ...(_exercises.value[idx].variants ?? []),
          newVariant,
        ].sort((a, b) => a.name.localeCompare(b.name, "no"));
        _exercises.value[idx] = { ..._exercises.value[idx], variants };
        _exercises.value = [..._exercises.value];
      }

      return newVariant;
    } catch (err: any) {
      showError("Kunne ikke legge til variant.");
      console.error(err);
      return null;
    }
  };

  /** Update an existing variant. Supports moving to a different parent group via payload.exerciseId. */
  const updateVariant = async (
    id: number,
    exerciseId: number,
    payload: UpdateVariantPayload
  ): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (payload.name !== undefined) updates.name = payload.name.trim();
      if (payload.equipment !== undefined)
        updates.equipment = payload.equipment?.trim() || null;
      if (payload.exerciseId !== undefined && payload.exerciseId !== exerciseId)
        updates.exercise_id = payload.exerciseId;

      const { error } = await supabase
        .from("exercise_variants")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Update local state — handle parent group change if needed
      const newParentId = payload.exerciseId ?? exerciseId;
      const oldIdx = _exercises.value.findIndex((e) => e.id === exerciseId);
      const newIdx = _exercises.value.findIndex((e) => e.id === newParentId);

      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        // Moving to a different group: remove from old, append to new
        const variant = (_exercises.value[oldIdx].variants ?? []).find((v) => v.id === id);
        const updatedVariant = variant ? { ...variant, ...payload } : null;

        _exercises.value[oldIdx] = {
          ..._exercises.value[oldIdx],
          variants: (_exercises.value[oldIdx].variants ?? []).filter((v) => v.id !== id),
        };
        if (updatedVariant && newIdx !== -1) {
          _exercises.value[newIdx] = {
            ..._exercises.value[newIdx],
            variants: [...(_exercises.value[newIdx].variants ?? []), updatedVariant],
          };
        }
      } else if (oldIdx !== -1) {
        // Same group — just update in place
        _exercises.value[oldIdx] = {
          ..._exercises.value[oldIdx],
          variants: (_exercises.value[oldIdx].variants ?? []).map((v) =>
            v.id === id ? { ...v, ...payload } : v
          ),
        };
      }

      _exercises.value = [..._exercises.value];
      return true;
    } catch (err: any) {
      showError("Kunne ikke oppdatere variant.");
      console.error(err);
      return false;
    }
  };

  /** Delete a variant. */
  const deleteVariant = async (
    id: number,
    exerciseId: number
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("exercise_variants")
        .delete()
        .eq("id", id)
        .select("id"); // returns deleted rows; empty array means RLS blocked it

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Ingen rader ble slettet. Kjør supabase-setup/10_fix_all_permissions.sql i Supabase SQL-editoren."
        );
      }

      const exIdx = _exercises.value.findIndex((e) => e.id === exerciseId);
      if (exIdx !== -1) {
        const variants = (_exercises.value[exIdx].variants ?? []).filter(
          (v) => v.id !== id
        );
        _exercises.value[exIdx] = { ..._exercises.value[exIdx], variants };
        _exercises.value = [..._exercises.value];
      }

      return true;
    } catch (err: any) {
      showError("Kunne ikke slette variant. Sjekk rettighetene i Supabase.");
      console.error(err);
      return false;
    }
  };

  return {
    exercises: _exercises,
    isLoadingExercises: _isLoading,
    loadExercises,
    createExercise,
    updateExercise,
    deleteExercise,
    createVariant,
    updateVariant,
    deleteVariant,
  };
};
