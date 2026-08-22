<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { ref, computed, watch, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import { useHybridData } from "@/composables/useHybridData";
  import { useWeekStats, WEEK_DAYS, getIsoWeekNumber, startOfIsoWeek, getTodayIndex } from "@/composables/useWeekStats";
  import { useTrainingGoals } from "@/composables/useTrainingGoals";
  import Breadcrumbs from "@/components/Breadcrumbs.vue";
  import WeekGoalsSettings from "@/components/WeekGoalsSettings.vue";

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const route = useRoute();
  const router = useRouter();
  const workoutData = useHybridData();
  const { hasGoals } = useTrainingGoals();

  /** How far back the week picker reaches. 0 = current week only. */
  const MAX_WEEKS_BACK = 5;

  const weekOffset = ref(0);
  const showSettings = ref(false);

  const isLoading = computed(() => workoutData.isLoading.value);

  // `week` holds refs inside a plain object, so Vue's template ref-unwrapping
  // (which is shallow, top-level only) does not apply — `.value` is required
  // both here and in the template.
  const week = useWeekStats(weekOffset);

  // ---------------------------------------------------------------------------
  // Week navigation
  // ---------------------------------------------------------------------------

  const clampOffset = (value: number): number => Math.max(-MAX_WEEKS_BACK, Math.min(0, Math.round(value)));

  /** The picker strip: oldest week on the left, current week on the right. */
  const weekOptions = computed(() =>
    Array.from({ length: MAX_WEEKS_BACK + 1 }, (_, i) => {
      const offset = -MAX_WEEKS_BACK + i;
      const start = startOfIsoWeek(new Date());
      start.setDate(start.getDate() + offset * 7);
      return { offset, weekNumber: getIsoWeekNumber(start) };
    }),
  );

  const canGoBack = computed(() => weekOffset.value > -MAX_WEEKS_BACK);
  const canGoForward = computed(() => weekOffset.value < 0);

  const selectWeek = (offset: number) => {
    weekOffset.value = clampOffset(offset);
  };

  // Keep ?w= in sync so the back button and deep links land on the right week.
  watch(weekOffset, (offset) => {
    const query = offset === 0 ? {} : { w: String(offset) };
    router.replace({ query });
  });

  onMounted(() => {
    const fromQuery = Number(route.query.w);
    if (Number.isFinite(fromQuery)) weekOffset.value = clampOffset(fromQuery);
  });

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  const formatNumber = (num: number): string => new Intl.NumberFormat("no-NO").format(Math.round(num));

  const formatDuration = (minutes: number): string => {
    if (minutes <= 0) return "0 min";
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest} min`;
    if (rest === 0) return `${hours} t`;
    return `${hours} t ${rest} min`;
  };

  const formatSessionDate = (date: Date): string =>
    new Intl.DateTimeFormat("no-NO", { weekday: "short", day: "numeric", month: "short" }).format(new Date(date));

  const getWorkoutTypeName = (typeId: string): string => workoutData.getWorkoutType(typeId);
  const getWorkoutTypeColor = (typeId: string): string => workoutData.getWorkoutTypeColor(typeId);

  /**
   * Percentage change against the same figure last week.
   * Returns null when last week had nothing to compare against.
   */
  const changeVsLastWeek = (current: number, previous: number): number | null => {
    if (previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 100);
  };

  const formatChange = (pct: number): string => `${pct > 0 ? "+" : ""}${pct} %`;

  // ---------------------------------------------------------------------------
  // Derived view data
  // ---------------------------------------------------------------------------

  const stats = computed(() => {
    const t = week.totals.value;
    const prev = week.previousWeekTotals.value;
    return [
      { key: "workouts", label: "Økter", value: String(t.workouts), change: changeVsLastWeek(t.workouts, prev.workouts) },
      { key: "volume", label: "Volum (kg)", value: formatNumber(t.volume), change: changeVsLastWeek(t.volume, prev.volume) },
      { key: "duration", label: "Varighet", value: formatDuration(t.durationMinutes), change: changeVsLastWeek(t.durationMinutes, prev.durationMinutes) },
      { key: "sets", label: "Sett", value: String(t.sets), change: changeVsLastWeek(t.sets, prev.sets) },
      { key: "reps", label: "Reps", value: formatNumber(t.reps), change: changeVsLastWeek(t.reps, prev.reps) },
      { key: "avgVolume", label: "Snitt per økt", value: formatNumber(t.avgVolumePerWorkout), change: null },
    ];
  });

  const trainedGroups = computed(() => week.muscleGroups.value.filter((g) => g.sets > 0));

  /**
   * Untrained groups are only worth listing when there's a target to fall short
   * of — without a goal, "0 sett" is a choice rather than a gap.
   */
  const untrainedGroups = computed(() => week.muscleGroups.value.filter((g) => g.sets === 0 && g.targetSets > 0));

  const isLoadingExercises = computed(() => workoutData.isLoadingExercises.value);

  const maxDailyVolume = computed(() => Math.max(0, ...week.dailyVolume.value.map((d) => d.volume)));

  const hasSessions = computed(() => week.sessions.value.length > 0);

  /** Only meaningful once at least one rep has been logged. */
  const showRepRanges = computed(() => week.totals.value.reps > 0);

  const dayState = (idx: number): "done" | "today" | "past" | "future" => {
    if (week.trainedDayIndices.value.has(idx)) return "done";
    if (!week.isCurrentWeek.value) return "past";
    if (idx === getTodayIndex()) return "today";
    return idx < getTodayIndex() ? "past" : "future";
  };
</script>

<template>
  <div class="space-y-5 pb-24 md:pb-8">
    <Breadcrumbs
      :breadcrumbs="[
        { name: 'Økter', path: '/' },
        { name: 'Ukesoversikt' },
      ]" />

    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-white">Uke {{ week.weekNumber.value }}</h1>
        <p class="text-sm text-dark-400 mt-0.5">
          {{ week.weekLabel.value }}
          <span v-if="week.isCurrentWeek.value" class="text-primary-500 font-medium"> · denne uken</span>
        </p>
      </div>

      <button
        type="button"
        class="wk-icon-btn"
        title="Ukesmål og treningsplan"
        aria-label="Ukesmål og treningsplan"
        @click="showSettings = true">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>

    <!-- Week picker -->
    <div class="wk-picker">
      <button
        type="button"
        class="wk-picker__arrow"
        :disabled="!canGoBack"
        aria-label="Forrige uke"
        @click="selectWeek(weekOffset - 1)">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="wk-picker__weeks">
        <button
          v-for="option in weekOptions"
          :key="option.offset"
          type="button"
          class="wk-picker__week"
          :class="{ 'wk-picker__week--active': option.offset === weekOffset }"
          @click="selectWeek(option.offset)">
          {{ option.weekNumber }}
        </button>
      </div>

      <button
        type="button"
        class="wk-picker__arrow"
        :disabled="!canGoForward"
        aria-label="Neste uke"
        @click="selectWeek(weekOffset + 1)">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4">
      <div class="h-24 bg-dark-800 rounded-xl animate-pulse"></div>
      <div class="h-48 bg-dark-800 rounded-xl animate-pulse"></div>
    </div>

    <template v-else>
      <!-- Day track -->
      <div class="wk-card">
        <div class="wk-days">
          <div v-for="(label, i) in WEEK_DAYS" :key="label" class="wk-day">
            <div :class="['wk-day__dot', `wk-day__dot--${dayState(i)}`]">
              <svg v-if="dayState(i) === 'done'" class="wk-day__check" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.5l2.2 2.2 3.8-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <span class="wk-day__label">{{ label }}</span>
          </div>
        </div>

        <div v-if="week.templateUsage.value.length > 0" class="wk-chips">
          <span
            v-for="t in week.templateUsage.value"
            :key="t.name"
            class="wk-chip"
            :style="{
              backgroundColor: getWorkoutTypeColor(t.workoutType) + '18',
              color: getWorkoutTypeColor(t.workoutType),
              borderColor: getWorkoutTypeColor(t.workoutType) + '40',
            }">
            {{ t.count }}× {{ t.name }}
          </span>
        </div>
      </div>

      <!-- Empty week -->
      <div v-if="!hasSessions" class="wk-card wk-empty">
        <div class="wk-empty__icon">
          <svg class="w-7 h-7 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-dark-300 text-sm">Ingen fullførte økter denne uken.</p>
        <router-link v-if="week.isCurrentWeek.value" to="/" class="btn-primary btn-sm mt-3">Start en økt</router-link>
      </div>

      <template v-else>
        <!-- Key figures -->
        <div class="wk-stats">
          <div v-for="stat in stats" :key="stat.key" class="wk-stat">
            <span class="wk-stat__value">{{ stat.value }}</span>
            <span class="wk-stat__label">{{ stat.label }}</span>
            <span
              v-if="stat.change !== null"
              class="wk-stat__change"
              :class="stat.change >= 0 ? 'wk-stat__change--up' : 'wk-stat__change--down'">
              {{ formatChange(stat.change) }}
            </span>
          </div>
        </div>

        <!-- Goals CTA -->
        <button
          v-if="!hasGoals"
          type="button"
          class="wk-cta"
          @click="showSettings = true">
          <div class="wk-cta__body">
            <span class="wk-cta__title">Sett opp ukesmål</span>
            <span class="wk-cta__desc">Velg treningsplan og mål for sett per muskelgruppe, så ser du hvor du ligger an.</span>
          </div>
          <svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Muscle groups -->
        <section class="wk-card">
          <div class="wk-section-head">
            <h2 class="wk-section-title">Muskelgrupper</h2>
            <span v-if="hasGoals" class="wk-section-meta">{{ week.setsGoalProgress.value.done }} / {{ week.setsGoalProgress.value.target }} sett</span>
            <span v-else class="wk-section-meta">{{ week.totals.value.sets }} sett</span>
          </div>

          <div class="mt-3 space-y-2.5">
            <div v-for="group in trainedGroups" :key="group.name" class="wk-mg">
              <div class="wk-mg__top">
                <span class="wk-mg__dot" :style="{ backgroundColor: group.color }"></span>
                <span class="wk-mg__name">{{ group.name }}</span>
                <span class="wk-mg__sets">
                  <template v-if="group.targetSets > 0">
                    <strong :class="{ 'wk-mg__sets--met': group.isMet }">{{ group.sets }}</strong> / {{ group.targetSets }} sett
                    <svg v-if="group.isMet" class="wk-mg__check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </template>
                  <template v-else>
                    <strong>{{ group.sets }}</strong> sett
                  </template>
                </span>
              </div>

              <div class="wk-mg__bar">
                <div
                  class="wk-mg__fill"
                  :style="{
                    width: (group.targetSets > 0 ? group.pctOfTarget : group.shareOfMax) + '%',
                    backgroundColor: group.color,
                  }"></div>
              </div>

              <div class="wk-mg__meta">{{ formatNumber(group.reps) }} reps · {{ formatNumber(group.volume) }} kg</div>
            </div>
          </div>

          <!-- Untrained groups: the gaps in the week -->
          <div v-if="untrainedGroups.length > 0" class="wk-untrained">
            <span class="wk-untrained__label">Ikke trent denne uken</span>
            <div class="mt-2.5 space-y-2.5">
              <div v-for="group in untrainedGroups" :key="group.name" class="wk-mg wk-mg--muted">
                <div class="wk-mg__top">
                  <span class="wk-mg__dot" :style="{ backgroundColor: group.color }"></span>
                  <span class="wk-mg__name">{{ group.name }}</span>
                  <span class="wk-mg__sets"><strong>0</strong> / {{ group.targetSets }} sett</span>
                </div>
                <div class="wk-mg__bar"></div>
              </div>
            </div>
          </div>

          <p v-if="isLoadingExercises" class="wk-note">Laster øvelser…</p>
          <p v-else-if="week.unresolvedSets.value > 0" class="wk-note">
            {{ week.unresolvedSets.value }} sett er ikke fordelt på muskelgruppe — øvelsen finnes ikke lenger i øvelsesbiblioteket.
          </p>
        </section>

        <!-- Volume per day -->
        <section class="wk-card">
          <h2 class="wk-section-title">Volum per dag</h2>
          <div class="wk-bars">
            <div v-for="day in week.dailyVolume.value" :key="day.dayIdx" class="wk-bar">
              <div class="wk-bar__track">
                <div
                  class="wk-bar__fill"
                  :style="{ height: maxDailyVolume > 0 ? Math.max(day.volume > 0 ? 6 : 0, (day.volume / maxDailyVolume) * 100) + '%' : '0%' }"
                  :title="`${day.label}: ${formatNumber(day.volume)} kg`"></div>
              </div>
              <span class="wk-bar__label">{{ day.label }}</span>
            </div>
          </div>
        </section>

        <!-- Rep ranges -->
        <section v-if="showRepRanges" class="wk-card">
          <h2 class="wk-section-title">Rep-områder</h2>
          <div class="wk-ranges">
            <div class="wk-range">
              <span class="wk-range__value">{{ week.repRanges.value.strength }} %</span>
              <span class="wk-range__label">Styrke<br />1–5</span>
            </div>
            <div class="wk-range">
              <span class="wk-range__value">{{ week.repRanges.value.hypertrophy }} %</span>
              <span class="wk-range__label">Hypertrofi<br />6–12</span>
            </div>
            <div class="wk-range">
              <span class="wk-range__value">{{ week.repRanges.value.endurance }} %</span>
              <span class="wk-range__label">Utholdenhet<br />13+</span>
            </div>
          </div>
        </section>

        <!-- New personal bests -->
        <section v-if="week.newPersonalBests.value.length > 0" class="wk-card">
          <h2 class="wk-section-title">Nye personlige rekorder</h2>
          <div class="mt-3 space-y-2">
            <div v-for="pb in week.newPersonalBests.value" :key="pb.key" class="wk-pb">
              <svg class="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              <span class="wk-pb__name">{{ pb.name }}</span>
              <span class="wk-pb__value">
                {{ pb.weight }} kg × {{ pb.reps }}
                <span class="wk-pb__prev">før {{ pb.previousBest }} kg</span>
              </span>
            </div>
          </div>
        </section>

        <!-- Sessions this week -->
        <section class="wk-card">
          <h2 class="wk-section-title">Økter denne uken</h2>
          <div class="mt-3 space-y-2">
            <router-link
              v-for="session in week.sessions.value"
              :key="session.id"
              :to="`/session/${session.id}`"
              class="wk-session">
              <span class="wk-session__body">
                <span class="wk-session__name">{{ session.templateName }}</span>
                <span class="wk-session__meta">{{ formatSessionDate(session.date) }} · {{ session.duration }} min · {{ formatNumber(session.totalVolume || 0) }} kg</span>
              </span>
              <span
                class="wk-session__type"
                :style="{
                  backgroundColor: getWorkoutTypeColor(session.workoutType) + '20',
                  color: getWorkoutTypeColor(session.workoutType),
                }">
                {{ getWorkoutTypeName(session.workoutType) }}
              </span>
            </router-link>
          </div>
        </section>
      </template>
    </template>

    <WeekGoalsSettings v-model:visible="showSettings" />
  </div>
</template>

<style scoped>
  /* ── Shared card ─────────────────────────────────────────────────────────── */

  .wk-card {
    padding: 1rem 1.125rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
  }

  .wk-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .wk-section-title {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
  }

  .wk-section-meta {
    font-size: 0.75rem;
    font-weight: 600;
    color: #f97316;
    white-space: nowrap;
  }

  .wk-note {
    margin-top: 0.75rem;
    font-size: 0.6875rem;
    color: #64748b;
  }

  .wk-icon-btn {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    cursor: pointer;
    transition:
      color 0.15s,
      background 0.15s;
  }

  .wk-icon-btn:active {
    color: #fff;
    background: #334155;
  }

  /* ── Week picker ─────────────────────────────────────────────────────────── */

  .wk-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .wk-picker__arrow {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    background: #1e293b;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .wk-picker__arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .wk-picker__weeks {
    flex: 1;
    display: flex;
    gap: 0.25rem;
    justify-content: space-between;
  }

  .wk-picker__week {
    flex: 1;
    padding: 0.4375rem 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #64748b;
    background: #0d1117;
    border: 1px solid #1f2937;
    border-radius: 0.5rem;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    transition:
      color 0.15s,
      background 0.15s,
      border-color 0.15s;
  }

  .wk-picker__week--active {
    color: #fff;
    background: #f97316;
    border-color: #f97316;
  }

  /* ── Day track ───────────────────────────────────────────────────────────── */

  .wk-days {
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
  }

  .wk-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3125rem;
    flex: 1;
  }

  .wk-day__dot {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .wk-day__dot--done {
    background: #f97316;
    color: #fff;
  }

  .wk-day__dot--today {
    background: transparent;
    border: 2px solid #f97316;
    box-shadow: 0 0 0 3px #f9731618;
  }

  .wk-day__dot--past {
    background: #1f2937;
  }

  .wk-day__dot--future {
    background: #111827;
    border: 1px solid #1f2937;
  }

  .wk-day__check {
    width: 0.875rem;
    height: 0.875rem;
  }

  .wk-day__label {
    font-size: 0.625rem;
    font-weight: 500;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .wk-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-top: 0.875rem;
  }

  .wk-chip {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.625rem;
    border-radius: 999px;
    border: 1px solid;
    white-space: nowrap;
  }

  /* ── Key figures ─────────────────────────────────────────────────────────── */

  .wk-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  @media (min-width: 640px) {
    .wk-stats {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .wk-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    padding: 0.875rem 0.5rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 0.875rem;
  }

  .wk-stat__value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .wk-stat__label {
    font-size: 0.625rem;
    font-weight: 500;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
  }

  .wk-stat__change {
    font-size: 0.625rem;
    font-weight: 700;
    margin-top: 0.125rem;
  }

  .wk-stat__change--up {
    color: #22c55e;
  }

  .wk-stat__change--down {
    color: #ef4444;
  }

  /* ── Goals CTA ───────────────────────────────────────────────────────────── */

  .wk-cta {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    text-align: left;
    background: #f9731610;
    border: 1px solid #f9731633;
    border-radius: 1rem;
    cursor: pointer;
  }

  .wk-cta__body {
    display: flex;
    flex-direction: column;
    gap: 0.1875rem;
    flex: 1;
    min-width: 0;
  }

  .wk-cta__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f97316;
  }

  .wk-cta__desc {
    font-size: 0.75rem;
    line-height: 1.35;
    color: #94a3b8;
  }

  /* ── Muscle groups ───────────────────────────────────────────────────────── */

  .wk-mg__top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .wk-mg__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .wk-mg__name {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: #e2e8f0;
  }

  .wk-mg__sets {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #64748b;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .wk-mg__sets strong {
    color: #fff;
    font-weight: 700;
  }

  .wk-mg__sets--met {
    color: #22c55e !important;
  }

  .wk-mg__check {
    width: 0.75rem;
    height: 0.75rem;
    color: #22c55e;
  }

  .wk-mg__bar {
    height: 0.375rem;
    margin-top: 0.375rem;
    background: #0d1117;
    border-radius: 999px;
    overflow: hidden;
  }

  .wk-mg__fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease-out;
  }

  .wk-mg__meta {
    margin-top: 0.25rem;
    font-size: 0.6875rem;
    color: #4b5563;
  }

  .wk-untrained {
    margin-top: 1rem;
    padding-top: 0.875rem;
    border-top: 1px solid #1f2937;
  }

  .wk-untrained__label {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #4b5563;
  }

  /* Same row shape as a trained group, dimmed so the gap still reads as a gap. */
  .wk-mg--muted .wk-mg__dot {
    opacity: 0.45;
  }

  .wk-mg--muted .wk-mg__name {
    color: #64748b;
  }

  .wk-mg--muted .wk-mg__sets strong {
    color: #64748b;
  }

  /* ── Daily volume bars ───────────────────────────────────────────────────── */

  .wk-bars {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.375rem;
    margin-top: 0.875rem;
  }

  .wk-bar {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
  }

  .wk-bar__track {
    width: 100%;
    height: 3.5rem;
    display: flex;
    align-items: flex-end;
    background: #0d1117;
    border-radius: 0.375rem;
    overflow: hidden;
  }

  .wk-bar__fill {
    width: 100%;
    background: #f97316;
    border-radius: 0.375rem;
    transition: height 0.3s ease-out;
  }

  .wk-bar__label {
    font-size: 0.5625rem;
    font-weight: 500;
    color: #4b5563;
    text-transform: uppercase;
  }

  /* ── Rep ranges ──────────────────────────────────────────────────────────── */

  .wk-ranges {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.875rem;
  }

  .wk-range {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.625rem 0.25rem;
    background: #0d1117;
    border-radius: 0.625rem;
  }

  .wk-range__value {
    font-size: 1.0625rem;
    font-weight: 700;
    color: #f97316;
    font-variant-numeric: tabular-nums;
  }

  .wk-range__label {
    font-size: 0.625rem;
    line-height: 1.3;
    color: #4b5563;
    text-align: center;
  }

  /* ── Personal bests ──────────────────────────────────────────────────────── */

  .wk-pb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #0d1117;
    border-radius: 0.625rem;
  }

  .wk-pb__name {
    flex: 1;
    min-width: 0;
    font-size: 0.8125rem;
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wk-pb__value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.8125rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }

  .wk-pb__prev {
    font-size: 0.625rem;
    font-weight: 500;
    color: #4b5563;
  }

  /* ── Sessions ────────────────────────────────────────────────────────────── */

  .wk-session {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #0d1117;
    border-radius: 0.75rem;
    transition: background 0.15s;
  }

  .wk-session:active {
    background: #1e293b;
  }

  .wk-session__body {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
  }

  .wk-session__name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wk-session__meta {
    font-size: 0.6875rem;
    color: #4b5563;
  }

  .wk-session__type {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.625rem;
    border-radius: 999px;
  }

  /* ── Empty state ─────────────────────────────────────────────────────────── */

  .wk-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 2rem 1rem;
  }

  .wk-empty__icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0d1117;
    border-radius: 50%;
    margin-bottom: 0.75rem;
  }
</style>
