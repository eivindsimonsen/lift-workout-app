/**
 * The filter ticked on Øvelser: muscle groups, and «only starred» (exercises
 * used in a template). It's kept on the phone (localStorage, per user), so it
 * still applies after a look at an exercise and the next time the app opens,
 * until the user changes it. Same pattern as templateOrder.ts.
 */

const categoriesKey = (userId: string) => `lift-exercise-categories:${userId}`;
const starredKey = (userId: string) => `lift-exercise-starred:${userId}`;

/** The saved groups that still exist (`known`); empty when there are none or storage can't be read. */
export const loadExerciseCategories = (userId: string, known: string[]): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(categoriesKey(userId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === "string" && known.includes(name)) : [];
  } catch {
    return [];
  }
};

export const saveExerciseCategories = (userId: string, categories: string[]): void => {
  try {
    localStorage.setItem(categoriesKey(userId), JSON.stringify(categories));
  } catch {
    // Without storage the choice just isn't remembered.
  }
};

/** Whether «only starred» was ticked; false when unknown or storage can't be read. */
export const loadExerciseStarred = (userId: string): boolean => {
  try {
    return localStorage.getItem(starredKey(userId)) === "1";
  } catch {
    return false;
  }
};

export const saveExerciseStarred = (userId: string, starred: boolean): void => {
  try {
    localStorage.setItem(starredKey(userId), starred ? "1" : "0");
  } catch {
    // Without storage the choice just isn't remembered.
  }
};
