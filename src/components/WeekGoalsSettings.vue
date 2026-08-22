<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { ref, computed, watch } from "vue";
  import SlideOver from "@/components/SlideOver.vue";
  import { useTrainingGoals, TRAINING_PLANS, MUSCLE_GROUP_NAMES, MUSCLE_GROUP_COLORS, type TrainingGoals, type TrainingPlanId } from "@/composables/useTrainingGoals";

  // ---------------------------------------------------------------------------
  // Props / Emits
  // ---------------------------------------------------------------------------

  const props = defineProps<{ visible: boolean }>();

  const emit = defineEmits<{
    (e: "update:visible", value: boolean): void;
    (e: "saved"): void;
  }>();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const { goals, buildFromPlan, saveGoals } = useTrainingGoals();

  const MAX_SETS = 60;
  const MAX_SESSIONS = 14;

  const isSaving = ref(false);

  /** Working copy — nothing is persisted until the user hits "Lagre". */
  const draft = ref<TrainingGoals>({ planId: "none", sessionsPerWeek: 0, setsPerMuscleGroup: {} });

  const cloneGoals = (source: TrainingGoals): TrainingGoals => ({
    planId: source.planId,
    sessionsPerWeek: source.sessionsPerWeek,
    setsPerMuscleGroup: { ...source.setsPerMuscleGroup },
  });

  // Reset the draft each time the drawer opens so a cancelled edit is discarded.
  watch(
    () => props.visible,
    (open) => {
      if (!open) return;
      draft.value = cloneGoals(goals.value);
      isSaving.value = false;
    },
    { immediate: true },
  );

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const totalTargetSets = computed(() => Object.values(draft.value.setsPerMuscleGroup).reduce((sum, n) => sum + n, 0));

  const hasAnyTarget = computed(() => totalTargetSets.value > 0);

  const activePlanName = computed(() => TRAINING_PLANS.find((p) => p.id === draft.value.planId)?.name ?? "Ingen plan valgt");

  const getColor = (group: string): string => MUSCLE_GROUP_COLORS[group] ?? "#6b7280";

  const getSets = (group: string): number => draft.value.setsPerMuscleGroup[group] ?? 0;

  // ---------------------------------------------------------------------------
  // Methods
  // ---------------------------------------------------------------------------

  const close = () => emit("update:visible", false);

  /** Applies a preset. "Egendefinert" keeps existing numbers when there are any. */
  const selectPlan = (planId: TrainingPlanId) => {
    if (planId === "custom" && hasAnyTarget.value) {
      draft.value = { ...draft.value, planId: "custom" };
      return;
    }
    draft.value = buildFromPlan(planId);
  };

  /** Any manual tweak means the numbers no longer match the preset. */
  const markCustom = () => {
    if (draft.value.planId !== "custom") draft.value.planId = "custom";
  };

  const adjustSets = (group: string, delta: number) => {
    const next = Math.max(0, Math.min(MAX_SETS, getSets(group) + delta));
    draft.value.setsPerMuscleGroup = { ...draft.value.setsPerMuscleGroup, [group]: next };
    markCustom();
  };

  const adjustSessions = (delta: number) => {
    draft.value.sessionsPerWeek = Math.max(0, Math.min(MAX_SESSIONS, draft.value.sessionsPerWeek + delta));
    markCustom();
  };

  /** Restores the numbers of whichever preset the plan started from. */
  const resetToPlanDefaults = () => {
    const planId = draft.value.planId === "none" ? "custom" : draft.value.planId;
    draft.value = buildFromPlan(planId);
  };

  /** Turns goal tracking off entirely — the week card falls back to plain totals. */
  const clearGoals = () => {
    draft.value = { planId: "none", sessionsPerWeek: 0, setsPerMuscleGroup: {} };
  };

  const save = async () => {
    isSaving.value = true;
    try {
      await saveGoals(draft.value);
      emit("saved");
      close();
    } finally {
      isSaving.value = false;
    }
  };
</script>

