<script setup lang="ts">
  import { computed, ref } from "vue";
  import { useHybridData } from "@/composables/useHybridData";
  import { isCardioExercise, isSetCounted, lastLoggedByExercise } from "@/composables/useSetMetrics";
  import { templateColorOf } from "@/composables/templateColors";
  import { groupTemplateExercises, OTHER_GROUP } from "@/composables/templateGroups";
  import muscleGroupsData from "@/data/muscle-groups.json";
  import type { WorkoutTemplate } from "@/types/workout";

  /**
   * A template on the home page: a slim card with the template's colour as a dot
   * before the name, that opens to show its exercises grouped by muscle group
   * (display only — the session keeps the order set in the form).
   */
  const props = defineProps<{
    template: WorkoutTemplate;
    /** True while another session is active: only one can run at a time. */
    startDisabled: boolean;
  }>();

  const emit = defineEmits<{
    (e: "start", templateId: string): void;
  }>();

  const workoutData = useHybridData();

  const open = ref(false);

  const color = computed(() => templateColorOf(props.template));
  const exercisesReady = computed(() => workoutData.exerciseIndex.value.size > 0);

  const GROUP_COLORS = new Map(muscleGroupsData.muscleGroups.map((group) => [group.name, group.color]));
  const OTHER_COLOR = "#475569";
  const groupColor = (group: string): string => GROUP_COLORS.get(group) ?? OTHER_COLOR;

  const lookup = (exerciseId: number) => workoutData.exerciseIndex.value.get(Number(exerciseId));

  const groups = computed(() => groupTemplateExercises(props.template.exercises, (id) => lookup(id)?.category));

  /** One dot per muscle group the template trains; unresolved exercises add none. */
  const groupDots = computed(() => groups.value.filter((g) => g.group !== OTHER_GROUP).map((g) => groupColor(g.group)));

  const exerciseCount = computed(() => props.template.exercises.length);
  const exerciseCountLabel = computed(() => `${exerciseCount.value} ${exerciseCount.value === 1 ? "øvelse" : "øvelser"}`);

  // Built only while the card is open — one pass over the history, not one per exercise.
  const lastLogged = computed(() => (open.value ? lastLoggedByExercise(workoutData.sessions.value) : null));

  const exerciseName = (exerciseId: number, storedName: string): string => lookup(exerciseId)?.name ?? storedName;

  /** «4 sett» from last time for strength; nothing for cardio or an exercise never logged. */
  const lastSetsLabel = (exerciseId: number): string => {
    if (lookup(exerciseId)?.trackingType === "cardio") return "";
    const last = lastLogged.value?.get(Number(exerciseId));
    if (!last || isCardioExercise(last.exercise)) return "";
    const sets = last.exercise.sets.filter((set) => isSetCounted(last.exercise, set)).length;
    return `${sets} sett`;
  };
</script>

