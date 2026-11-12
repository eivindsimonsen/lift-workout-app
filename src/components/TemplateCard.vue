<script setup lang="ts">
  import { computed } from "vue";
  import { templateColorOf } from "@/composables/templateColors";
  import type { TemplateTileStats } from "@/composables/useTemplateStats";
  import type { WorkoutTemplate } from "@/types/workout";

  /**
   * A template on the home page: a tile with what its last session held. A tap
   * opens the sheet with the details — averages and what the next session adds
   * toward this week's goal — which is also where a session is started.
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

  /** «5 øvelser · i går» — one line on every tile; a template never run has no day. */
  const meta = computed(() => {
    const count = props.template.exercises.length;
    const last = props.stats?.lastLabel;
    return `${count} ${count === 1 ? "øvelse" : "øvelser"}${last ? ` · ${last}` : ""}`;
  });

  /**
   * The big number and its label, from the last session: kilos when it held
   * strength (cardio alongside is flagged, not added in), minutes when it was
   * only cardio. Needs only the sessions, so it never waits on the library.
   */
  const headline = computed<{ value: string; unit: string; label: string }>(() => {
    const history = props.stats?.history ?? null;
    if (history === null) return { value: "–", unit: "", label: "ikke trent ennå" };

    const last = history.last;
    if (last.kind === "cardio") {
      const km = last.cardioMetres / 1000;
      return {
        value: String(Math.round(last.cardioSeconds / 60)),
        unit: "min",
        label: km > 0 ? `siste økt · ${kmFormat.format(km)} km` : "siste økt",
      };
    }
    // The last session held no counted set: nothing to show from it.
    if (last.kind === null) return { value: "–", unit: "", label: "siste økt" };

    return {
      value: kgFormat.format(Math.round(last.volumeKg)),
      unit: "kg",
      label: last.kind === "mixed" ? "siste økt · + kondisjon" : "siste økt",
    };
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
      <span class="tpl-tile__id">
        <span class="tpl-tile__name">{{ template.name }}</span>
        <span class="tpl-tile__meta">{{ meta }}</span>
      </span>
    </div>

    <span class="tpl-tile__big">
      {{ headline.value }}<span v-if="headline.unit" class="tpl-tile__unit">{{ headline.unit }}</span>
    </span>
    <span class="tpl-tile__label">{{ headline.label }}</span>
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

  .tpl-tile__id {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
  }

  .tpl-tile__name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* One line on every tile, so the tiles line up; a narrow screen cuts the end rather than wrapping */
  .tpl-tile__meta {
    font-size: 0.75rem;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-tile__big {
    margin-top: 0.875rem;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .tpl-tile__unit {
    margin-left: 0.1875rem;
    font-size: 0.8125rem;
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
