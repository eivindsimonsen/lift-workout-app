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

// Same rounding as cardioGoalProgress in useWeekStats, so every view agrees.
const toMinutes = (seconds: number): number => Math.round(seconds / 60);
const toKm = (metres: number): number => Math.round(metres / 100) / 10;

const CARDIO_ROW_NAMES = { minutes: "Kondisjon", km: "Distanse" } as const;

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

    const cardio: [GoalGapKind, string, number, number][] = [
      ["minutes", CARDIO_ROW_NAMES.minutes, toMinutes(tally.cardioSeconds), goals.cardio.minutesPerWeek],
      ["km", CARDIO_ROW_NAMES.km, toKm(tally.cardioMetres), goals.cardio.kilometresPerWeek],
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

/** One bar in the active session: what the week had before it, and what it adds. */
export interface SessionGoalRow {
  name: string;
  kind: GoalGapKind;
  before: number;
  today: number;
  target: number;
  met: boolean;
  /** Parts of the bar, capped so the two never pass the target together. */
  beforeShare: number;
  todayShare: number;
}

/**
 * Goal rows for the groups a session trains (`groups`, in session order) plus
 * cardio when the session has any. Whether a row is met comes from
 * `evaluateWeek` on the combined week, so it matches the home card.
 */
export const sessionGoalRows = (before: WeekTally, today: WeekTally, groups: string[], hasCardio: boolean, goals: TrainingGoals): SessionGoalRow[] => {
  if (!hasAnyTarget(goals)) return [];

  const sum: WeekTally = {
    setsByGroup: { ...before.setsByGroup },
    cardioSeconds: before.cardioSeconds + today.cardioSeconds,
    cardioMetres: before.cardioMetres + today.cardioMetres,
  };
  for (const [name, n] of Object.entries(today.setsByGroup)) sum.setsByGroup[name] = (sum.setsByGroup[name] ?? 0) + n;
  const gaps = evaluateWeek(sum, goals).gaps;

  const row = (name: string, kind: GoalGapKind, done: number, total: number, target: number): SessionGoalRow => {
    const beforeShare = Math.min(done, target) / target;
    return {
      name,
      kind,
      before: done,
      today: Math.round((total - done) * 10) / 10,
      target,
      met: !gaps.some((gap) => gap.kind === kind && gap.name === name),
      beforeShare,
      todayShare: Math.min(total, target) / target - beforeShare,
    };
  };

  const rows = groups
    .filter((name) => (goals.setsPerMuscleGroup[name] ?? 0) > 0)
    .map((name) => {
      const done = before.setsByGroup[name] ?? 0;
      return row(name, "strength", done, done + (today.setsByGroup[name] ?? 0), goals.setsPerMuscleGroup[name]);
    });

  if (hasCardio && goals.cardio.minutesPerWeek > 0) {
    rows.push(row(CARDIO_ROW_NAMES.minutes, "minutes", toMinutes(before.cardioSeconds), toMinutes(sum.cardioSeconds), goals.cardio.minutesPerWeek));
  }
  if (hasCardio && goals.cardio.kilometresPerWeek > 0) {
    rows.push(row(CARDIO_ROW_NAMES.km, "km", toKm(before.cardioMetres), toKm(sum.cardioMetres), goals.cardio.kilometresPerWeek));
  }
  return rows;
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
