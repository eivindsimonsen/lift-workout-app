import { computed, ref, watch } from "vue";
import { useSupabase } from "./useSupabase";
import { useSupabaseData } from "./useSupabaseData";
import { useErrorHandler } from "./useErrorHandler";
import muscleGroupsData from "@/data/muscle-groups.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrainingPlanId = "none" | "ppl" | "upper-lower" | "full-body" | "bro-split" | "ulppl" | "pplul" | "custom";

export interface TrainingGoals {
  planId: TrainingPlanId;
  /** Target number of completed sessions per week. 0 = no target. */
  sessionsPerWeek: number;
  /** Muscle group name → target sets per week, e.g. { Bryst: 16 }. */
  setsPerMuscleGroup: Record<string, number>;
}

export interface TrainingPlan {
  id: Exclude<TrainingPlanId, "none">;
  name: string;
  description: string;
  sessionsPerWeek: number;
  setsPerMuscleGroup: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Muscle group names, sourced from the same JSON the rest of the app uses. */
export const MUSCLE_GROUP_NAMES: string[] = muscleGroupsData.muscleGroups.map((g) => g.name);

/** Muscle group name → accent colour. */
export const MUSCLE_GROUP_COLORS: Record<string, string> = Object.fromEntries(muscleGroupsData.muscleGroups.map((g) => [g.name, g.color]));

/**
 * Weekly set targets per plan. Numbers sit inside the 10–20 sets/week band that
 * hypertrophy research points to for the larger groups, scaled down for the
 * smaller ones and for plans with fewer sessions.
 */
export const TRAINING_PLANS: TrainingPlan[] = [
  {
    id: "ppl",
    name: "Push / Pull / Legs",
    description: "Bryst-skuldre-triceps, rygg-biceps og ben — hver muskelgruppe to ganger i uka.",
    sessionsPerWeek: 6,
    setsPerMuscleGroup: { Bryst: 16, Rygg: 18, Ben: 18, Skuldre: 14, Biceps: 12, Triceps: 12, Kjerne: 6 },
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    description: "Overkropp og underkropp annenhver økt.",
    sessionsPerWeek: 4,
    setsPerMuscleGroup: { Bryst: 12, Rygg: 14, Ben: 14, Skuldre: 10, Biceps: 9, Triceps: 9, Kjerne: 6 },
  },
  {
    id: "full-body",
    name: "Full body",
    description: "Hele kroppen hver økt — færre økter, jevnere fordeling.",
    sessionsPerWeek: 3,
    setsPerMuscleGroup: { Bryst: 9, Rygg: 10, Ben: 12, Skuldre: 8, Biceps: 6, Triceps: 6, Kjerne: 6 },
  },
  {
    id: "bro-split",
    name: "Bro split",
    description: "Én muskelgruppe per økt, høyt volum per gang.",
    sessionsPerWeek: 5,
    setsPerMuscleGroup: { Bryst: 16, Rygg: 16, Ben: 16, Skuldre: 14, Biceps: 12, Triceps: 12, Kjerne: 6 },
  },
  {
    id: "ulppl",
    name: "Upper / Lower / Push / Pull / Legs",
    description: "ULPPL — starter uka med overkropp og underkropp, avslutter med PPL.",
    sessionsPerWeek: 5,
    setsPerMuscleGroup: { Bryst: 14, Rygg: 16, Ben: 16, Skuldre: 12, Biceps: 10, Triceps: 10, Kjerne: 6 },
  },
  {
    id: "pplul",
    name: "Push / Pull / Legs / Upper / Lower",
    description: "PPLUL — samme fem økter som ULPPL, men PPL først mens du er ferskest.",
    sessionsPerWeek: 5,
    setsPerMuscleGroup: { Bryst: 14, Rygg: 16, Ben: 16, Skuldre: 12, Biceps: 10, Triceps: 10, Kjerne: 6 },
  },
  {
    id: "custom",
    name: "Egendefinert",
    description: "Sett dine egne mål per muskelgruppe.",
    sessionsPerWeek: 4,
    setsPerMuscleGroup: { Bryst: 12, Rygg: 12, Ben: 12, Skuldre: 10, Biceps: 8, Triceps: 8, Kjerne: 6 },
  },
];

const STORAGE_KEY = "lift-training-goals";
const MAX_SETS_PER_GROUP = 60;
const MAX_SESSIONS_PER_WEEK = 14;

/** No plan chosen yet — the UI falls back to plain totals instead of showing 0 / 84. */
export const EMPTY_GOALS: TrainingGoals = Object.freeze({
  planId: "none",
  sessionsPerWeek: 0,
  setsPerMuscleGroup: {},
}) as TrainingGoals;

// ---------------------------------------------------------------------------
// Normalisation & persistence
// ---------------------------------------------------------------------------

const clamp = (value: unknown, max: number): number => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, max);
};

const VALID_PLAN_IDS: TrainingPlanId[] = ["none", "ppl", "upper-lower", "full-body", "bro-split", "ulppl", "pplul", "custom"];

/**
 * Coerces anything read from storage or `user_metadata` into a valid shape.
 * Unknown muscle group names are dropped so a renamed group in muscle-groups.json
 * can never leak a stale target into the UI.
 */
