import type { ExerciseTrackingType, WorkoutSession, WorkoutTemplate } from "@/types/workout";
import type { TrainingGoals } from "./useTrainingGoals";
import {
  DEFAULT_STRENGTH_SETS,
  isCardioExercise,
  isSetCounted,
  setDistance,
  setDuration,
  setVolume,
  type LastLogged,
} from "./useSetMetrics";
import { sessionGoalRows, type GoalGapKind, type WeekTally } from "./goalStreak";

/**
 * The numbers on a template tile and its sheet: what the last session held (the
 * tile), what the template's sessions usually amount to, when it was last
 * trained, and what the next one would add toward this week's goal (the sheet).
 * Only type imports and pure modules, so the self-check can bundle and run this
 * outside Vite.
 */

export type TemplateKind = "strength" | "cardio" | "mixed";

/** The averages cover this many of the newest sessions from the template. */
export const AVERAGE_OVER = 8;

/** What the tile needs from the exercise library for one exercise id. */
export type LibraryEntry = { category: string; trackingType: ExerciseTrackingType };

// Same name as Kondisjon in muscle-groups.json; kept local so this file stays free of JSON imports.
const CARDIO_GROUP = "Kondisjon";

// ---------------------------------------------------------------------------
// History — what the template's sessions held
// ---------------------------------------------------------------------------

/** What one session held, over its counted sets. */
export interface SessionSummary {
  /** null: the session held no counted set. */
  kind: TemplateKind | null;
  volumeKg: number;
  cardioSeconds: number;
  cardioMetres: number;
}

export interface TemplateHistory {
  /** Completed sessions from the template. */
  count: number;
  /** The newest of them. */
  lastDate: Date;
  /** What the newest of them held — the figure on the home-page tile. */
  last: SessionSummary;
  /** What the last AVERAGE_OVER sessions held; null if none of them held a counted set. */
  kind: TemplateKind | null;
  /** Mean per session of the volume over counted sets, in kg. */
  avgVolumeKg: number;
  /** Mean session duration, in minutes. */
  avgMinutes: number;
  /** Mean active cardio time per session, in seconds. */
  avgCardioSeconds: number;
  /** Mean cardio distance per session, in metres. */
  avgCardioMetres: number;
}

const mean = (values: number[]): number => (values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length);

const kindOf = (strength: boolean, cardio: boolean): TemplateKind | null =>
  strength && cardio ? "mixed" : cardio ? "cardio" : strength ? "strength" : null;

/** One pass over the sessions; only templates with at least one completed session get an entry. */
export const templateHistories = (sessions: WorkoutSession[]): Map<string, TemplateHistory> => {
  const byTemplate = new Map<string, WorkoutSession[]>();
  for (const session of sessions) {
    if (!session.isCompleted || !session.templateId) continue;
    const list = byTemplate.get(session.templateId);
    if (list) list.push(session);
    else byTemplate.set(session.templateId, [session]);
  }

  const result = new Map<string, TemplateHistory>();
  byTemplate.forEach((list, templateId) => {
    const newest = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recent = newest.slice(0, AVERAGE_OVER);

    // Newest first, so summaries[0] is the last session.
    const summaries: SessionSummary[] = recent.map((session) => {
      let strength = false;
      let cardio = false;
      let volumeKg = 0;
      let cardioSeconds = 0;
      let cardioMetres = 0;
      for (const exercise of session.exercises ?? []) {
        const isCardio = isCardioExercise(exercise);
        for (const set of exercise.sets ?? []) {
          if (!isSetCounted(exercise, set)) continue;
          if (isCardio) cardio = true;
          else strength = true;
          volumeKg += setVolume(exercise, set);
          cardioSeconds += setDuration(exercise, set);
          cardioMetres += setDistance(exercise, set);
        }
      }
      return { kind: kindOf(strength, cardio), volumeKg, cardioSeconds, cardioMetres };
    });

    const kinds = summaries.map((summary) => summary.kind);
    const anyStrength = kinds.some((kind) => kind === "strength" || kind === "mixed");
    const anyCardio = kinds.some((kind) => kind === "cardio" || kind === "mixed");

    result.set(templateId, {
      count: list.length,
      lastDate: new Date(newest[0].date),
      last: summaries[0],
      kind: kindOf(anyStrength, anyCardio),
      avgVolumeKg: mean(summaries.map((summary) => summary.volumeKg)),
      avgMinutes: mean(recent.map((session) => Number(session.duration) || 0)),
      avgCardioSeconds: mean(summaries.map((summary) => summary.cardioSeconds)),
      avgCardioMetres: mean(summaries.map((summary) => summary.cardioMetres)),
    });
  });
  return result;
};

/**
 * What the template is by its exercises as they are now — for a template with
 * no sessions yet. null while the library isn't loaded; unresolved ids are ignored.
 */
export const templateKindFromLibrary = (template: WorkoutTemplate, index: Map<number, LibraryEntry>): TemplateKind | null => {
  if (index.size === 0) return null;
  let strength = 0;
  let cardio = 0;
  for (const exercise of template.exercises) {
    const entry = index.get(Number(exercise.exerciseId));
    if (!entry) continue;
    if (entry.trackingType === "cardio") cardio += 1;
    else strength += 1;
  }
  if (cardio > 0 && strength === 0) return "cardio";
  return cardio > 0 ? "mixed" : "strength";
};

/**
 * Placeholder rows for the goal part while the library loads: never fewer than
 * the rows that can come, so nothing below is pushed down when they do. Strength
 * rows are at most one per exercise and per target; both cardio rows can come
 * from a single exercise. `kind` comes from the sessions (known before the
 * library), and rules out the side the template hasn't trained.
 */
