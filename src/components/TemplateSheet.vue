<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from "vue";
  import { useHybridData } from "@/composables/useHybridData";
  import { useSheetDrag } from "@/composables/useSheetDrag";
  import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
  import { isCardioExercise, isSetCounted, lastLoggedByExercise } from "@/composables/useSetMetrics";
  import { templateColorOf } from "@/composables/templateColors";
  import { groupTemplateExercises } from "@/composables/templateGroups";
  import { MUSCLE_GROUP_COLORS } from "@/composables/useTrainingGoals";
  import { formatTotalTime } from "@/composables/useCardioActivities";
  import type { TemplateGoalRow } from "@/composables/templateStats";
  import type { TemplateTileStats } from "@/composables/useTemplateStats";
  import type { WorkoutTemplate } from "@/types/workout";

  /**
   * Bottom sheet for a template on the home page: its usual numbers, what it
   * adds toward this week's goal, its exercises, and the way to start or edit
   * it. Open while `template` is set.
   */
  const props = defineProps<{
    template: WorkoutTemplate | null;
    stats: TemplateTileStats | undefined;
    /** True while another session is active: only one can run at a time. */
    startDisabled: boolean;
  }>();

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "start", templateId: string): void;
  }>();

  const workoutData = useHybridData();

  const OTHER_COLOR = "#475569";
  const CARDIO_COLOR = "#06b6d4";

  const kgFormat = new Intl.NumberFormat("no-NO");
  const kmFormat = new Intl.NumberFormat("no-NO", { maximumFractionDigits: 1 });

  const color = computed(() => templateColorOf(props.template));

  const meta = computed(() => {
    const count = props.template?.exercises.length ?? 0;
    const sets = props.stats?.estimate?.strengthSets ?? 0;
    return `${count} ${count === 1 ? "øvelse" : "øvelser"}${sets > 0 ? ` · ${sets} sett` : ""}`;
  });

  /** Four key figures: kilos for strength (and mixed), time and distance for cardio. */
  const facts = computed<{ label: string; value: string; unit: string }[]>(() => {
    const stats = props.stats;
    const history = stats?.history ?? null;
    const lastTrained = { label: "Sist trent", value: stats?.lastLabel ?? "–", unit: "" };
    const count = { label: "Økter", value: String(history?.count ?? 0), unit: "" };

    if (stats?.kind === "cardio") {
      const km = history ? history.avgCardioMetres / 1000 : 0;
      return [
        { label: "Snitt tid", value: history ? formatTotalTime(history.avgCardioSeconds) : "–", unit: "" },
        { label: "Snitt distanse", value: km > 0 ? kmFormat.format(km) : "–", unit: km > 0 ? "km" : "" },
        lastTrained,
        count,
      ];
    }
    return [
      { label: "Snitt volum", value: history ? kgFormat.format(Math.round(history.avgVolumeKg / 10) * 10) : "–", unit: history ? "kg" : "" },
      { label: "Snitt tid", value: history ? formatTotalTime(history.avgMinutes * 60) : "–", unit: "" },
      lastTrained,
      count,
    ];
  });

  const goal = computed(() => props.stats?.goal ?? null);

  const rowColor = (row: TemplateGoalRow): string => (row.kind === "strength" ? (MUSCLE_GROUP_COLORS[row.name] ?? OTHER_COLOR) : CARDIO_COLOR);
  const formatValue = (row: TemplateGoalRow, value: number): string => (row.kind === "km" ? kmFormat.format(value) : String(value));
  const GOAL_UNIT: Record<TemplateGoalRow["kind"], string> = { strength: "", minutes: " min", km: " km" };

  // ---------------------------------------------------------------------------
  // Exercises — grouped by muscle group for display only; the session keeps the template's order
  // ---------------------------------------------------------------------------

  const exercisesReady = computed(() => workoutData.exerciseIndex.value.size > 0);
  const lookup = (exerciseId: number) => workoutData.exerciseIndex.value.get(Number(exerciseId));
  const groupColor = (group: string): string => MUSCLE_GROUP_COLORS[group] ?? OTHER_COLOR;

  const groups = computed(() =>
    props.template ? groupTemplateExercises(props.template.exercises, (id) => lookup(id)?.category) : [],
  );

  // Built only while the sheet is open — one pass over the history, not one per exercise.
  const lastLogged = computed(() => (props.template ? lastLoggedByExercise(workoutData.sessions.value) : null));

  const exerciseName = (exerciseId: number, storedName: string): string => lookup(exerciseId)?.name ?? storedName;

  /** «4 sett» from last time for strength; nothing for cardio or an exercise never logged. */
  const lastSetsLabel = (exerciseId: number): string => {
    if (lookup(exerciseId)?.trackingType === "cardio") return "";
    const last = lastLogged.value?.get(Number(exerciseId));
    if (!last || isCardioExercise(last.exercise)) return "";
    const sets = last.exercise.sets.filter((set) => isSetCounted(last.exercise, set)).length;
    return `${sets} sett`;
  };

  // Pull down by the handle or the header to close
  const panelEl = ref<HTMLElement | null>(null);
  const { panelStyle, backdropStyle, onGrabPointerDown, onGrabClickCapture } = useSheetDrag({
    panelEl,
    isOpen: () => props.template !== null,
    onClose: () => emit("close"),
  });

  // Nothing behind the sheet scrolls while it's open
  useBodyScrollLock(() => props.template !== null);

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && props.template) emit("close");
  };

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="tpl-sheet">
      <div v-if="template" class="tpl-sheet" role="dialog" aria-modal="true" :aria-label="template.name">
        <div class="tpl-sheet__backdrop" :style="backdropStyle" @click="emit('close')"></div>

        <div ref="panelEl" class="tpl-sheet__panel" :style="[{ '--tpl-color': color }, panelStyle]">
          <!-- The top (handle and header) pulls the sheet down; the click that ends a pull is stopped here -->
          <div class="tpl-sheet__grab" @pointerdown="onGrabPointerDown" @click.capture="onGrabClickCapture">
            <!-- The visible bar is 4px; the whole width of the top closes the sheet -->
            <div class="tpl-sheet__handle" role="button" tabindex="0" aria-label="Lukk" @click="emit('close')" @keydown.enter="emit('close')"></div>

            <header class="tpl-sheet__head">
              <div class="tpl-sheet__heading">
                <h2 class="tpl-sheet__title">
                  <span class="tpl-sheet__color" aria-hidden="true"></span>
                  <span class="tpl-sheet__name">{{ template.name }}</span>
                </h2>
                <p class="tpl-sheet__meta">{{ meta }}</p>
              </div>
              <router-link :to="`/template/edit/${template.id}`" class="tpl-sheet__edit" title="Rediger mal" aria-label="Rediger mal">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </router-link>
            </header>
          </div>

          <dl class="tpl-sheet__facts">
            <div v-for="fact in facts" :key="fact.label">
              <dt class="tpl-sheet__fact-label">{{ fact.label }}</dt>
              <dd class="tpl-sheet__fact-value">
                {{ fact.value }}<span v-if="fact.unit" class="tpl-sheet__unit">{{ fact.unit }}</span>
              </dd>
            </div>
          </dl>

          <!-- This week: placeholder until the library is loaded, nothing without goals -->
          <section v-if="stats?.goalPending" class="tpl-sheet__section" aria-hidden="true">
            <div class="tpl-sheet__section-head">
              <h3 class="tpl-sheet__section-title">Denne uken</h3>
            </div>
            <div v-for="i in stats.goalPendingRows" :key="i" class="tpl-sheet__goal-row">
              <span class="tpl-sheet__dot skeleton skeleton--circle"></span>
              <span class="tpl-sheet__goal-name"><span class="tpl-sheet__ph skeleton w-16"></span></span>
              <span class="tpl-sheet__goal-value"><span class="tpl-sheet__ph skeleton w-10"></span></span>
            </div>
          </section>

          <section v-else-if="goal" class="tpl-sheet__section">
            <div class="tpl-sheet__section-head">
              <h3 class="tpl-sheet__section-title">Denne uken</h3>
              <span v-if="goal.summary" :class="['tpl-sheet__summary', { 'tpl-sheet__summary--met': goal.summary.startsWith('✓') }]">
                {{ goal.summary }}
              </span>
            </div>
            <div v-for="row in goal.rows" :key="row.kind + row.name" :class="['tpl-sheet__goal-row', { 'tpl-sheet__goal-row--met': row.metNow }]">
              <span class="tpl-sheet__dot" :style="{ background: rowColor(row) }" aria-hidden="true"></span>
              <span class="tpl-sheet__goal-name">{{ row.name }}</span>
              <span class="tpl-sheet__goal-value">
                <strong>{{ formatValue(row, row.done) }}</strong>/{{ formatValue(row, row.target) }}{{ GOAL_UNIT[row.kind] }}
              </span>
              <span class="tpl-sheet__goal-add">
                <template v-if="row.metNow">✓ nådd</template>
                <template v-else-if="row.add > 0">+{{ formatValue(row, row.add) }}</template>
              </span>
            </div>
          </section>

          <section class="tpl-sheet__section">
            <!-- Grouping needs the exercise library; until it's loaded, the stored names in template order -->
            <ul v-if="!exercisesReady" class="tpl-sheet__list">
              <li v-for="(exercise, i) in template.exercises" :key="`${exercise.exerciseId}-${i}`" class="tpl-sheet__ex tpl-sheet__ex--plain">
                <span class="tpl-sheet__ex-name">{{ exercise.name }}</span>
              </li>
            </ul>

            <template v-else>
              <div v-for="group in groups" :key="group.group" class="tpl-sheet__group">
                <h4 class="tpl-sheet__group-title">
                  <span class="tpl-sheet__dot" :style="{ background: groupColor(group.group) }" aria-hidden="true"></span>
                  {{ group.group }}
                </h4>
                <ul class="tpl-sheet__list">
                  <li v-for="(exercise, i) in group.exercises" :key="`${exercise.exerciseId}-${i}`" class="tpl-sheet__ex">
                    <span class="tpl-sheet__ex-name">{{ exerciseName(exercise.exerciseId, exercise.name) }}</span>
                    <span v-if="lastSetsLabel(exercise.exerciseId)" class="tpl-sheet__ex-sets">{{ lastSetsLabel(exercise.exerciseId) }}</span>
                  </li>
                </ul>
              </div>
            </template>
          </section>

          <button
            type="button"
            class="btn-primary tpl-sheet__go"
            :disabled="startDisabled"
            :title="startDisabled ? 'Du har allerede en aktiv økt. Fullfør den først.' : 'Start økt'"
            @click="emit('start', template.id)">
            <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2.5 1.4v9.2L10.4 6z" /></svg>
            Start økt
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .tpl-sheet {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .tpl-sheet__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
  }

  /* Full width on a phone; a readable column on a wide screen */
  .tpl-sheet__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 40rem;
    max-height: 88dvh;
    margin: 0 auto;
    padding: 0 1.125rem calc(1.25rem + env(safe-area-inset-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
    background: #1a2233;
    border-top: 1px solid #2d3a4f;
    border-radius: 1.25rem 1.25rem 0 0;
  }

  /* The top pulls the sheet down: the browser mustn't claim the gesture for scrolling */
  .tpl-sheet__grab {
    touch-action: none;
  }

  .tpl-sheet__handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.5rem;
    cursor: pointer;
  }

  .tpl-sheet__handle::before {
    content: "";
    width: 2.25rem;
    height: 0.25rem;
    border-radius: 999px;
    background: #3d5068;
  }

  .tpl-sheet__head {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .tpl-sheet__heading {
    flex: 1;
    min-width: 0;
  }

  .tpl-sheet__title {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }

  .tpl-sheet__color {
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--tpl-color);
  }

  .tpl-sheet__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Lines up under the name: 0.625rem dot + 0.625rem gap */
  .tpl-sheet__meta {
    margin: 0.1875rem 0 0 1.25rem;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  /* Icon button in the sheet's field colours */
  .tpl-sheet__edit {
    flex-shrink: 0;
    width: 2.75rem;
    height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    background: #243044;
    border: 1px solid #3d5068;
    border-radius: 0.75rem;
    transition:
      color 0.15s,
      background 0.15s;
  }

  .tpl-sheet__edit:active {
    color: #fff;
    background: #3d5068;
  }

  .tpl-sheet__edit svg {
    width: 1rem;
    height: 1rem;
  }

  .tpl-sheet__facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.875rem 1rem;
    margin: 1rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid #2d3a4f;
  }

  .tpl-sheet__fact-label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .tpl-sheet__fact-value {
    margin: 0.125rem 0 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }

  .tpl-sheet__unit {
    margin-left: 0.1875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .tpl-sheet__section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #2d3a4f;
  }

  .tpl-sheet__section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.375rem;
  }

  .tpl-sheet__section-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .tpl-sheet__summary {
    font-size: 0.75rem;
    font-weight: 600;
    color: #fdba74;
  }

  .tpl-sheet__summary--met {
    color: #4ade80;
  }

  .tpl-sheet__goal-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3125rem 0;
    font-size: 0.8125rem;
  }

  .tpl-sheet__dot {
    width: 0.375rem;
    height: 0.375rem;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .tpl-sheet__goal-name {
    flex: 1;
    min-width: 0;
    color: #e2e8f0;
  }

  .tpl-sheet__goal-value {
    flex-shrink: 0;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }

  .tpl-sheet__goal-value strong {
    font-weight: 600;
    color: #f1f5f9;
  }

  .tpl-sheet__goal-add {
    min-width: 3.25rem;
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-align: right;
    color: #fdba74;
    font-variant-numeric: tabular-nums;
  }

  .tpl-sheet__goal-row--met .tpl-sheet__goal-value,
  .tpl-sheet__goal-row--met .tpl-sheet__goal-value strong {
    color: #4ade80;
  }

  .tpl-sheet__goal-row--met .tpl-sheet__goal-add {
    font-weight: 500;
    color: #4ade80;
  }

  .tpl-sheet__group + .tpl-sheet__group {
    margin-top: 0.5rem;
  }

  .tpl-sheet__group-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0 0 0.125rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .tpl-sheet__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tpl-sheet__ex {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.1875rem 0 0.1875rem 0.75rem;
    font-size: 0.8125rem;
  }

  /* Before the library loads there are no group titles, so no indent under them */
  .tpl-sheet__ex--plain {
    padding-left: 0;
  }

  .tpl-sheet__ex-name {
    flex: 1;
    min-width: 0;
    color: #cbd5e1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tpl-sheet__ex-sets {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }

  .tpl-sheet__go {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1.25rem;
  }

  .tpl-sheet__go svg {
    width: 0.8125rem;
    height: 0.8125rem;
  }

  .tpl-sheet__ph {
    display: inline-block;
    height: 0.7em;
    vertical-align: middle;
  }

  /* Open and close: the backdrop fades, the panel slides — timing as the active session's sheet */
  .tpl-sheet-enter-active {
    transition: opacity 0.25s ease;
  }

  .tpl-sheet-leave-active {
    transition: opacity 0.2s ease;
  }

  .tpl-sheet-enter-from,
  .tpl-sheet-leave-to {
    opacity: 0;
  }

  .tpl-sheet-enter-active .tpl-sheet__panel {
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .tpl-sheet-leave-active .tpl-sheet__panel {
    transition: transform 0.22s cubic-bezier(0.4, 0, 1, 1);
  }

  .tpl-sheet-enter-from .tpl-sheet__panel,
  .tpl-sheet-leave-to .tpl-sheet__panel {
    transform: translateY(100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .tpl-sheet-enter-active,
    .tpl-sheet-leave-active,
    .tpl-sheet-enter-active .tpl-sheet__panel,
    .tpl-sheet-leave-active .tpl-sheet__panel,
    .tpl-sheet__edit {
      transition: none;
    }
  }
</style>
