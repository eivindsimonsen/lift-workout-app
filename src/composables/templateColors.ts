import muscleGroupsData from "@/data/muscle-groups.json";

/**
 * Colours a template can have. Templates and muscle groups share the same
 * colour codes, so the palette is read straight from muscle-groups.json.
 */
export const TEMPLATE_COLORS: string[] = muscleGroupsData.muscleGroups.map((group) => group.color);

/** Colour a new template starts with. */
export const DEFAULT_TEMPLATE_COLOR = "#f97316";

/** Grey for a template without a colour — and for sessions whose template was deleted. */
export const NO_TEMPLATE_COLOR = "#475569";

/** The template's colour, or grey when it has none or doesn't exist (deleted). */
export const templateColorOf = (template: { color?: string | null } | null | undefined): string =>
  template?.color || NO_TEMPLATE_COLOR;
