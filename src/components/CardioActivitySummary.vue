<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { computed } from "vue";
  import type { WorkoutExercise } from "@/types/workout";
  import { formatDistance, formatDuration, formatPace } from "@/composables/useSetMetrics";
  import { activityPace, formatEffort, summarizeCardioExercise } from "@/composables/useCardioActivities";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  /** One finished cardio activity, laid out the way a running app's summary is. */
  const props = defineProps<{
    exercise: WorkoutExercise;
  }>();

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const summary = computed(() => summarizeCardioExercise(props.exercise));
  const pace = computed(() => activityPace(summary.value.rounds));
  const effort = computed(() => {
    const n = Number(props.exercise.effort);
    return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null;
  });
  const note = computed(() => props.exercise.note?.trim() || null);

  const metrics = computed(() => {
    const items: Array<{ label: string; value: string }> = [];
    if (summary.value.metres > 0) items.push({ label: "Distanse", value: formatDistance(summary.value.metres) });
    if (pace.value) items.push({ label: "Snitt tempo", value: pace.value });
    if (summary.value.rounds.length > 1) items.push({ label: "Runder", value: String(summary.value.rounds.length) });
    return items;
  });

  /** Round bars are scaled to the longest round, so the shape of an interval set reads at a glance. */
  const rounds = computed(() => {
    const longest = Math.max(1, ...summary.value.rounds.map((r) => r.seconds));
    return summary.value.rounds.map((round, index) => ({
      index: index + 1,
      seconds: round.seconds,
      metres: round.metres,
      pace: formatPace(round.seconds, round.metres),
      width: Math.max(4, Math.round((round.seconds / longest) * 100)),
    }));
  });

  const showRoundDistance = computed(() => rounds.value.some((r) => r.metres > 0));
</script>

<template>
  <article class="act">
    <header class="act__head">
      <div class="act__title-block">
        <p class="act__eyebrow">
          <span class="act__dot"></span>
          Kondisjon
        </p>
        <h3 class="act__name">{{ exercise.name }}</h3>
      </div>
      <span v-if="effort" class="act__effort">{{ formatEffort(effort) }}</span>
    </header>

    <p class="act__hero">{{ formatDuration(summary.seconds) }}</p>
    <p class="act__hero-label">Aktiv tid</p>

    <dl v-if="metrics.length > 0" class="act__metrics">
      <div v-for="metric in metrics" :key="metric.label" class="act__metric">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>

    <p v-if="note" class="act__note">{{ note }}</p>

    <section v-if="rounds.length > 1" class="act__rounds" aria-label="Runder">
      <h4 class="act__rounds-title">Runder</h4>
      <div v-for="round in rounds" :key="round.index" class="act__round" :class="{ 'act__round--km': showRoundDistance }">
        <span class="act__round-num">{{ round.index }}</span>
        <span class="act__round-track">
          <span class="act__round-bar" :style="{ width: round.width + '%' }"></span>
        </span>
        <span class="act__round-time">{{ formatDuration(round.seconds) }}</span>
        <span v-if="showRoundDistance" class="act__round-km">
          {{ round.metres > 0 ? formatDistance(round.metres) : "–" }}
          <span v-if="round.pace" class="act__round-pace">{{ round.pace }}</span>
        </span>
      </div>
    </section>
  </article>
</template>

<style scoped>
  .act {
    padding: 1.25rem;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.75rem;
  }

  .act__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .act__title-block {
    min-width: 0;
  }

  .act__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .act__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #06b6d4;
  }

  .act__name {
    margin-top: 0.125rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .act__effort {
    flex-shrink: 0;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fdba74;
    background: #f9731618;
    border: 1px solid #f9731640;
    border-radius: 999px;
    white-space: nowrap;
  }

  .act__hero {
    margin-top: 1rem;
    font-size: 2.75rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .act__hero-label {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .act__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #334155;
  }

  .act__metric dt {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .act__metric dd {
    margin-top: 0.125rem;
    font-size: 1.125rem;
    font-weight: 700;
    color: #fff;
  }

  .act__note {
    margin-top: 1rem;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    line-height: 1.45;
    color: #cbd5e1;
    background: #0f172a;
    border-left: 2px solid #06b6d4;
    border-radius: 0 0.5rem 0.5rem 0;
    white-space: pre-line;
  }

  /* ── Rounds ──────────────────────────────────────────────────────────────── */

  .act__rounds {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid #334155;
  }

  .act__rounds-title {
    margin-bottom: 0.5rem;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .act__round {
    display: grid;
    grid-template-columns: 1.25rem 1fr 4rem;
    align-items: center;
    gap: 0.625rem;
    padding: 0.3125rem 0;
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
  }

  .act__round--km {
    grid-template-columns: 1.25rem 1fr 4rem 5.5rem;
  }

  .act__round-num {
    font-weight: 700;
    color: #64748b;
    text-align: center;
  }

  .act__round-track {
    height: 0.5rem;
    background: #0f172a;
    border-radius: 2px 4px 4px 2px;
    overflow: hidden;
  }

  /* Square at the start, 4px-rounded at the data end. */
  .act__round-bar {
    display: block;
    height: 100%;
    background: #06b6d4;
    border-radius: 0 4px 4px 0;
  }

  .act__round-time {
    font-weight: 600;
    color: #fff;
    text-align: right;
  }

  .act__round-km {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.2;
  }

  .act__round-pace {
    font-size: 0.6875rem;
    font-weight: 500;
    color: #94a3b8;
  }
</style>