const normalizeGoals = (raw: unknown): TrainingGoals => {
  if (!raw || typeof raw !== "object") return { ...EMPTY_GOALS, setsPerMuscleGroup: {} };

  const input = raw as Partial<TrainingGoals>;
  const planId = VALID_PLAN_IDS.includes(input.planId as TrainingPlanId) ? (input.planId as TrainingPlanId) : "none";

  const setsPerMuscleGroup: Record<string, number> = {};
  const rawSets = input.setsPerMuscleGroup;
  if (rawSets && typeof rawSets === "object") {
    for (const name of MUSCLE_GROUP_NAMES) {
      const target = clamp((rawSets as Record<string, unknown>)[name], MAX_SETS_PER_GROUP);
      if (target > 0) setsPerMuscleGroup[name] = target;
    }
  }

  return {
    planId,
    sessionsPerWeek: clamp(input.sessionsPerWeek, MAX_SESSIONS_PER_WEEK),
    setsPerMuscleGroup,
  };
};

type StoredPayload = { userId: string | null; goals: TrainingGoals };

const readFromStorage = (): StoredPayload => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { userId: null, goals: normalizeGoals(null) };
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    return {
      userId: typeof parsed?.userId === "string" ? parsed.userId : null,
      goals: normalizeGoals(parsed?.goals),
    };
  } catch {
    return { userId: null, goals: normalizeGoals(null) };
  }
};

const writeToStorage = (userId: string | null, goals: TrainingGoals) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, goals }));
  } catch (e) {
    console.warn("⚠️ Kunne ikke lagre treningsmål lokalt:", e);
  }
};

// ---------------------------------------------------------------------------
// Singleton state — shared across all component instances
// ---------------------------------------------------------------------------

const initial = readFromStorage();
const _goals = ref<TrainingGoals>(initial.goals);
let _storedUserId: string | null = initial.userId;
let _hydratedForUserId: string | null = null;
let _watcherStarted = false;

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export const useTrainingGoals = () => {
  const { supabase } = useSupabase();
  const userData = useSupabaseData();
  const { showWarning } = useErrorHandler();

  // Hydrate from the signed-in user's metadata once auth is ready. The server
  // wins over the local mirror; the mirror only exists to paint instantly and
  // to survive being offline.
  if (!_watcherStarted) {
    _watcherStarted = true;
    watch(
      () => userData.currentUser.value?.id as string | undefined,
      (userId) => {
        if (!userId || _hydratedForUserId === userId) return;
        _hydratedForUserId = userId;

        const remote = userData.currentUser.value?.user_metadata?.trainingGoals;

        if (remote) {
          _goals.value = normalizeGoals(remote);
        } else if (_storedUserId && _storedUserId !== userId) {
          // Different account on this device and nothing stored server-side —
          // don't show the previous user's targets.
          _goals.value = normalizeGoals(null);
        }

        _storedUserId = userId;
        writeToStorage(userId, _goals.value);
      },
      { immediate: true },
    );
  }

  const goals = computed(() => _goals.value);

  /** Total target sets across every muscle group. */
  const totalTargetSets = computed(() => Object.values(_goals.value.setsPerMuscleGroup).reduce((sum, n) => sum + n, 0));

  /** True once the user has actually chosen a plan with at least one target. */
  const hasGoals = computed(() => _goals.value.planId !== "none" && totalTargetSets.value > 0);

  const activePlan = computed<TrainingPlan | null>(() => TRAINING_PLANS.find((p) => p.id === _goals.value.planId) ?? null);

  /** Target sets for a muscle group, or 0 when none is set. */
  const getTargetSets = (muscleGroup: string): number => _goals.value.setsPerMuscleGroup[muscleGroup] ?? 0;

  /** Builds a goals object from a preset without persisting it. */
  const buildFromPlan = (planId: TrainingPlanId): TrainingGoals => {
    const plan = TRAINING_PLANS.find((p) => p.id === planId);
    if (!plan) return normalizeGoals(null);
    return normalizeGoals({
      planId: plan.id,
      sessionsPerWeek: plan.sessionsPerWeek,
      setsPerMuscleGroup: { ...plan.setsPerMuscleGroup },
    });
  };

  /**
   * Persists goals locally, then to Supabase `user_metadata`.
   * Returns true when the remote write succeeded. A failed sync is a warning,
   * not an error — the values are already saved on this device.
   */
  const saveGoals = async (next: TrainingGoals): Promise<boolean> => {
    const normalized = normalizeGoals(next);
    _goals.value = normalized;

    const userId = (userData.currentUser.value?.id as string | undefined) ?? null;
    _storedUserId = userId;
    writeToStorage(userId, normalized);

    if (!userId) return false;

    try {
      const { data, error } = await supabase.auth.updateUser({ data: { trainingGoals: normalized } });
      if (error) throw error;

      // Keep the in-memory user in sync so a later hydrate doesn't undo this.
      if (data?.user) userData.currentUser.value = data.user;
      return true;
    } catch (err) {
      console.error("❌ Kunne ikke lagre treningsmål i Supabase:", err);
      showWarning("Målene er lagret på denne enheten, men ikke synkronisert ennå.");
      return false;
    }
  };

  return {
    goals,
    hasGoals,
    activePlan,
    totalTargetSets,
    getTargetSets,
    buildFromPlan,
    saveGoals,
  };
};
