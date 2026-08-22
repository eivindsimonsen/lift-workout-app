import type { ExerciseTrackingType } from "@/types/workout";

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
type SetLike = { weight?: unknown; reps?: unknown; duration?: unknown; distance?: unknown } | null | undefined;

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

/** A strength set is logged once it has both reps and weight. */
export const isStrengthSetLogged = (set: SetLike): boolean => num(set?.weight) > 0 && num(set?.reps) > 0;

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

/** Lifted volume in kg. Cardio contributes none — it isn't measured in kilos. */
export const setVolume = (exercise: ExerciseLike, set: SetLike): number =>
  isCardioExercise(exercise) ? 0 : num(set?.weight) * num(set?.reps);

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

/** Pace as "5:30 /km", or null when it can't be derived. */
export const formatPace = (seconds: number, metres: number): string | null => {
  const s = num(seconds);
  const m = num(metres);
  if (s <= 0 || m <= 0) return null;
  return `${formatDuration((s / m) * 1000)} /km`;
};