<template>
  <article class="tpl-card" :style="{ '--tpl-color': color }">
    <div class="tpl-card__head">
      <button type="button" class="tpl-card__toggle" :aria-expanded="open" @click="open = !open">
        <span class="tpl-card__color" aria-hidden="true"></span>
        <span class="tpl-card__body">
          <span class="tpl-card__name">{{ template.name }}</span>
          <span class="tpl-card__meta">
            <span>{{ exerciseCountLabel }}</span>
            <span v-if="!exercisesReady" class="tpl-card__dots" aria-hidden="true">
              <span v-for="i in 3" :key="i" class="tpl-card__dot skeleton skeleton--circle"></span>
            </span>
            <span v-else-if="groupDots.length > 0" class="tpl-card__dots" aria-hidden="true">
              <span v-for="(dot, i) in groupDots" :key="i" class="tpl-card__dot" :style="{ background: dot }"></span>
            </span>
          </span>
        </span>
        <svg class="tpl-card__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button
        type="button"
        class="tpl-card__start"
        :disabled="startDisabled"
        :aria-label="`Start ${template.name}`"
        :title="startDisabled ? 'Du har allerede en aktiv økt. Fullfør den først.' : 'Start økt'"
        @click="emit('start', template.id)">
        <span class="tpl-card__start-circle">
          <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2.5 1.4v9.2L10.4 6z" /></svg>
        </span>
      </button>
    </div>

    <div v-if="open" class="tpl-card__exp">
      <!-- Grouping needs the exercise library; until it's loaded, the stored names in template order -->
      <ul v-if="!exercisesReady" class="tpl-card__list">
        <li v-for="(exercise, i) in template.exercises" :key="`${exercise.exerciseId}-${i}`" class="tpl-card__ex tpl-card__ex--plain">
          <span class="tpl-card__ex-name">{{ exercise.name }}</span>
        </li>
      </ul>

      <template v-else>
        <section v-for="group in groups" :key="group.group" class="tpl-card__group">
          <h4 class="tpl-card__group-title">
            <span class="tpl-card__dot" :style="{ background: groupColor(group.group) }"></span>
            {{ group.group }}
          </h4>
          <ul class="tpl-card__list">
            <li v-for="(exercise, i) in group.exercises" :key="`${exercise.exerciseId}-${i}`" class="tpl-card__ex">
              <span class="tpl-card__ex-name">{{ exerciseName(exercise.exerciseId, exercise.name) }}</span>
              <span v-if="lastSetsLabel(exercise.exerciseId)" class="tpl-card__ex-sets">{{ lastSetsLabel(exercise.exerciseId) }}</span>
            </li>
          </ul>
        </section>
      </template>

      <router-link :to="`/template/edit/${template.id}`" class="tpl-card__edit">Rediger mal</router-link>
    </div>
  </article>
</template>

<style scoped>
  .tpl-card {
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 0.75rem;
  }

  .tpl-card__head {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-right: 0.5rem;
  }

  .tpl-card__toggle {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.25rem 0.625rem 1rem;
    text-align: left;
    background: none;
    border: 0;
    color: inherit;
  }

  /* The template's colour: one dot before the name */
  .tpl-card__color {
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--tpl-color);
  }

  .tpl-card__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .tpl-card__name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-card__meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .tpl-card__dots {
    display: inline-flex;
    gap: 0.1875rem;
  }

  .tpl-card__dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .tpl-card__chevron {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: #475569;
    transition: transform 0.2s;
  }

  .tpl-card__toggle[aria-expanded="true"] .tpl-card__chevron {
    transform: rotate(90deg);
  }

  /* 44px tap target around a 40px circle, toned in the template's colour */
  .tpl-card__start {
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 0;
    padding: 0;
  }

  .tpl-card__start-circle {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--tpl-color) 12.5%, transparent);
    color: var(--tpl-color);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tpl-card__start-circle svg {
    width: 0.875rem;
    height: 0.875rem;
    margin-left: 0.125rem;
  }

  .tpl-card__start:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  /* Lines up under the name: 1rem padding + 0.625rem dot + 0.75rem gap */
  .tpl-card__exp {
    margin: 0 1rem 0 2.375rem;
    padding: 0.5rem 0 0.75rem;
    border-top: 1px solid #1f2937;
  }

  .tpl-card__group + .tpl-card__group {
    margin-top: 0.5rem;
  }

  .tpl-card__group-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0 0 0.125rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
  }

  .tpl-card__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tpl-card__ex {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.1875rem 0 0.1875rem 0.75rem;
    font-size: 0.8125rem;
  }

  .tpl-card__ex-name {
    flex: 1;
    min-width: 0;
    color: #cbd5e1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-card__ex-sets {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }

  /* Before the library loads there are no group titles, so no indent under them */
  .tpl-card__ex--plain {
    padding-left: 0;
  }

  /* 44px tall to tap, like every other control */
  .tpl-card__edit {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  @media (prefers-reduced-motion: reduce) {
    .tpl-card__chevron {
      transition: none;
    }
  }
</style>
