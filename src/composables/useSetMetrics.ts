import type { ExerciseTrackingType, WeightUnit } from "@/types/workout";

/**
 * Single source of truth for how the two kinds of exercise are measured.
 *
 * Strength and cardio disagree on what makes a set "done" and on whether it
 * contributes volume, and those rules are read from a dozen places — the active
 * session, the week view, session details, the stats page. Keeping them here
 * stops the definitions drifting apart.
 */

/** Anything with sets: a session exercise, or a template entry. */
type ExerciseLike = { trackingType?: ExerciseTrackingType | null } | null | undefined;
type SetLike =
  | { weight?: unknown; reps?: unknown; duration?: unknown; distance?: unknown; weightUnit?: unknown; withBodyweight?: unknown; bodyweight?: unknown }
  | null
  | undefined;

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Sessions logged before cardio support carry no trackingType at all, and every
 * one of those is strength — so an absent value must mean strength, never
 * "unknown".
 */
export const trackingTypeOf = (exercise: ExerciseLike): ExerciseTrackingType =>
  exercise?.trackingType === "cardio" ? "cardio" : "strength";

export const isCardioExercise = (exercise: ExerciseLike): boolean => trackingTypeOf(exercise) === "cardio";

export const LBS_TO_KG = 0.45359237;

/** Sets logged before units existed have none, and all of those were kg. */
export const weightUnitOf = (set: SetLike): WeightUnit => (set?.weightUnit === "lbs" ? "lbs" : "kg");

/**
 * Body weight is part of the load. `weightUnit: "bodyweight"` is how the first
 * uncommitted build stored "kg + body weight" — still read so test sessions stay right.
 */
export const hasBodyweight = (set: SetLike): boolean => set?.withBodyweight === true || set?.weightUnit === "bodyweight";

/**
 * A strength set is logged once it has reps and a weight — except on body
 * weight, where pull-ups with no extra load are a full set.
 */
export const isStrengthSetLogged = (set: SetLike): boolean => num(set?.reps) > 0 && (hasBodyweight(set) || num(set?.weight) > 0);

/**
 * A cardio set is logged as soon as *either* field is filled in — a 10 minute
 * warm-up has no distance, and a distance can be logged without a stopwatch.
 */
export const isCardioSetLogged = (set: SetLike): boolean => num(set?.duration) > 0 || num(set?.distance) > 0;

export const isSetLogged = (exercise: ExerciseLike, set: SetLike): boolean =>
  isCardioExercise(exercise) ? isCardioSetLogged(set) : isStrengthSetLogged(set);

/** Counts only sets that are both marked complete and actually filled in. */
export const isSetCounted = (exercise: ExerciseLike, set: SetLike & { isCompleted?: unknown }): boolean =>
  Boolean(set?.isCompleted) && isSetLogged(exercise, set);

/** The weight on the bar or machine, in kg — body weight not included. */
const typedKg = (set: SetLike): number => (weightUnitOf(set) === "lbs" ? num(set?.weight) * LBS_TO_KG : num(set?.weight));

/** Everything moved, in kg: lbs converted, body weight added. What volume is built on. */
export const setLoadKg = (exercise: ExerciseLike, set: SetLike): number => {
  if (isCardioExercise(exercise)) return 0;
  return typedKg(set) + (hasBodyweight(set) ? num(set?.bodyweight) : 0);
};

/**
 * The kg that progress is measured in — heaviest set, PRs, 1RM, next-time hints.
 * Body weight sets count only the extra load, so they line up with the sets
 * logged as "10 kg" before units existed.
 */
export const setProgressKg = (exercise: ExerciseLike, set: SetLike): number => (isCardioExercise(exercise) ? 0 : typedKg(set));

/** Lifted volume in kg. Cardio contributes none — it isn't measured in kilos. */
export const setVolume = (exercise: ExerciseLike, set: SetLike): number => setLoadKg(exercise, set) * num(set?.reps);

/** Reps, for the metrics that average over them. Cardio has none. */
export const setReps = (exercise: ExerciseLike, set: SetLike): number =>
  isCardioExercise(exercise) ? 0 : num(set?.reps);

export const setDuration = (exercise: ExerciseLike, set: SetLike): number =>
  isCardioExercise(exercise) ? num(set?.duration) : 0;

export const setDistance = (exercise: ExerciseLike, set: SetLike): number =>
  isCardioExercise(exercise) ? num(set?.distance) : 0;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Seconds → "4:05" (or "1:04:05" once past an hour). */
export const formatDuration = (seconds: number): string => {
  const total = Math.max(0, Math.round(num(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

/** Metres → "5,20 km" above a kilometre, "800 m" below it. */
export const formatDistance = (metres: number): string => {
  const m = Math.max(0, Math.round(num(metres)));
  if (m === 0) return "–";
  if (m < 1000) return `${m} m`;
  return `${new Intl.NumberFormat("no-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m / 1000)} km`;
};

/** A strength set's weight in kg, split for layouts that set the unit in smaller type. */
export const setWeightParts = (set: SetLike): { value: string; unit: string } => {
  const kg = typedKg(set).toLocaleString("no-NO", { maximumFractionDigits: weightUnitOf(set) === "lbs" ? 1 : 2 });
  if (!hasBodyweight(set)) return { value: kg, unit: "kg" };
  return num(set?.weight) > 0 ? { value: `KV + ${kg}`, unit: "kg" } : { value: "KV", unit: "" };
};

/** A strength set's weight in kg for lists: "77,5 kg", "45,4 kg" (from lbs), "KV + 10 kg", "KV". */
export const setWeightText = (set: SetLike): string => {
  const { value, unit } = setWeightParts(set);
  return unit ? `${value} ${unit}` : value;
};

/** Pace as "5:30 /km", or null when it can't be derived. */
export const formatPace = (seconds: number, metres: number): string | null => {
  const s = num(seconds);
  const m = num(metres);
  if (s <= 0 || m <= 0) return null;
  return `${formatDuration((s / m) * 1000)} /km`;
};
