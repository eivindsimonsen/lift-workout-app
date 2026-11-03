import { computed } from "vue";
import { useHybridData, type ExerciseIndexEntry } from "./useHybridData";
import type { WorkoutSession } from "@/types/workout";
import { useTrainingGoals, CARDIO_GROUP_NAME } from "./useTrainingGoals";
import { startOfIsoWeek } from "./useWeekStats";
import { isSetCounted, setDuration, setDistance, isCardioExercise } from "./useSetMetrics";
import {
  CHAIN_LENGTH,
  evaluateWeek,
  goalsForWeek,
  nextMilestone as milestoneAfter,
  streakFromWeeks,
  weekKeyOf,
  type WeekEvaluation,
  type WeekTally,
} from "./goalStreak";

export interface ChainLink {
  key: string;
  approved: boolean;
  isCurrent: boolean;
  progress: number;
}

export const emptyTally = (): WeekTally => ({ setsByGroup: {}, cardioSeconds: 0, cardioMetres: 0 });

/** Adds a session's counted sets to `tally` — the one counting rule the streak and the live session share. */
export const addSessionToTally = (tally: WeekTally, session: Pick<WorkoutSession, "exercises">, index: Map<number, ExerciseIndexEntry>): void => {
  session.exercises?.forEach((exercise: any) => {
    const cardio = isCardioExercise(exercise);
    const category = cardio ? null : index.get(Number(exercise?.exerciseId))?.category;
    exercise.sets?.forEach((set: any) => {
      if (!isSetCounted(exercise, set)) return;
      tally.cardioSeconds += setDuration(exercise, set);
      tally.cardioMetres += setDistance(exercise, set);
      if (category && category !== CARDIO_GROUP_NAME) tally.setsByGroup[category] = (tally.setsByGroup[category] ?? 0) + 1;
    });
  });
};

/**
 * Consecutive weeks where every weekly target was met, each week judged by the
 * goals that applied to it. Counting follows the same rules as `useWeekStats`.
 */
export const useGoalStreak = () => {
  const workoutData = useHybridData();
  const { goals, goalHistory } = useTrainingGoals();

  /** Nothing resolves to a muscle group until the exercise library is loaded. */
  const ready = computed(() => workoutData.exerciseIndex.value.size > 0);

  /** Week key → what that week contained, from one pass over every completed session. */
  const tallies = computed(() => {
    const byWeek = new Map<string, WeekTally>();
    const index = workoutData.exerciseIndex.value;

    workoutData.sessions.value.forEach((session) => {
      if (!session.isCompleted) return;
      const key = weekKeyOf(new Date(session.date));
      addSessionToTally(byWeek.get(key) ?? byWeek.set(key, emptyTally()).get(key)!, session, index);
    });

    return byWeek;
  });

  /** Every week from the first session (or at least a full chain back) to now, oldest first. */
  const weeks = computed(() => {
    const thisMonday = startOfIsoWeek(new Date());
    const first = new Date(thisMonday);
    first.setDate(first.getDate() - (CHAIN_LENGTH - 1) * 7);

    tallies.value.forEach((_, key) => {
      const [y, m, d] = key.split("-").map(Number);
      const monday = new Date(y, m - 1, d);
      if (monday < first) first.setTime(monday.getTime());
    });

    const currentKey = weekKeyOf(thisMonday);
    const result: { key: string; evaluation: WeekEvaluation }[] = [];
    for (const monday = first; monday <= thisMonday; monday.setDate(monday.getDate() + 7)) {
      const key = weekKeyOf(monday);
      const weekGoals = goalsForWeek(goalHistory.value, goals.value, key, currentKey);
      result.push({ key, evaluation: evaluateWeek(tallies.value.get(key) ?? emptyTally(), weekGoals) });
    }
    return result;
  });

  const streak = computed(() => streakFromWeeks(weeks.value.map((w) => w.evaluation.approved)));
  const current = computed(() => streak.value.current);
  const best = computed(() => streak.value.best);
  const nextMilestone = computed(() => milestoneAfter(current.value));

  const chain = computed<ChainLink[]>(() =>
    weeks.value.slice(-CHAIN_LENGTH).map((w, i, all) => ({
      key: w.key,
      approved: w.evaluation.approved,
      isCurrent: i === all.length - 1,
      progress: w.evaluation.progress,
    })),
  );

  const thisWeek = computed(() => weeks.value[weeks.value.length - 1].evaluation);
  const thisWeekKey = computed(() => weeks.value[weeks.value.length - 1].key);
  /** Completed sessions so far this week — the live session adds itself on top. */
  const thisWeekTally = computed(() => tallies.value.get(thisWeekKey.value) ?? emptyTally());

  return { ready, current, best, nextMilestone, chain, thisWeek, thisWeekKey, thisWeekTally };
};
