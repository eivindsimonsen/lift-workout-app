import type { WorkoutExercise, WorkoutSet } from "@/types/workout";
import { isSetLogged } from "./useSetMetrics";

/**
 * Stopwatch for cardio activities, where each set is a round.
 *
 * The clock lives in the data, not in a running interval: `duration` holds the
 * seconds already banked on a round, and `timerStartedAt` the moment its current
 * stint began. Elapsed time is always derived from the wall clock, so it stays
 * correct while the phone is locked, the PWA is suspended or the page reloads —
 * a PWA can't run code in the background, but it doesn't need to.
 *
 * Every action mutates the exercise in place, like the rest of the active
 * session does; callers persist afterwards.
 */

export type CardioTimerState = "idle" | "running" | "paused";

type SetLike = Pick<WorkoutSet, "duration" | "timerStartedAt"> | null | undefined;

export const isSetRunning = (set: SetLike): boolean => typeof set?.timerStartedAt === "number";

/** Seconds on a round right now, including a stint that is still running. */
export const liveSetSeconds = (set: SetLike, now: number): number => {
  const banked = Number(set?.duration) || 0;
  if (!isSetRunning(set)) return banked;
  return banked + Math.max(0, (now - (set!.timerStartedAt as number)) / 1000);
};

/** Seconds across every round of the activity right now. */
export const liveExerciseSeconds = (exercise: WorkoutExercise, now: number): number =>
  exercise.sets.reduce((sum, set) => sum + liveSetSeconds(set, now), 0);

export const isExerciseRunning = (exercise: WorkoutExercise): boolean => exercise.sets.some(isSetRunning);

/**
 * Idle until anything is logged, paused once something is — including time
 * entered by hand, so an activity logged afterwards can still be continued.
 */
export const cardioTimerState = (exercise: WorkoutExercise): CardioTimerState => {
  if (isExerciseRunning(exercise)) return "running";
  return exercise.sets.some((set) => isSetLogged(exercise, set)) ? "paused" : "idle";
};

const createRound = (exercise: WorkoutExercise): WorkoutSet => ({
  id: `set-${Date.now()}-${exercise.sets.length}`,
  reps: 0,
  weight: 0,
  duration: undefined,
  distance: undefined,
  isCompleted: false,
});

const syncCompletion = (exercise: WorkoutExercise, set: WorkoutSet) => {
  set.isCompleted = isSetLogged(exercise, set);
};

/** Folds a running stint into the round's banked seconds and stops it. */
const bank = (exercise: WorkoutExercise, set: WorkoutSet, now: number) => {
  if (!isSetRunning(set)) return;
  set.duration = Math.round(liveSetSeconds(set, now));
  set.timerStartedAt = undefined;
  syncCompletion(exercise, set);
};

const lastRound = (exercise: WorkoutExercise): WorkoutSet => {
  if (exercise.sets.length === 0) exercise.sets.push(createRound(exercise));
  return exercise.sets[exercise.sets.length - 1];
};

/** Starts the clock, or continues the last round after a pause. */
export const startOrResume = (exercise: WorkoutExercise, now: number) => {
  if (isExerciseRunning(exercise)) return;
  // Sessions started before the stopwatch existed open with three blank rounds;
  // starting fresh should leave one, not a stack of empty rows above the clock.
  if (cardioTimerState(exercise) === "idle") exercise.sets.splice(1);
  lastRound(exercise).timerStartedAt = now;
};

export const pauseTimer = (exercise: WorkoutExercise, now: number) => {
  exercise.sets.forEach((set) => bank(exercise, set, now));
};

/** Closes the running round and starts the next one without a gap. */
export const lapTimer = (exercise: WorkoutExercise, now: number) => {
  pauseTimer(exercise, now);
  const next = createRound(exercise);
  next.timerStartedAt = now;
  exercise.sets.push(next);
};

/**
 * Starts a fresh round after a pause — the interval pattern: run, pause through
 * the rest, start the next drag. Reuses a trailing empty round instead of
 * leaving it behind as a blank row.
 */
export const startNewRound = (exercise: WorkoutExercise, now: number) => {
  pauseTimer(exercise, now);
  const last = exercise.sets[exercise.sets.length - 1];
  const reusable = last && !isSetLogged(exercise, last) ? last : null;
  const round = reusable ?? createRound(exercise);
  if (!reusable) exercise.sets.push(round);
  round.timerStartedAt = now;
};

/** Adds an empty round for time entered by hand. */
export const addRound = (exercise: WorkoutExercise) => {
  exercise.sets.push(createRound(exercise));
};

export const setRoundSeconds = (exercise: WorkoutExercise, index: number, seconds: number) => {
  const set = exercise.sets[index];
  if (!set || isSetRunning(set)) return;
  set.duration = Math.max(0, Math.round(seconds)) || undefined;
  syncCompletion(exercise, set);
};

export const setRoundDistance = (exercise: WorkoutExercise, index: number, metres: number) => {
  const set = exercise.sets[index];
  if (!set) return;
  set.distance = Math.max(0, Math.round(metres)) || undefined;
  syncCompletion(exercise, set);
};

/** Big-clock format: "04:05", or "1:04:05" once past an hour. */
export const formatClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
};
