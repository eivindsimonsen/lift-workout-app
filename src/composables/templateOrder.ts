/**
 * The order of the templates on the home page, chosen by dragging. It's kept on
 * the phone (localStorage, per user): the app is used on one phone, and a new
 * phone or cleared app data simply falls back to the order templates were made in.
 * No imports, so the self-check can run this file directly in Node.
 */

const storageKey = (userId: string) => `lift-template-order:${userId}`;

/** Saved order first (ids no longer present are skipped), then the rest in the order given. Input not mutated. */
export const orderTemplates = <T extends { id: string }>(templates: T[], order: string[]): T[] => {
  const byId = new Map(templates.map((template) => [template.id, template]));
  const result: T[] = [];
  const placed = new Set<string>();

  for (const id of order) {
    const template = byId.get(id);
    if (!template || placed.has(id)) continue;
    result.push(template);
    placed.add(id);
  }
  for (const template of templates) {
    if (!placed.has(template.id)) result.push(template);
  }
  return result;
};

/** The saved order for the user; empty when there is none or storage can't be read. */
export const loadTemplateOrder = (userId: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

export const saveTemplateOrder = (userId: string, ids: string[]): void => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // Without storage the order just isn't remembered.
  }
};
