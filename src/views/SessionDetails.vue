<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { ref, onMounted, computed, watch, onUnmounted } from "vue";
  import { useRouter, useRoute } from "vue-router";
  import { useHybridData } from "@/composables/useHybridData";
  import type { WorkoutExercise, WorkoutSession, WorkoutSet } from "@/types/workout";
  import Breadcrumbs from "@/components/Breadcrumbs.vue";
  import CardioActivitySummary from "@/components/CardioActivitySummary.vue";
  import { isCardioExercise, isSetCounted, setReps, setVolume } from "@/composables/useSetMetrics";
  import { formatTotalTime } from "@/composables/useCardioActivities";
  import { MUSCLE_GROUP_COLORS } from "@/composables/useTrainingGoals";

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const router = useRouter();
  const route = useRoute();
  const workoutData = useHybridData();

  const session = ref<WorkoutSession | null>(null);
  const isHydrating = ref(true);

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  const formatNumber = (num: number): string => new Intl.NumberFormat("no-NO").format(Math.round(num));

  /** Weights keep their halves: "77,5". */
  const formatKg = (kg: number): string => kg.toLocaleString("no-NO", { maximumFractionDigits: 2 });

  /** "tor. 15. okt., 18:42" — with the year only when it isn't this one. */
  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return new Intl.DateTimeFormat("no-NO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const typeName = computed(() => (session.value ? workoutData.getWorkoutType(session.value.workoutType) : ""));
  const typeColor = computed(() => (session.value ? workoutData.getWorkoutTypeColor(session.value.workoutType) : "#6b7280"));

  // ---------------------------------------------------------------------------
  // Strength
  // ---------------------------------------------------------------------------

  const countedSets = (exercise: WorkoutExercise): WorkoutSet[] => exercise.sets.filter((set) => isSetCounted(exercise, set));

  const strengthExercises = computed(() =>
    (session.value?.exercises ?? []).filter((ex) => !isCardioExercise(ex) && countedSets(ex).length > 0),
  );

  /** Cardio activities with something logged — each gets its own summary. */
  const cardioExercises = computed(() =>
    (session.value?.exercises ?? []).filter((ex) => isCardioExercise(ex) && countedSets(ex).length > 0),
  );

  const strengthTotals = computed(() => {
    let sets = 0;
    let reps = 0;
    let volume = 0;
    strengthExercises.value.forEach((ex) =>
      countedSets(ex).forEach((set) => {
        sets += 1;
        reps += setReps(ex, set);
        volume += setVolume(ex, set);
      }),
    );
    const minutes = Math.max(1, session.value?.duration || 0);
    return { sets, reps, volume, perMinute: Math.round(volume / minutes) };
  });

  /**
   * Heaviest weight per exercise across sessions finished before this one —
   * what a set here has to beat to count as a personal record.
   */
  const previousBest = computed(() => {
    const best = new Map<number, number>();
    if (!session.value) return best;
    const before = new Date(session.value.date).getTime();

    workoutData.sessions.value.forEach((s) => {
      if (!s.isCompleted || s.id === session.value!.id || new Date(s.date).getTime() >= before) return;
      s.exercises.forEach((ex) => {
        if (isCardioExercise(ex)) return;
        const id = Number(ex.exerciseId);
        countedSets(ex).forEach((set) => {
          const weight = Number(set.weight) || 0;
          if (weight > (best.get(id) ?? 0)) best.set(id, weight);
        });
      });
    });
    return best;
  });

  const strengthRows = computed(() => {
    const totalVolume = strengthTotals.value.volume || 1;

    return strengthExercises.value.map((ex) => {
      const sets = countedSets(ex);
      // Heaviest by weight; on equal weight, more reps wins. A full tie keeps
      // the earliest set — the one that got there first.
      const top = sets.reduce((a, b) => {
        const wa = Number(a.weight) || 0;
        const wb = Number(b.weight) || 0;
        return wb > wa || (wb === wa && (Number(b.reps) || 0) > (Number(a.reps) || 0)) ? b : a;
      });
      const topWeight = Number(top.weight) || 0;
      const topReps = Number(top.reps) || 0;
      const volume = sets.reduce((sum, set) => sum + setVolume(ex, set), 0);
      const previous = previousBest.value.get(Number(ex.exerciseId));
      // A first-ever lift has nothing to beat, so it isn't a record.
      const isPR = previous !== undefined && topWeight > previous;

      return {
        key: `${ex.exerciseId}`,
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: sets.map((set) => ({ id: set.id, weight: formatKg(Number(set.weight) || 0), reps: Number(set.reps) || 0, isPR: isPR && set === top })),
        volume,
        share: Math.round((volume / totalVolume) * 100),
        isPR,
        nextHint: topReps >= 5 ? `${formatKg(topWeight + 2.5)} kg` : `${formatKg(topWeight)} kg og +1 rep`,
      };
    });
  });

  /** Share of the session's volume per muscle group. */
  const muscleGroups = computed(() => {
    const byGroup = new Map<string, number>();
    strengthExercises.value.forEach((ex) => {
      const group = workoutData.exerciseIndex.value.get(Number(ex.exerciseId))?.category;
      if (!group) return;
      const volume = countedSets(ex).reduce((sum, set) => sum + setVolume(ex, set), 0);
      byGroup.set(group, (byGroup.get(group) ?? 0) + volume);
    });

    const total = [...byGroup.values()].reduce((sum, v) => sum + v, 0) || 1;
    return [...byGroup.entries()]
      .map(([name, volume]) => ({ name, color: MUSCLE_GROUP_COLORS[name] ?? "#6b7280", pct: Math.round((volume / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  });

  /** Share of sets in each rep range. */
  const repRanges = computed(() => {
    const counts = { strength: 0, hypertrophy: 0, endurance: 0 };
    strengthExercises.value.forEach((ex) =>
      countedSets(ex).forEach((set) => {
        const reps = Number(set.reps) || 0;
        if (reps <= 5) counts.strength += 1;
        else if (reps <= 12) counts.hypertrophy += 1;
        else counts.endurance += 1;
      }),
    );
    const total = counts.strength + counts.hypertrophy + counts.endurance || 1;
    const pct = (n: number) => Math.round((n / total) * 100);
    return [
      { key: "strength", label: "Styrke", range: "1–5", pct: pct(counts.strength) },
      { key: "hypertrophy", label: "Hypertrofi", range: "6–12", pct: pct(counts.hypertrophy) },
      { key: "endurance", label: "Utholdenhet", range: "13+", pct: pct(counts.endurance) },
    ];
  });

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  /** Strength and cardio each get one panel, in the order the session did them. */
  const sections = computed(() => {
    const order: Array<"strength" | "cardio"> = [];
    (session.value?.exercises ?? []).forEach((ex) => {
      const kind = isCardioExercise(ex) ? "cardio" : "strength";
      const hasData = kind === "cardio" ? cardioExercises.value.length > 0 : strengthExercises.value.length > 0;
      if (hasData && !order.includes(kind)) order.push(kind);
    });
    return order;
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const deleteSession = async () => {
    if (!session.value) return;
    if (!confirm("Er du sikker på at du vil slette denne økten?")) return;
    try {
      await workoutData.deleteWorkoutSession(session.value.id);
      router.push("/history");
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Kunne ikke slette økten. Prøv igjen.");
    }
  };

  const viewExercise = (exerciseId: number) => {
    router.push(`/exercise/${exerciseId}`);
  };

  const handleUseAsTemplate = () => {
    if (!session.value) return;
    router.push({ name: "CreateTemplate", query: { fromSession: session.value.id } });
  };

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  onMounted(async () => {
    const sessionId = route.params.id as string;

    const setFromStore = () => {
      const s = workoutData.getSessionById(sessionId);
      if (!s) return false;
      session.value = s;
      return true;
    };

    // Try immediate
    if (setFromStore()) {
      isHydrating.value = false;
      return;
    }

    try {
      // Repaint from cache if available
      if ((workoutData as any).refreshUIData) {
        await (workoutData as any).refreshUIData();
        if (setFromStore()) {
          isHydrating.value = false;
          return;
        }
      }

      // Try a data load (no redirect here)
      await workoutData.loadData(0, true);
      if (setFromStore()) {
        isHydrating.value = false;
        return;
      }
    } catch {}

    // Still not present: wait for sessions/auth to hydrate
    const stopSessionsWatch = watch(
      () => workoutData.sessions.value,
      () => {
        if (setFromStore()) {
          isHydrating.value = false;
          stopSessionsWatch();
        }
      },
    );

    const stopAuthWatch = watch(
      () => workoutData.currentUser.value,
      async (u) => {
        if (!u) return;
        try {
          await (workoutData as any).refreshUIData?.();
          if (setFromStore()) {
            isHydrating.value = false;
            stopAuthWatch();
            return;
          }
          await workoutData.loadData(0, true);
          if (setFromStore()) {
            isHydrating.value = false;
            stopAuthWatch();
          }
        } catch {
          isHydrating.value = false;
        }
      },
      { immediate: false },
    );

    onUnmounted(() => {
      try {
        stopSessionsWatch();
      } catch {}
      try {
        stopAuthWatch();
      } catch {}
    });
  });
</script>

<template>
  <div class="space-y-5 pb-24 md:pb-8">
    <Breadcrumbs
      :breadcrumbs="[
        { name: 'Historikk', path: '/history' },
        { name: 'Økt Detaljer' },
      ]" />

    <!-- Header: what, when and how long — no card around it -->
    <header class="flex items-center gap-3">
      <router-link
        to="/history"
        class="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors"
        aria-label="Tilbake til historikk">
        <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>

      <div class="min-w-0">
        <h1 class="sd-title">{{ session?.templateName ?? "Økt Detaljer" }}</h1>
        <p v-if="session" class="sd-meta">
          <span class="sd-meta__type">
            <span class="sd-meta__dot" :style="{ backgroundColor: typeColor }"></span>
            {{ typeName }}
          </span>
          <span>{{ formatDate(session.date) }}</span>
          <span>{{ formatTotalTime(session.duration * 60) }}</span>
        </p>
      </div>
    </header>

    <!-- Not found -->
    <div v-if="!session && !isHydrating" class="sd-panel sd-empty">
      <p class="text-dark-300 text-sm">Økt ikke funnet.</p>
      <router-link to="/history" class="btn-primary btn-sm mt-3">Tilbake til historikk</router-link>
    </div>

    <!-- Loading -->
    <div v-else-if="isHydrating" class="space-y-4 animate-pulse">
      <div class="sd-panel h-44"></div>
      <div class="sd-panel h-72"></div>
    </div>

    <template v-else-if="session">
      <template v-for="section in sections" :key="section">
        <!-- Strength: one panel — figures, exercises, then how it was spread -->
        <section v-if="section === 'strength'" class="sd-panel">
          <h2 class="sd-section-title">
            <span class="sd-section-title__dot sd-section-title__dot--strength"></span>
            Styrke
          </h2>

          <dl class="sd-stats">
            <div class="sd-stat">
              <dt>Sett</dt>
              <dd>{{ strengthTotals.sets }}</dd>
            </div>
            <div class="sd-stat">
              <dt>Volum</dt>
              <dd>
                {{ formatNumber(strengthTotals.volume) }}
                <span class="sd-stat__unit">kg</span>
              </dd>
            </div>
            
            <div class="sd-stat">
              <dt>Reps</dt>
              <dd>{{ formatNumber(strengthTotals.reps) }}</dd>
            </div>
            <div class="sd-stat">
              <dt>Per minutt</dt>
              <dd>
                {{ formatNumber(strengthTotals.perMinute) }}
                <span class="sd-stat__unit">kg</span>
              </dd>
            </div>
          </dl>

          <ul class="sd-exercises">
            <li v-for="row in strengthRows" :key="row.key" class="sd-ex">
              <div class="sd-ex__head">
                <button type="button" class="sd-ex__name" @click="viewExercise(row.exerciseId)">
                  {{ row.name }}
                </button>
                <span v-if="row.isPR" class="sd-ex__pr">PR</span>
                <span class="sd-ex__volume">
                  {{ formatNumber(row.volume) }} kg
                  <span class="sd-ex__share">{{ row.share }} %</span>
                </span>
              </div>

              <!-- One line per set, columns aligned — reads the same at 3 sets or 8 -->
              <ol class="sd-sets">
                <li v-for="(set, index) in row.sets" :key="set.id" class="sd-set" :class="{ 'sd-set--pr': set.isPR }">
                  <span class="sd-set__num">{{ index + 1 }}</span>
                  <span class="sd-set__weight">{{ set.weight }} <span class="sd-set__unit">kg</span></span>
                  <span class="sd-set__reps">{{ set.reps }} <span class="sd-set__unit">reps</span></span>
                </li>
              </ol>

              <p class="sd-ex__meta">Neste gang {{ row.nextHint }}</p>
            </li>
          </ul>

          <div class="sd-split">
            <div v-if="muscleGroups.length > 0">
              <h3 class="sd-sub-title">Muskelgrupper</h3>
              <div class="sd-groups">
                <div v-for="group in muscleGroups" :key="group.name" class="sd-group">
                  <div class="sd-group__top">
                    <span class="sd-group__dot" :style="{ backgroundColor: group.color }"></span>
                    <span class="sd-group__name">{{ group.name }}</span>
                    <span class="sd-group__pct">{{ group.pct }} %</span>
                  </div>
                  <div class="sd-group__bar">
                    <div class="sd-group__fill" :style="{ width: group.pct + '%', backgroundColor: group.color }"></div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 class="sd-sub-title">Rep-områder</h3>
              <div class="sd-ranges">
                <div v-for="range in repRanges" :key="range.key" class="sd-range">
                  <span class="sd-range__value">{{ range.pct }} %</span>
                  <span class="sd-range__label">{{ range.label }} {{ range.range }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Cardio: one panel, an activity summary each -->
        <section v-else class="sd-panel">
          <h2 class="sd-section-title">
            <span class="sd-section-title__dot sd-section-title__dot--cardio"></span>
            Kondisjon
          </h2>
          <div class="sd-activities">
            <CardioActivitySummary v-for="exercise in cardioExercises" :key="exercise.exerciseId" :exercise="exercise" />
          </div>
        </section>
      </template>

      <!-- Actions -->
      <div class="sd-actions">
        <button type="button" class="btn-secondary flex-1" @click="handleUseAsTemplate">Bruk som mal</button>
        <button type="button" class="sd-delete" @click="deleteSession">Slett økt</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
  /* ── Header ──────────────────────────────────────────────────────────────── */

  .sd-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sd-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.625rem;
    margin-top: 0.25rem;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  /* Hairline separators between the meta items. */
  .sd-meta > span + span::before {
    content: "·";
    margin-right: 0.625rem;
    color: #475569;
  }

  .sd-meta__type {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .sd-meta__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  /* ── Panels ──────────────────────────────────────────────────────────────── */

  .sd-panel {
    padding: 1.125rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
  }

  .sd-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    text-align: center;
  }

  .sd-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .sd-section-title__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  .sd-section-title__dot--strength {
    background: #f97316;
  }

  .sd-section-title__dot--cardio {
    background: #06b6d4;
  }

  .sd-sub-title {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
  }

  /* ── Strength figures ────────────────────────────────────────────────────── */

  .sd-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.875rem 1rem;
    margin-top: 0.875rem;
  }

  @media (min-width: 640px) {
    .sd-stats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .sd-stat dt {
    font-size: 0.6875rem;
    color: #64748b;
  }

  .sd-stat dd {
    margin-top: 0.125rem;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.15;
    color: #fff;
    white-space: nowrap;
  }

  .sd-stat__unit {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  /* ── Exercises ───────────────────────────────────────────────────────────── */

  .sd-exercises {
    margin-top: 1rem;
  }

  .sd-ex {
    padding: 1.125rem 0;
    border-top: 1px solid #1f2937;
  }

  .sd-ex:last-child {
    padding-bottom: 0;
  }

  .sd-ex__head {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .sd-ex__name {
    min-width: 0;
    min-height: auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
    text-align: left;
    cursor: pointer;
  }

  .sd-ex__name:hover {
    color: #fdba74;
  }

  .sd-ex__pr {
    flex-shrink: 0;
    padding: 0.0625rem 0.4375rem;
    font-size: 0.625rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #fdba74;
    background: #f9731618;
    border: 1px solid #f9731640;
    border-radius: 999px;
  }

  .sd-ex__volume {
    flex-shrink: 0;
    margin-left: auto;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #e2e8f0;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .sd-ex__share {
    margin-left: 0.25rem;
    font-weight: 500;
    color: #64748b;
  }

  .sd-sets {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.75rem;
  }

  /* Weight right-aligned in a fixed column, so "80" and "77,5" line up on the unit. */
  .sd-set {
    display: grid;
    grid-template-columns: 1.25rem 4rem 1fr;
    align-items: baseline;
    column-gap: 0.75rem;
    padding: 0.1875rem 0;
    font-size: 0.9375rem;
    font-variant-numeric: tabular-nums;
  }

  .sd-set__num {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
  }

  .sd-set__weight {
    font-weight: 600;
    color: #e2e8f0;
    text-align: right;
    white-space: nowrap;
  }

  .sd-set__reps {
    color: #cbd5e1;
    white-space: nowrap;
  }

  .sd-set__unit {
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
  }

  /* The set that beat every earlier session's best for this lift. */
  .sd-set--pr .sd-set__weight,
  .sd-set--pr .sd-set__reps {
    color: #fdba74;
  }

  .sd-set--pr .sd-set__num {
    color: #f97316;
  }

  .sd-ex__meta {
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  /* ── Distribution ────────────────────────────────────────────────────────── */

  .sd-split {
    display: grid;
    gap: 1.25rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #1f2937;
  }

  @media (min-width: 768px) {
    .sd-split {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 2rem;
    }
  }

  .sd-groups {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 0.625rem;
  }

  .sd-group__top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sd-group__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .sd-group__name {
    flex: 1;
    font-size: 0.8125rem;
    color: #e2e8f0;
  }

  .sd-group__pct {
    font-size: 0.75rem;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }

  .sd-group__bar {
    height: 0.3125rem;
    margin-top: 0.3125rem;
    background: #0d1117;
    border-radius: 2px 4px 4px 2px;
    overflow: hidden;
  }

  /* Square at the start, 4px-rounded at the data end. */
  .sd-group__fill {
    height: 100%;
    border-radius: 0 4px 4px 0;
  }

  .sd-ranges {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.625rem;
  }

  .sd-range {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .sd-range__value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }

  .sd-range__label {
    font-size: 0.6875rem;
    line-height: 1.3;
    color: #64748b;
  }

  /* ── Cardio ──────────────────────────────────────────────────────────────── */

  .sd-activities {
    margin-top: 0.875rem;
  }

  /* Several activities in one session sit in the same panel, split by a hairline. */
  .sd-activities > * + * {
    margin-top: 1.125rem;
    padding-top: 1.125rem;
    border-top: 1px solid #1f2937;
  }

  /* ── Actions ─────────────────────────────────────────────────────────────── */

  .sd-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sd-delete {
    padding: 0 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #f87171;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .sd-delete:active {
    background: #7f1d1d40;
  }
</style>
