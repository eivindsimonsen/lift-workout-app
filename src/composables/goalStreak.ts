import type { TrainingGoals } from "./useTrainingGoals";

/**
 * Pure rules for the weekly goal streak: a week counts when every target it had
 * was met. Type-only imports keep this file runnable outside Vite.
 */

export const STREAK_MILESTONES = [3, 5, 10, 15, 30] as const;

/** Weeks shown in the chain on the home card, current week included. */
export const CHAIN_LENGTH = 10;

/** Goals that applied from the week starting `from` (Monday, "YYYY-MM-DD", local time). */
export interface GoalHistoryEntry {
  from: string;
  goals: TrainingGoals;
}

/** What a week contained, in the units the goals are set in. */
export interface WeekTally {
  setsByGroup: Record<string, number>;
  cardioSeconds: number;
  cardioMetres: number;
}

export type GoalGapKind = "strength" | "minutes" | "km";

/** A target the week hasn't reached yet. */
export interface GoalGap {
  name: string;
  kind: GoalGapKind;
  done: number;
  target: number;
  remaining: number;
}

export interface WeekEvaluation {
  hasGoals: boolean;
  approved: boolean;
  /** Mean of each target's progress, capped at 1 per target — 1 exactly when approved. */
  progress: number;
  gaps: GoalGap[];
  groupsMet: number;
  groupsTotal: number;
  remainingSets: number;
}

/** Key for the ISO week containing `date`: its Monday, formatted from local time. */
export const weekKeyOf = (date: Date): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  // Local getters, not toISOString — UTC would shift the date near midnight.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const hasAnyTarget = (goals: TrainingGoals): boolean =>
  goals.planId !== "none" &&
  (Object.values(goals.setsPerMuscleGroup).some((n) => n > 0) || goals.cardio.minutesPerWeek > 0 || goals.cardio.kilometresPerWeek > 0);

/**
 * The goals a week is judged by. The current week always uses the goals the app
 * shows — history can lag if another client saved goals without it. Weeks
 * before the first entry use the oldest one.
 */
export const goalsForWeek = (history: GoalHistoryEntry[], current: TrainingGoals, key: string, currentKey: string): TrainingGoals => {
  if (history.length === 0 || key >= currentKey) return current;
  let match = history[0];
  for (const entry of history) {
    if (entry.from <= key) match = entry;
  }
  return match.goals;
};

/**
 * History after saving `next` in week `key`. The first save also records the
 * goals in force until now, so raising a target can't re-judge older weeks.
 */
export const appendGoalHistory = (history: GoalHistoryEntry[], previous: TrainingGoals, next: TrainingGoals, key: string): GoalHistoryEntry[] => {
  const base = history.length === 0 && hasAnyTarget(previous) ? [{ from: "0000-01-01", goals: previous }] : history;
  return [...base.filter((e) => e.from !== key), { from: key, goals: next }].sort((a, b) => a.from.localeCompare(b.from));
};

export const evaluateWeek = (tally: WeekTally, goals: TrainingGoals): WeekEvaluation => {
  const hasGoals = hasAnyTarget(goals);
  const gaps: GoalGap[] = [];
  const ratios: number[] = [];
  let groupsMet = 0;
  let groupsTotal = 0;

  if (hasGoals) {
    for (const [name, target] of Object.entries(goals.setsPerMuscleGroup)) {
      if (target <= 0) continue;
      const done = tally.setsByGroup[name] ?? 0;
      groupsTotal += 1;
      ratios.push(Math.min(1, done / target));
      if (done >= target) groupsMet += 1;
      else gaps.push({ name, kind: "strength", done, target, remaining: target - done });
    }

    // Same rounding as cardioGoalProgress in useWeekStats, so both views agree.
    const minutes = Math.round(tally.cardioSeconds / 60);
    const km = Math.round(tally.cardioMetres / 100) / 10;
    const cardio: [GoalGapKind, string, number, number][] = [
      ["minutes", "Kondisjon", minutes, goals.cardio.minutesPerWeek],
      ["km", "Distanse", km, goals.cardio.kilometresPerWeek],
    ];
    for (const [kind, name, done, target] of cardio) {
      if (target <= 0) continue;
      ratios.push(Math.min(1, done / target));
      if (done < target) gaps.push({ name, kind, done, target, remaining: Math.round((target - done) * 10) / 10 });
    }
  }

  return {
    hasGoals,
    approved: hasGoals && gaps.length === 0,
    progress: ratios.length > 0 ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length : 0,
    gaps,
    groupsMet,
    groupsTotal,
    remainingSets: gaps.reduce((sum, gap) => (gap.kind === "strength" ? sum + gap.remaining : sum), 0),
  };
};

/**
 * `approved` runs oldest → newest and ends with the current week, which only
 * adds to the streak — a week still in progress can't break it.
 */
export const streakFromWeeks = (approved: boolean[]): { current: number; best: number } => {
  let best = 0;
  let run = 0;
  for (const ok of approved) {
    run = ok ? run + 1 : 0;
    best = Math.max(best, run);
  }

  let current = 0;
  const start = approved[approved.length - 1] ? approved.length - 1 : approved.length - 2;
  for (let i = start; i >= 0 && approved[i]; i--) current += 1;

  return { current, best };
};

export const nextMilestone = (streak: number): number | null => STREAK_MILESTONES.find((m) => m > streak) ?? null;
