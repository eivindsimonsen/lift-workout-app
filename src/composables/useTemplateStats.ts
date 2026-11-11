import { computed, type Ref } from "vue";
import { useHybridData } from "./useHybridData";
import { useTrainingGoals } from "./useTrainingGoals";
import { lastLoggedByExercise } from "./useSetMetrics";
import type { WeekTally } from "./goalStreak";
import {
  lastTrainedLabel,
  pendingGoalRows,
  templateEstimate,
  templateGoalPlan,
  templateHistories,
  templateKindFromLibrary,
  type TemplateEstimate,
  type TemplateGoalPlan,
  type TemplateHistory,
  type TemplateKind,
} from "./templateStats";

/** Everything a template tile and its sheet show, for one template. */
export interface TemplateTileStats {
  /** null: the template has never been run. */
  history: TemplateHistory | null;
  /** From the sessions when there are any, else from the library; null until known. */
  kind: TemplateKind | null;
  /** "i går", "mandag" …; null: never run. */
  lastLabel: string | null;
  /** The session the template would start as; null until the exercise library is loaded. */
  estimate: TemplateEstimate | null;
  /** null: no goals, the library isn't loaded, or no group the template trains has a target. */
  goal: TemplateGoalPlan | null;
  /** Goals exist but the library isn't loaded yet, so the goal part is a placeholder. */
  goalPending: boolean;
  /** Placeholder rows to reserve meanwhile: never fewer than the rows that can come. */
  goalPendingRows: number;
}

/**
 * The numbers for every template on the home page, built once rather than per
 * tile. History and "sist trent" need only the sessions (startup wave 1); the
 * goal part needs the exercise library to find muscle groups (wave 2).
 *
 * `weekTally` is `useGoalStreak().thisWeekTally`, passed in so the page doesn't
 * build the streak's tallies twice.
 */
export const useTemplateStats = (weekTally: Ref<WeekTally>) => {
  const workoutData = useHybridData();
  const { goals, hasGoals } = useTrainingGoals();

  const histories = computed(() => templateHistories(workoutData.sessions.value));
  // Lazy: only read once the library is loaded.
  const lastLogged = computed(() => lastLoggedByExercise(workoutData.sessions.value));

  /** Targets the goal part can show a row for: strength groups, and the cardio minute and km targets. */
  const targetCounts = computed(() => {
    const g = goals.value;
    return {
      strength: Object.values(g.setsPerMuscleGroup).filter((sets) => sets > 0).length,
      cardio: (g.cardio.minutesPerWeek > 0 ? 1 : 0) + (g.cardio.kilometresPerWeek > 0 ? 1 : 0),
    };
  });

  const statsById = computed(() => {
    const index = workoutData.exerciseIndex.value;
    const libraryReady = index.size > 0;
    const goalPending = hasGoals.value && !libraryReady;
    const now = new Date();
    const result = new Map<string, TemplateTileStats>();

    for (const template of workoutData.templates.value) {
      const history = histories.value.get(template.id) ?? null;
      const estimate = libraryReady ? templateEstimate(template, index, lastLogged.value) : null;
      result.set(template.id, {
        history,
        kind: history?.kind ?? templateKindFromLibrary(template, index),
        lastLabel: history ? lastTrainedLabel(history.lastDate, now) : null,
        estimate,
        goal: estimate && hasGoals.value ? templateGoalPlan(estimate, weekTally.value, goals.value) : null,
        goalPending,
        goalPendingRows: goalPending
          ? pendingGoalRows(template.exercises.length, targetCounts.value.strength, targetCounts.value.cardio, history?.kind ?? null)
          : 0,
      });
    }
    return result;
  });

  return { statsById };
};