export const pendingGoalRows = (exerciseCount: number, strengthTargets: number, cardioTargets: number, kind: TemplateKind | null): number => {
  const strength = kind === "cardio" ? 0 : Math.min(exerciseCount, strengthTargets);
  const cardio = kind === "strength" ? 0 : cardioTargets;
  return strength + cardio;
};

// ---------------------------------------------------------------------------
// "Sist trent"
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const weekdayFormat = new Intl.DateTimeFormat("no-NO", { weekday: "long" });
const dateFormat = new Intl.DateTimeFormat("no-NO", { day: "numeric", month: "short" });

/** "i dag", "i går", the weekday within the last week ("mandag"), else the date ("4. nov."). Calendar days, local time. */
export const lastTrainedLabel = (date: Date, now: Date): string => {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Round: a DST change makes one day 23 or 25 hours long.
  const daysAgo = Math.round((today.getTime() - day.getTime()) / MS_PER_DAY);
  if (daysAgo <= 0) return "i dag";
  if (daysAgo === 1) return "i går";
  if (daysAgo < 7) return weekdayFormat.format(date);
  return dateFormat.format(date);
};

// ---------------------------------------------------------------------------
// The next session — and what it adds toward this week's goal
// ---------------------------------------------------------------------------

export interface TemplateEstimate {
  /** The session the template would start as: sets per group, cardio from last time. */
  tally: WeekTally;
  /** Strength muscle groups in the order the template first trains them. */
  groups: string[];
  hasCardio: boolean;
  /** Sum of the strength sets the session starts with. */
  strengthSets: number;
}

/**
 * A strength exercise starts with as many sets as were counted last time, else
 * DEFAULT_STRENGTH_SETS (the rule of `startingSetCount`); a cardio exercise is
 * counted as last time's time and distance, or nothing. Ids the library can't
 * resolve are skipped.
 */
export const templateEstimate = (
  template: WorkoutTemplate,
  index: Map<number, LibraryEntry>,
  lastLogged: Map<number, LastLogged>,
): TemplateEstimate => {
  const tally: WeekTally = { setsByGroup: {}, cardioSeconds: 0, cardioMetres: 0 };
  const groups: string[] = [];
  let hasCardio = false;
  let strengthSets = 0;

  for (const { exerciseId } of template.exercises) {
    const id = Number(exerciseId);
    const entry = index.get(id);
    if (!entry) continue;
    const last = lastLogged.get(id)?.exercise;

    if (entry.trackingType === "cardio") {
      hasCardio = true;
      for (const set of last?.sets ?? []) {
        if (!last || !isSetCounted(last, set)) continue;
        tally.cardioSeconds += setDuration(last, set);
        tally.cardioMetres += setDistance(last, set);
      }
      continue;
    }

    const sets = last ? last.sets.filter((set) => isSetCounted(last, set)).length : DEFAULT_STRENGTH_SETS;
    strengthSets += sets;
    if (entry.category === CARDIO_GROUP) continue;
    tally.setsByGroup[entry.category] = (tally.setsByGroup[entry.category] ?? 0) + sets;
    if (!groups.includes(entry.category)) groups.push(entry.category);
  }

  return { tally, groups, hasCardio, strengthSets };
};

export interface TemplateGoalRow {
  name: string;
  kind: GoalGapKind;
  /** This week so far, before the session. */
  done: number;
  target: number;
  /** Already reached before the session — what the ✓ means. */
  metNow: boolean;
  /** What the session adds toward what's left; never past the target. */
  add: number;
}

export interface TemplateGoalPlan {
  rows: TemplateGoalRow[];
  addSets: number;
  addMinutes: number;
  addKm: number;
  allMetNow: boolean;
  /** "+9 sett mot målet", "+38 min · +6,2 km", "✓ Nådd denne uken" — or null when there's nothing to say. */
  summary: string | null;
}

const kmFormat = new Intl.NumberFormat("no-NO", { maximumFractionDigits: 1 });
const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * The template's goal rows, by the same rule as the live session's
 * (`sessionGoalRows`). null when there are no rows: no goals, or no group the
 * template trains has a target.
 */
export const templateGoalPlan = (estimate: TemplateEstimate, week: WeekTally, goals: TrainingGoals): TemplateGoalPlan | null => {
  const sessionRows = sessionGoalRows(week, estimate.tally, estimate.groups, estimate.hasCardio, goals);
  if (sessionRows.length === 0) return null;

  const rows: TemplateGoalRow[] = sessionRows.map((row) => {
    const added = row.todayShare * row.target;
    return {
      name: row.name,
      kind: row.kind,
      done: row.before,
      target: row.target,
      metNow: row.before >= row.target,
      add: row.kind === "km" ? round1(added) : Math.round(added),
    };
  });

  const sumOf = (kind: GoalGapKind) => rows.filter((row) => row.kind === kind).reduce((sum, row) => sum + row.add, 0);
  const addSets = sumOf("strength");
  const addMinutes = sumOf("minutes");
  const addKm = round1(sumOf("km"));
  const allMetNow = rows.every((row) => row.metNow);

  const parts: string[] = [];
  if (addSets > 0) parts.push(`+${addSets} sett`);
  if (addMinutes > 0) parts.push(`+${addMinutes} min`);
  if (addKm > 0) parts.push(`+${kmFormat.format(addKm)} km`);

  let summary: string | null = null;
  if (parts.length === 1 && addSets > 0) summary = `${parts[0]} mot målet`;
  else if (parts.length > 0) summary = parts.join(" · ");
  else if (allMetNow) summary = "✓ Nådd denne uken";

  return { rows, addSets, addMinutes, addKm, allMetNow, summary };
};