<template>
  <SlideOver
    :is-open="props.visible"
    title="Ukesmål"
    @close="close">
    <div class="space-y-6">
      <!-- Plan picker -->
      <section>
        <h4 class="goals__heading">Treningsplan</h4>
        <p class="goals__hint">Velg planen du kjører, så fylles anbefalte settmål inn automatisk.</p>

        <div class="mt-3 space-y-2">
          <button
            v-for="plan in TRAINING_PLANS"
            :key="plan.id"
            type="button"
            class="goals__plan"
            :class="{ 'goals__plan--active': draft.planId === plan.id }"
            @click="selectPlan(plan.id)">
            <span class="goals__plan-radio">
              <span
                v-if="draft.planId === plan.id"
                class="goals__plan-radio-dot"></span>
            </span>
            <span class="goals__plan-body">
              <span class="goals__plan-name">{{ plan.name }}</span>
              <span class="goals__plan-desc">{{ plan.description }}</span>
            </span>
            <span class="goals__plan-count">{{ plan.sessionsPerWeek }}×</span>
          </button>
        </div>
      </section>

      <!-- Sessions per week -->
      <section>
        <h4 class="goals__heading">Økter per uke</h4>
        <div class="goals__row mt-3">
          <span class="goals__row-label">Mål</span>
          <div class="goals__stepper">
            <button
              type="button"
              class="goals__step-btn"
              :disabled="draft.sessionsPerWeek <= 0"
              aria-label="Færre økter"
              @click="adjustSessions(-1)">
              −
            </button>
            <span class="goals__step-value">{{ draft.sessionsPerWeek || "–" }}</span>
            <button
              type="button"
              class="goals__step-btn"
              :disabled="draft.sessionsPerWeek >= MAX_SESSIONS"
              aria-label="Flere økter"
              @click="adjustSessions(1)">
              +
            </button>
          </div>
        </div>
      </section>

      <!-- Sets per muscle group -->
      <section>
        <div class="flex items-baseline justify-between">
          <h4 class="goals__heading">Sett per uke</h4>
          <span class="goals__total">{{ totalTargetSets }} totalt</span>
        </div>
        <p class="goals__hint">10–20 sett i uka per muskelgruppe er et vanlig utgangspunkt for muskelvekst.</p>

        <div class="mt-3 space-y-2">
          <div
            v-for="group in MUSCLE_GROUP_NAMES"
            :key="group"
            class="goals__row">
            <span
              class="goals__dot"
              :style="{ backgroundColor: getColor(group) }"></span>
            <span class="goals__row-label">{{ group }}</span>
            <div class="goals__stepper">
              <button
                type="button"
                class="goals__step-btn"
                :disabled="getSets(group) <= 0"
                :aria-label="`Færre sett for ${group}`"
                @click="adjustSets(group, -1)">
                −
              </button>
              <span class="goals__step-value">{{ getSets(group) || "–" }}</span>
              <button
                type="button"
                class="goals__step-btn"
                :disabled="getSets(group) >= MAX_SETS"
                :aria-label="`Flere sett for ${group}`"
                @click="adjustSets(group, 1)">
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Secondary actions -->
      <section class="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          class="goals__link"
          @click="resetToPlanDefaults">
          Tilbakestill til {{ activePlanName }}
        </button>
        <button
          v-if="hasAnyTarget"
          type="button"
          class="goals__link goals__link--muted"
          @click="clearGoals">
          Fjern mål
        </button>
      </section>
    </div>

    <template #footer>
      <div class="flex gap-3">
        <button
          type="button"
          class="btn-secondary flex-1"
          @click="close">
          Avbryt
        </button>
        <button
          type="button"
          class="btn-primary flex-1"
          :disabled="isSaving"
          @click="save">
          {{ isSaving ? "Lagrer…" : "Lagre" }}
        </button>
      </div>
    </template>
  </SlideOver>
</template>

<style scoped>
  .goals__heading {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
  }

  .goals__hint {
    margin-top: 0.375rem;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #64748b;
  }

  .goals__total {
    font-size: 0.75rem;
    font-weight: 600;
    color: #f97316;
  }

  /* ── Plan picker ─────────────────────────────────────────────────────────── */

  .goals__plan {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    text-align: left;
    background: #0d1117;
    border: 1px solid #1f2937;
    border-radius: 0.75rem;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .goals__plan--active {
    border-color: #f97316;
    background: #f9731610;
  }

  .goals__plan-radio {
    flex-shrink: 0;
    width: 1.125rem;
    height: 1.125rem;
    margin-top: 0.125rem;
    border-radius: 50%;
    border: 2px solid #334155;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .goals__plan--active .goals__plan-radio {
    border-color: #f97316;
  }

  .goals__plan-radio-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #f97316;
  }

  .goals__plan-body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    flex: 1;
  }

  .goals__plan-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #fff;
  }

  .goals__plan-desc {
    font-size: 0.6875rem;
    line-height: 1.35;
    color: #64748b;
  }

  .goals__plan-count {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 700;
    color: #475569;
  }

  /* ── Stepper rows ────────────────────────────────────────────────────────── */

  .goals__row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    background: #0d1117;
    border: 1px solid #1f2937;
    border-radius: 0.625rem;
  }

  .goals__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .goals__row-label {
    flex: 1;
    font-size: 0.875rem;
    color: #e2e8f0;
  }

  .goals__stepper {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .goals__step-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.125rem;
    line-height: 1;
    color: #fff;
    background: #1e293b;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    transition: background 0.15s;
  }

  .goals__step-btn:active {
    background: #334155;
  }

  .goals__step-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .goals__step-value {
    min-width: 2rem;
    text-align: center;
    font-size: 0.9375rem;
    font-weight: 700;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }

  /* ── Text actions ────────────────────────────────────────────────────────── */

  .goals__link {
    font-size: 0.75rem;
    color: #f97316;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .goals__link--muted {
    color: #64748b;
  }
</style>
