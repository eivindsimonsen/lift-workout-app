<script setup lang="ts">
  import { computed } from "vue";
  import { templateColorOf } from "@/composables/templateColors";
  import { MUSCLE_GROUP_COLORS } from "@/composables/useTrainingGoals";
  import type { TemplateGoalRow } from "@/composables/templateStats";
  import type { TemplateTileStats } from "@/composables/useTemplateStats";
  import type { WorkoutTemplate } from "@/types/workout";

  /**
   * A template on the home page: a tile with what its sessions usually amount to
   * and what the next one adds toward this week's goal. A tap opens the sheet
   * with the details, which is also where a session is started.
   */
  const props = defineProps<{
    template: WorkoutTemplate;
    /** Built for every template by useTemplateStats; undefined only for a template it hasn't seen yet. */
    stats: TemplateTileStats | undefined;
  }>();

  const emit = defineEmits<{
    (e: "open", templateId: string): void;
  }>();

  const OTHER_COLOR = "#475569";
  const CARDIO_COLOR = "#06b6d4";

  const kgFormat = new Intl.NumberFormat("no-NO");
  const kmFormat = new Intl.NumberFormat("no-NO", { maximumFractionDigits: 1 });

  const color = computed(() => templateColorOf(props.template));

  /** «5 øvelser · i går» — one line on every tile; a template never run has no day. */
  const meta = computed(() => {
    const count = props.template.exercises.length;
    const last = props.stats?.lastLabel;
    return `${count} ${count === 1 ? "øvelse" : "øvelser"}${last ? ` · ${last}` : ""}`;
  });

  /** The big number and its label: kilos for strength, minutes for cardio — never both in one figure. */
  const headline = computed<{ value: string; unit: string; label: string | null }>(() => {
    const kind = props.stats?.kind ?? null;
    const history = props.stats?.history ?? null;
    const known = history !== null && history.kind !== null;

    if (history === null) return { value: "–", unit: "", label: "ikke trent ennå" };

    if (kind === "cardio") {
      const km = known ? history.avgCardioMetres / 1000 : 0;
      return {
        value: known ? String(Math.round(history.avgCardioSeconds / 60)) : "–",
        unit: known ? "min" : "",
        label: km > 0 ? `snitt tid · ${kmFormat.format(km)} km` : "snitt tid",
      };
    }
    return {
      value: known ? kgFormat.format(Math.round(history.avgVolumeKg / 10) * 10) : "–",
      unit: known ? "kg" : "",
      // null while the kind isn't known yet: the label is a placeholder until then
      label: kind === "mixed" ? "snitt volum · + kondisjon" : kind === "strength" ? "snitt volum" : null,
    };
  });

  const goal = computed(() => props.stats?.goal ?? null);

  // Captured once: the goal part fades in only when it replaces its placeholder.
  const fadeGoal = props.stats?.goalPending === true;

  const rowColor = (row: TemplateGoalRow): string => (row.kind === "strength" ? (MUSCLE_GROUP_COLORS[row.name] ?? OTHER_COLOR) : CARDIO_COLOR);
  const formatValue = (row: TemplateGoalRow, value: number): string => (row.kind === "km" ? kmFormat.format(value) : String(value));
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
    <span class="tpl-tile__label">
      <template v-if="headline.label">{{ headline.label }}</template>
      <span v-else class="tpl-tile__ph skeleton w-16" aria-hidden="true"></span>
    </span>

    <!-- Goal part: muscle groups need the exercise library, so a placeholder until it's loaded -->
    <div v-if="stats?.goalPending" class="tpl-tile__goal" aria-hidden="true">
      <span class="tpl-tile__sum"><span class="tpl-tile__ph skeleton w-24"></span></span>
      <span v-for="i in stats.goalPendingRows" :key="i" class="tpl-tile__row">
        <span class="tpl-tile__dot skeleton skeleton--circle"></span>
        <span class="tpl-tile__row-name"><span class="tpl-tile__ph skeleton w-12"></span></span>
        <span class="tpl-tile__row-value"><span class="tpl-tile__ph skeleton w-8"></span></span>
      </span>
    </div>

    <div v-else-if="goal" :class="['tpl-tile__goal', { 'fade-in': fadeGoal }]">
      <span v-if="goal.summary" :class="['tpl-tile__sum', { 'tpl-tile__sum--met': goal.allMetNow && goal.summary.startsWith('✓') }]">
        {{ goal.summary }}
      </span>
      <span v-for="row in goal.rows" :key="row.kind + row.name" :class="['tpl-tile__row', { 'tpl-tile__row--met': row.metNow }]">
        <span class="tpl-tile__dot" :style="{ background: rowColor(row) }" aria-hidden="true"></span>
        <span class="tpl-tile__row-name">{{ row.name }}</span>
        <span class="tpl-tile__row-value">
          <template v-if="row.metNow">✓ </template><strong>{{ formatValue(row, row.done) }}</strong>/{{ formatValue(row, row.target) }}
        </span>
      </span>
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

  .tpl-tile__goal {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    margin-top: 0.75rem;
    padding-top: 0.625rem;
    border-top: 1px solid #1f2937;
  }

  .tpl-tile__sum {
    margin-bottom: 0.125rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #fdba74;
  }

  .tpl-tile__sum--met {
    color: #4ade80;
  }

  .tpl-tile__row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.125rem 0;
    font-size: 0.75rem;
  }

  .tpl-tile__dot {
    width: 0.375rem;
    height: 0.375rem;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .tpl-tile__row-name {
    flex: 1;
    min-width: 0;
    color: #cbd5e1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-tile__row-value {
    flex-shrink: 0;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }

  .tpl-tile__row-value strong {
    font-weight: 600;
    color: #f1f5f9;
  }

  .tpl-tile__row--met .tpl-tile__row-value,
  .tpl-tile__row--met .tpl-tile__row-value strong {
    color: #4ade80;
  }

  /* Placeholder bars sit inside the real text elements, so each line keeps its height */
  .tpl-tile__ph {
    display: inline-block;
    height: 0.7em;
    vertical-align: middle;
  }

  @media (prefers-reduced-motion: reduce) {
    .tpl-tile {
      transition: none;
    }
  }
</style>
