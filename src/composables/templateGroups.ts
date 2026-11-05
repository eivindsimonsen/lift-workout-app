/**
 * Groups a template's exercises by muscle group for display on the template card.
 * Display only: the template and the session keep the order set in the form.
 * No imports, so the self-check can run this file directly in Node.
 */

/** Group for exercise ids the library can't resolve. Always last. */
export const OTHER_GROUP = "Annet";

/**
 * Groups in the order they first appear in the template; exercises keep the
 * template's order within a group; unresolved ids go under OTHER_GROUP, last.
 */
export const groupTemplateExercises = <T extends { exerciseId: number }>(
  exercises: T[],
  categoryOf: (exerciseId: number) => string | undefined
): { group: string; exercises: T[] }[] => {
  const groups = new Map<string, T[]>();
  const other: T[] = [];

  for (const exercise of exercises) {
    const group = categoryOf(exercise.exerciseId);
    if (!group) {
      other.push(exercise);
      continue;
    }
    const list = groups.get(group);
    if (list) list.push(exercise);
    else groups.set(group, [exercise]);
  }

  const result = [...groups].map(([group, list]) => ({ group, exercises: list }));
  if (other.length > 0) result.push({ group: OTHER_GROUP, exercises: other });
  return result;
};
