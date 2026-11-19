import type { WorkoutSession } from "@/types/workout";
import { AVERAGE_OVER } from "./templateStats";

/**
 * A session left running: completing it more than three hours after the start
 * asks how long the workout really was, instead of saving the whole stretch
 * (a session finished the next day would otherwise count a full day).
 */

export const LONG_SESSION_MINUTES = 180;

/** What the duration fields start at when the template has no usable history. */
export const FALLBACK_MINUTES = 60;

/** Whole minutes from `start` to `now`: the same figure for the threshold and the saved wall clock. */
export const minutesSince = (start: Date | string, now: number): number => Math.round((now - new Date(start).getTime()) / 60000);

export const isLongSession = (elapsedMinutes: number): boolean => elapsedMinutes > LONG_SESSION_MINUTES;

/**
 * Mean duration of the template's newest completed sessions, leaving out any
 * over the limit so an earlier forgotten session doesn't pull it up. Null when
 * there's nothing to go on.
 */
export const templateAverageMinutes = (sessions: WorkoutSession[], templateId: string | null | undefined): number | null => {
  if (!templateId) return null;
  const usable = sessions
    .filter((s) => s.isCompleted && s.templateId === templateId && s.duration > 0 && s.duration <= LONG_SESSION_MINUTES)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, AVERAGE_OVER);
  if (usable.length === 0) return null;
  return Math.round(usable.reduce((sum, s) => sum + s.duration, 0) / usable.length);
};

/** What the fields start at: the template's usual duration, but never less than the time already logged. */
export const suggestedMinutes = (averageMinutes: number | null, loggedSeconds: number): number =>
  Math.max(averageMinutes ?? FALLBACK_MINUTES, Math.round(loggedSeconds / 60));

/**
 * Stopwatch stints still running when the session is saved with an entered
 * duration share what's left of it after the time already banked, in order —
 * a clock left running on a forgotten session can't outlast the workout.
 */
export const capRunningStints = (stintSeconds: number[], bankedSeconds: number, overrideMinutes: number): number[] => {
  let left = Math.max(0, overrideMinutes * 60 - bankedSeconds);
  return stintSeconds.map((stint) => {
    const kept = Math.min(stint, left);
    left -= kept;
    return kept;
  });
};

const digitsOf = (text: string): number => parseInt(text.replace(/\D/g, ""), 10) || 0;

/** Hours and minutes as typed: digits only, minutes capped at 59, empty is 0. */
export const minutesFromFields = (hoursText: string, minutesText: string): number =>
  digitsOf(hoursText) * 60 + Math.min(59, digitsOf(minutesText));

const weekdayFormat = new Intl.DateTimeFormat("no-NO", { weekday: "long" });
const dateFormat = new Intl.DateTimeFormat("no-NO", { day: "numeric", month: "short" });

const startOfDay = (date: Date): number => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** «i dag kl. 08:05», «i går kl. 18:06», «søndag kl. 18:06» within the week, else «9. nov. kl. 18:06». */
export const startedLabel = (start: Date, now: Date): string => {
  // Rounded, so a DST change in between doesn't shift the day count
  const days = Math.round((startOfDay(now) - startOfDay(start)) / 86_400_000);
  const day = days <= 0 ? "i dag" : days === 1 ? "i går" : days < 7 ? weekdayFormat.format(start) : dateFormat.format(start);
  const clock = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
  return `${day} kl. ${clock}`;
};

/**
 * The duration to save: what the user entered, or the wall clock from the
 * start, but never less than the logged active time — a 90-minute match logged
 * afterwards took 90 minutes, not the one it took to type in.
 */
export const finalDurationMinutes = (wallClockMinutes: number, activeSeconds: number, overrideMinutes?: number): number =>
  Math.max(overrideMinutes ?? wallClockMinutes, Math.round(activeSeconds / 60));
