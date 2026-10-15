import type { WorkoutExercise, WorkoutSession } from "@/types/workout";
import { isCardioExercise, isSetCounted, setDuration, setDistance, formatPace } from "./useSetMetrics";
import { startOfIsoWeek, getIsoWeekNumber } from "./useWeekStats";

/**
 * Cardio seen as activities rather than sets: one activity is one cardio
 * exercise in one completed session — a football match, a run, an interval
 * workout — and its sets are the rounds within it. This is the shape every
 * cardio statistic is built from, so session details, the exercise page and
 * the stats page agree on what "an activity" and "a record" mean.
 */

export interface CardioRound {
  seconds: number;
  metres: number;
}

export interface CardioActivity {
  /** Stable identity: one exercise within one session. */
  key: string;
  sessionId: string;
  sessionName: string;
  date: Date;
  exerciseId: number;
  name: string;
  seconds: number;
  metres: number;
  rounds: CardioRound[];
  /** 1–10, or null when the activity wasn't rated. */
  effort: number | null;
  note: string | null;
}

export interface CardioWeek {
  weekStart: Date;
  weekNumber: number;
  seconds: number;
  metres: number;
  activities: number;
}

/** Rounds shorter than this give a pace too noisy to count as a record. */
export const MIN_PACE_DISTANCE_M = 400;

// ---------------------------------------------------------------------------
// Effort
// ---------------------------------------------------------------------------

export const EFFORT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Bands follow the usual perceived-exertion scale used by running apps. */
export const effortLabel = (effort: number): string => {
  if (effort <= 3) return "Lett";
  if (effort <= 6) return "Moderat";
  if (effort <= 8) return "Hard";
  return "Maks";
};

/** "7/10 · Hard". */
export const formatEffort = (effort: number): string => `${effort}/10 · ${effortLabel(effort)}`;

const validEffort = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
};

/** Mean effort of the rated activities, one decimal; null when none are rated. */
export const averageEffort = (activities: CardioActivity[]): number | null => {
  const rated = activities.map((a) => a.effort).filter((e): e is number => e !== null);
  if (rated.length === 0) return null;
  return Math.round((rated.reduce((sum, e) => sum + e, 0) / rated.length) * 10) / 10;
};

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

/** Counted rounds of one cardio exercise, with totals. */
export const summarizeCardioExercise = (exercise: WorkoutExercise): { seconds: number; metres: number; rounds: CardioRound[] } => {
  const rounds: CardioRound[] = [];
  exercise.sets?.forEach((set) => {
    if (!isSetCounted(exercise, set)) return;
    rounds.push({ seconds: setDuration(exercise, set), metres: setDistance(exercise, set) });
  });
  return {
    seconds: rounds.reduce((sum, r) => sum + r.seconds, 0),
    metres: rounds.reduce((sum, r) => sum + r.metres, 0),
    rounds,
  };
};

/** Every cardio activity in completed sessions, newest first. */
export const collectCardioActivities = (sessions: WorkoutSession[]): CardioActivity[] => {
  const activities: CardioActivity[] = [];

  sessions.forEach((session) => {
    if (!session.isCompleted) return;
    session.exercises?.forEach((exercise) => {
      if (!isCardioExercise(exercise)) return;
      const summary = summarizeCardioExercise(exercise);
      if (summary.rounds.length === 0) return;

      activities.push({
        key: `${session.id}:${exercise.exerciseId}`,
        sessionId: session.id,
        sessionName: session.templateName,
        date: new Date(session.date),
        exerciseId: Number(exercise.exerciseId),
        name: exercise.name,
        ...summary,
        effort: validEffort(exercise.effort),
        note: exercise.note?.trim() || null,
      });
    });
  });

  return activities.sort((a, b) => b.date.getTime() - a.date.getTime());
};

/**
 * Accumulated time for totals: "45 min", "3 t 5 min". A single activity reads
 * better as a clock ("1:32:10"); a week's or a year's worth doesn't.
 */
export const formatTotalTime = (seconds: number): string => {
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} t` : `${hours} t ${minutes} min`;
};

/** Pace over the rounds that have a distance — time without one would skew it. */
export const activityPace = (rounds: CardioRound[]): string | null => {
  const withDistance = rounds.filter((r) => r.metres > 0);
  const seconds = withDistance.reduce((sum, r) => sum + r.seconds, 0);
  const metres = withDistance.reduce((sum, r) => sum + r.metres, 0);
  return formatPace(seconds, metres);
};

// ---------------------------------------------------------------------------
// Weeks and records
// ---------------------------------------------------------------------------

/**
 * The `count` ISO weeks ending with the week of `endDate`, oldest first —
 * including empty weeks, so a gap in training shows as a gap in the chart.
 */
export const cardioWeeks = (activities: CardioActivity[], endDate: Date, count = 12): CardioWeek[] => {
  const byWeek = new Map<number, CardioWeek>();
  const end = startOfIsoWeek(endDate);

  for (let i = count - 1; i >= 0; i--) {
    const weekStart = new Date(end);
    weekStart.setDate(weekStart.getDate() - i * 7);
    byWeek.set(weekStart.getTime(), { weekStart, weekNumber: getIsoWeekNumber(weekStart), seconds: 0, metres: 0, activities: 0 });
  }

  activities.forEach((activity) => {
    const week = byWeek.get(startOfIsoWeek(activity.date).getTime());
    if (!week) return;
    week.seconds += activity.seconds;
    week.metres += activity.metres;
    week.activities += 1;
  });

  return [...byWeek.values()];
};

export interface CardioRecords {
  longest: CardioActivity | null;
  farthest: CardioActivity | null;
  /** Fastest single round of at least MIN_PACE_DISTANCE_M, in seconds per km. */
  fastestPace: { secPerKm: number; activity: CardioActivity } | null;
  bestWeek: { weekStart: Date; weekNumber: number; seconds: number } | null;
}

export const cardioRecords = (activities: CardioActivity[]): CardioRecords => {
  let longest: CardioActivity | null = null;
  let farthest: CardioActivity | null = null;
  let fastestPace: CardioRecords["fastestPace"] = null;
  const weekSeconds = new Map<number, number>();

  activities.forEach((activity) => {
    if (!longest || activity.seconds > longest.seconds) longest = activity;
    if (activity.metres > 0 && (!farthest || activity.metres > farthest.metres)) farthest = activity;

    activity.rounds.forEach((round) => {
      if (round.metres < MIN_PACE_DISTANCE_M || round.seconds <= 0) return;
      const secPerKm = (round.seconds / round.metres) * 1000;
      if (!fastestPace || secPerKm < fastestPace.secPerKm) fastestPace = { secPerKm, activity };
    });

    const week = startOfIsoWeek(activity.date).getTime();
    weekSeconds.set(week, (weekSeconds.get(week) ?? 0) + activity.seconds);
  });

  let bestWeek: CardioRecords["bestWeek"] = null;
  weekSeconds.forEach((seconds, week) => {
    if (!bestWeek || seconds > bestWeek.seconds) {
      const weekStart = new Date(week);
      bestWeek = { weekStart, weekNumber: getIsoWeekNumber(weekStart), seconds };
    }
  });

  return { longest, farthest, fastestPace, bestWeek };
};
