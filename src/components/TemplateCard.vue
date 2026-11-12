<script setup lang="ts">
  import { computed } from "vue";
  import { templateColorOf } from "@/composables/templateColors";
  import type { TemplateHistory } from "@/composables/templateStats";
  import type { TemplateTileStats } from "@/composables/useTemplateStats";
  import type { WorkoutTemplate } from "@/types/workout";

  /**
   * A template on the home page: a tile with three figures — what its last
   * session held, when that was, and how many exercises it has. A tap opens the
   * sheet with the details — averages and what the next session adds toward
   * this week's goal — which is also where a session is started.
   */
  const props = defineProps<{
    template: WorkoutTemplate;
    /** Built for every template by useTemplateStats; undefined only for a template it hasn't seen yet. */
    stats: TemplateTileStats | undefined;
  }>();

  const emit = defineEmits<{
    (e: "open", templateId: string): void;
  }>();

  const kgFormat = new Intl.NumberFormat("no-NO");
  const kmFormat = new Intl.NumberFormat("no-NO", { maximumFractionDigits: 1 });

  const color = computed(() => templateColorOf(props.template));

  type Figure = { key: string; value: string; unit: string; label: string };

  /**
   * What the last session held: kilos when it held strength (cardio alongside
   * is flagged, not added in), minutes when it was only cardio. Needs only the
   * sessions, so it never waits on the library.
   */
  const lastSessionFigure = (history: TemplateHistory | null): Figure => {
    const figure = { key: "last", value: "–", unit: "", label: "siste økt" };
    // Never run, or the last session held no counted set: nothing to show from it.
    if (history === null || history.last.kind === null) return figure;

    const last = history.last;
    if (last.kind === "cardio") {
      const km = last.cardioMetres / 1000;
      return {
        ...figure,
        value: String(Math.round(last.cardioSeconds / 60)),
        unit: "min",
        label: km > 0 ? `siste økt · ${kmFormat.format(km)} km` : "siste økt",
      };
    }
    return {
      ...figure,
      value: kgFormat.format(Math.round(last.volumeKg)),
      unit: "kg",
      label: last.kind === "mixed" ? "siste økt · + kondisjon" : "siste økt",
    };
  };

  /** Three figures in one format, one under the other; every tile has all three, so the tiles line up. */
  const figures = computed<Figure[]>(() => {
    const count = props.template.exercises.length;
    return [
      { key: "exercises", value: String(count), unit: "", label: count === 1 ? "øvelse" : "øvelser" },
      { key: "when", value: props.stats?.lastLabel ?? "–", unit: "", label: "sist trent" },
      lastSessionFigure(props.stats?.history ?? null),
    ];
  });
</script>

<template>
  <article
    class="tpl-tile"
    :style="{ '--tpl-color': color }"
    role="button"
    tabindex="0"
    @click="emit('open', template.id)"
    @keydown.enter.self="emit('open', template.id)"
    @keydown.space.self.prevent="emit('open', template.id)">
    <div class="tpl-tile__top">
      <span class="tpl-tile__color" aria-hidden="true"></span>
      <span class="tpl-tile__name">{{ template.name }}</span>
    </div>

    <div class="tpl-tile__figures">
      <div v-for="figure in figures" :key="figure.key" class="tpl-tile__figure">
        <span class="tpl-tile__big">
          {{ figure.value }}<span v-if="figure.unit" class="tpl-tile__unit">{{ figure.unit }}</span>
        </span>
        <span class="tpl-tile__label">{{ figure.label }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
  .tpl-tile {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0.875rem 0.875rem 0.75rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 0.875rem;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .tpl-tile:active {
    border-color: #334155;
  }

  .tpl-tile:focus-visible {
    outline: 2px solid #f97316;
    outline-offset: 2px;
  }

  .tpl-tile__top {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    min-width: 0;
  }

  /* The template's colour: one dot before the name, centred on its first line */
  .tpl-tile__color {
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
    margin-top: 0.375rem;
    border-radius: 50%;
    background: var(--tpl-color);
  }

  .tpl-tile__name {
    min-width: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-tile__figures {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 0.75rem;
  }

  .tpl-tile__figure {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* One line each, so the tiles line up; a narrow screen cuts the end rather than wrapping */
  .tpl-tile__big {
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-tile__unit {
    margin-left: 0.1875rem;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0;
    color: #94a3b8;
  }

  .tpl-tile__label {
    margin-top: 0.1875rem;
    font-size: 0.6875rem;
    color: #64748b;
  }

  @media (prefers-reduced-motion: reduce) {
    .tpl-tile {
      transition: none;
    }
  }
</style>
