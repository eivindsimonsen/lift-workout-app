import { computed, unref, type ComputedRef, type Ref } from "vue";
import { useHybridData } from "./useHybridData";
import { useTrainingGoals, MUSCLE_GROUP_COLORS, STRENGTH_MUSCLE_GROUP_NAMES, CARDIO_GROUP_NAME } from "./useTrainingGoals";
import type { WorkoutSession } from "@/types/workout";
import { isSetCounted, setVolume, setReps, setDuration, setDistance, isCardioExercise } from "./useSetMetrics";

// ---------------------------------------------------------------------------
// Date helpers (ISO weeks, Monday-first)
// ---------------------------------------------------------------------------

/** Weekday labels, Monday first — matches the day-track ordering everywhere. */
export const WEEK_DAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"] as const;

const MS_PER_DAY = 86_400_000;

/** Monday 00:00 (local time) of the week containing `input`. */
export const startOfIsoWeek = (input: Date): Date => {
  const d = new Date(input);
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * ISO-8601 week number. Computed in UTC so a DST shift inside the week can't
 * push the result into the neighbouring week.
 */
export const getIsoWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
};

/** Human label for a week, e.g. "17.–23. aug" or "31. juli – 6. aug". */
export const formatWeekRange = (weekStart: Date): string => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);

  const dayMonth = new Intl.DateTimeFormat("no-NO", { day: "numeric", month: "short" });
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()}.–${dayMonth.format(end)}`;
  }
  return `${dayMonth.format(weekStart)} – ${dayMonth.format(end)}`;
};

/** Today's index within the week: Mon=0 … Sun=6. */
export const getTodayIndex = (): number => (new Date().getDay() + 6) % 7;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeekTotals {
  workouts: number;
  sets: number;
  /** `sets` split by tracking type — tells whether the week had any strength or cardio at all. */
  strengthSets: number;
  cardioSets: number;
  reps: number;
  volume: number;
  durationMinutes: number;
  /** Cardio time logged on sets, separate from the session's own duration. */
  cardioSeconds: number;
  cardioMetres: number;
  uniqueExercises: number;
  avgVolumePerWorkout: number;
  avgDuration: number;
  /** Average load moved per rep — a rough intensity read. */
  kgPerRep: number;
}

export interface MuscleGroupWeekStat {
  name: string;
  color: string;
  sets: number;
  reps: number;
  volume: number;
  /** Weekly target from the user's plan; 0 when no goal is set. */
  targetSets: number;
  /** Progress toward the target, capped at 100. 0 when no target. */
  pctOfTarget: number;
  isMet: boolean;
  /** Share of the most-trained group this week — used when no goals exist. */
  shareOfMax: number;
}

export interface DayVolume {
  dayIdx: number;
  label: string;
  volume: number;
  sets: number;
  sessions: number;
  /** Cardio time logged that day — kept apart from `volume`, which is kilos. */
  cardioSeconds: number;
}

export interface TemplateUsage {
  name: string;
  workoutType: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Set counting
// ---------------------------------------------------------------------------

const emptyTotals = (): WeekTotals => ({
  workouts: 0,
  sets: 0,
  strengthSets: 0,
  cardioSets: 0,
  reps: 0,
  volume: 0,
  durationMinutes: 0,
  cardioSeconds: 0,
  cardioMetres: 0,
  uniqueExercises: 0,
  avgVolumePerWorkout: 0,
  avgDuration: 0,
  kgPerRep: 0,
});

const buildTotals = (sessions: WorkoutSession[]): WeekTotals => {
  const totals = emptyTotals();
  const exerciseIds = new Set<number>();

  sessions.forEach((session) => {
    totals.durationMinutes += Number(session.duration) || 0;

    session.exercises?.forEach((exercise: any) => {
      let exerciseHadSets = false;
      exercise.sets?.forEach((set: any) => {
        if (!isSetCounted(exercise, set)) return;
        exerciseHadSets = true;
        // A set is a set whichever way it's measured — an interval counts.
        // Reps and volume stay strength-only; kilos mean nothing on a run.
        totals.sets += 1;
        if (isCardioExercise(exercise)) totals.cardioSets += 1;
        else totals.strengthSets += 1;
        totals.reps += setReps(exercise, set);
        totals.volume += setVolume(exercise, set);
        totals.cardioSeconds += setDuration(exercise, set);
        totals.cardioMetres += setDistance(exercise, set);
      });
      if (exerciseHadSets) exerciseIds.add(Number(exercise.exerciseId));
    });
  });

  totals.workouts = sessions.length;
  totals.uniqueExercises = exerciseIds.size;
  totals.avgVolumePerWorkout = totals.workouts > 0 ? Math.round(totals.volume / totals.workouts) : 0;
  totals.avgDuration = totals.workouts > 0 ? Math.round(totals.durationMinutes / totals.workouts) : 0;
  totals.kgPerRep = totals.reps > 0 ? Math.round((totals.volume / totals.reps) * 10) / 10 : 0;

  return totals;
};

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Weekly training statistics for a single ISO week.
 *
 * @param weekOffset 0 = current week, -1 = last week, and so on.
 */
export const useWeekStats = (weekOffset: Ref<number> | number = 0) => {
  const workoutData = useHybridData();
  const { getTargetSets, hasGoals, hasCardioGoal, goals } = useTrainingGoals();

  const offset = computed(() => unref(weekOffset));

  const weekStart = computed(() => {
    const base = startOfIsoWeek(new Date());
    base.setDate(base.getDate() + offset.value * 7);
    return base;
  });

  /** Exclusive upper bound — Monday 00:00 of the following week. */
  const weekEndExclusive = computed(() => {
    const end = new Date(weekStart.value);
    end.setDate(end.getDate() + 7);
    return end;
  });

  /** Inclusive end for display purposes (Sunday). */
  const weekEnd = computed(() => {
    const end = new Date(weekStart.value);
    end.setDate(end.getDate() + 6);
    return end;
  });

  const weekNumber = computed(() => getIsoWeekNumber(weekStart.value));
  const weekLabel = computed(() => formatWeekRange(weekStart.value));
  const isCurrentWeek = computed(() => offset.value === 0);

  const completedSessions = computed(() => workoutData.sessions.value.filter((s) => s.isCompleted));

  const sessionsInRange = (start: Date, endExclusive: Date): WorkoutSession[] =>
    completedSessions.value
      .filter((s) => {
        const d = new Date(s.date);
        return d >= start && d < endExclusive;
      })
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const sessions = computed(() => sessionsInRange(weekStart.value, weekEndExclusive.value));

  const previousWeekSessions = computed(() => {
    const start = new Date(weekStart.value);
    start.setDate(start.getDate() - 7);
    return sessionsInRange(start, weekStart.value);
  });

  const totals = computed(() => buildTotals(sessions.value));
  const previousWeekTotals = computed(() => buildTotals(previousWeekSessions.value));

  /** False while the exercise library is still empty — nothing can be resolved yet. */
  const exercisesReady = computed(() => workoutData.exerciseIndex.value.size > 0);

  /**
   * Resolves a logged exercise to its muscle group by id.
   *
   * Sessions logged before the exercise library was re-seeded carried stale ids;
   * those were rewritten once by supabase-setup/migrate-exercise-ids.mjs, so the
   * id is the single source of truth again. Anything that fails to resolve here
   * is genuinely missing and is surfaced through `unresolvedSets` rather than
   * being guessed at by name.
   */
  const resolveExercise = (exercise: any): { name: string; category: string } | null =>
    workoutData.exerciseIndex.value.get(Number(exercise?.exerciseId)) ?? null;

  /** Day indices (Mon=0) with at least one completed session. */
  const trainedDayIndices = computed(() => {
    const days = new Set<number>();
    sessions.value.forEach((s) => {
      const idx = Math.floor((new Date(s.date).getTime() - weekStart.value.getTime()) / MS_PER_DAY);
      if (idx >= 0 && idx < 7) days.add(idx);
    });
    return days;
  });

  /**
   * Sets whose exercise could not be resolved (typically an exercise deleted
   * after the session was logged). Surfaced so the UI can explain why the
   * muscle-group breakdown doesn't add up to the total.
   */
  const unresolvedSets = computed(() => {
    let count = 0;
    sessions.value.forEach((session) => {
      session.exercises?.forEach((exercise: any) => {
        if (resolveExercise(exercise)) return;
        exercise.sets?.forEach((set: any) => {
          if (isSetCounted(exercise, set)) count += 1;
        });
      });
    });
    return count;
  });

  /**
   * Strength muscle groups only. Cardio is measured in time and distance and
   * has its own figures and goal; counted here, its rounds would show up as
   * "sets" and could become the group every bar is scaled against.
   */
  const muscleGroups = computed<MuscleGroupWeekStat[]>(() => {
    const acc: Record<string, { sets: number; reps: number; volume: number }> = {};
    const emptyBucket = () => ({ sets: 0, reps: 0, volume: 0 });
    STRENGTH_MUSCLE_GROUP_NAMES.forEach((name) => {
      acc[name] = emptyBucket();
    });

    sessions.value.forEach((session) => {
      session.exercises?.forEach((exercise: any) => {
        if (isCardioExercise(exercise)) return;
        const entry = resolveExercise(exercise);
        if (!entry || entry.category === CARDIO_GROUP_NAME) return;
        const bucket = acc[entry.category] ?? (acc[entry.category] = emptyBucket());

        exercise.sets?.forEach((set: any) => {
          if (!isSetCounted(exercise, set)) return;
          bucket.sets += 1;
          bucket.reps += setReps(exercise, set);
          bucket.volume += setVolume(exercise, set);
        });
      });
    });

    const maxSets = Math.max(0, ...Object.values(acc).map((v) => v.sets));

    return Object.entries(acc)
      .map(([name, v]) => {
        const targetSets = getTargetSets(name);
        return {
          name,
          color: MUSCLE_GROUP_COLORS[name] ?? "#6b7280",
          sets: v.sets,
          reps: v.reps,
          volume: Math.round(v.volume),
          targetSets,
          pctOfTarget: targetSets > 0 ? Math.min(100, Math.round((v.sets / targetSets) * 100)) : 0,
          isMet: targetSets > 0 && v.sets >= targetSets,
          shareOfMax: maxSets > 0 ? Math.round((v.sets / maxSets) * 100) : 0,
        };
      })
      .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name, "no"));
  });

  /**
   * Progress toward the sum of every muscle group target. Strength sets only —
   * `muscleGroups` already leaves cardio out, which has no set target.
   */
  const setsGoalProgress = computed(() => {
    const target = muscleGroups.value.reduce((sum, g) => sum + g.targetSets, 0);
    const done = muscleGroups.value.reduce((sum, g) => sum + g.sets, 0);
    return {
      done,
      target,
      hasTarget: target > 0,
      percentage: target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0,
    };
  });

  /** Progress toward the weekly cardio goal, in minutes and kilometres. */
  const cardioGoalProgress = computed(() => {
    const target = goals.value.cardio;
    const minutesDone = Math.round(totals.value.cardioSeconds / 60);
    const kmDone = Math.round((totals.value.cardioMetres / 1000) * 10) / 10;

    const pct = (done: number, goal: number) => (goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0);

    return {
      hasTarget: hasCardioGoal.value,
      minutesDone,
      minutesTarget: target.minutesPerWeek,
      minutesPct: pct(minutesDone, target.minutesPerWeek),
      kmDone,
      kmTarget: target.kilometresPerWeek,
      kmPct: pct(kmDone, target.kilometresPerWeek),
    };
  });

  const dailyVolume = computed<DayVolume[]>(() => {
    const days: DayVolume[] = WEEK_DAYS.map((label, dayIdx) => ({ dayIdx, label, volume: 0, sets: 0, sessions: 0, cardioSeconds: 0 }));

    sessions.value.forEach((session) => {
      const idx = Math.floor((new Date(session.date).getTime() - weekStart.value.getTime()) / MS_PER_DAY);
      if (idx < 0 || idx > 6) return;
      days[idx].sessions += 1;

      session.exercises?.forEach((exercise: any) => {
        exercise.sets?.forEach((set: any) => {
          if (!isSetCounted(exercise, set)) return;
          days[idx].sets += 1;
          days[idx].volume += setVolume(exercise, set);
          days[idx].cardioSeconds += setDuration(exercise, set);
        });
      });
    });

    return days.map((d) => ({ ...d, volume: Math.round(d.volume) }));
  });

  /** Share of reps in each rep range, as whole percentages. */
  const repRanges = computed(() => {
    let strength = 0;
    let hypertrophy = 0;
    let endurance = 0;

    sessions.value.forEach((session) => {
      session.exercises?.forEach((exercise: any) => {
        // Rep ranges describe strength work; a run has no meaningful rep count.
        if (isCardioExercise(exercise)) return;
        exercise.sets?.forEach((set: any) => {
          if (!isSetCounted(exercise, set)) return;
          const reps = Number(set.reps);
          if (reps <= 5) strength += reps;
          else if (reps <= 12) hypertrophy += reps;
          else endurance += reps;
        });
      });
    });

    const total = strength + hypertrophy + endurance;
    if (total === 0) return { strength: 0, hypertrophy: 0, endurance: 0 };

    return {
      strength: Math.round((strength / total) * 100),
      hypertrophy: Math.round((hypertrophy / total) * 100),
      endurance: Math.round((endurance / total) * 100),
    };
  });

  const templateUsage = computed<TemplateUsage[]>(() => {
    const usage = new Map<string, TemplateUsage>();
    sessions.value.forEach((s) => {
      if (!s.templateName) return;
      const existing = usage.get(s.templateName);
      if (existing) existing.count += 1;
      else usage.set(s.templateName, { name: s.templateName, workoutType: s.workoutType, count: 1 });
    });
    return [...usage.values()];
  });

  return {
    // Period
    weekStart,
    weekEnd,
    weekNumber,
    weekLabel,
    isCurrentWeek,

    // Data
    sessions,
    trainedDayIndices,
    totals,
    previousWeekTotals,
    muscleGroups,
    setsGoalProgress,
    dailyVolume,
    repRanges,
    templateUsage,
    unresolvedSets,
    exercisesReady,
    cardioGoalProgress,
  };
};

export type UseWeekStats = ReturnType<typeof useWeekStats>;
export type WeekTotalsRef = ComputedRef<WeekTotals>;
