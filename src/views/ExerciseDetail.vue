<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { ref, computed, onMounted } from "vue";
  import { useRoute, useRouter } from "vue-router";
  import VueApexCharts from "vue3-apexcharts";
  import type { ApexOptions } from "apexcharts";
  import { useHybridData } from "@/composables/useHybridData";
  import { useExercises } from "@/composables/useExercises";
  import Breadcrumbs from "@/components/Breadcrumbs.vue";
  import ExerciseEditForm from "@/components/ExerciseEditForm.vue";
  import CardioWeeklyChart from "@/components/CardioWeeklyChart.vue";
  import type { ExerciseData, WorkoutSession } from "@/types/workout";
  import { formatDuration, formatDistance, formatPace, isSetCounted } from "@/composables/useSetMetrics";
  import { startOfIsoWeek, getIsoWeekNumber } from "@/composables/useWeekStats";
  import { MUSCLE_GROUP_COLORS } from "@/composables/useTrainingGoals";
  import {
    MIN_PACE_DISTANCE_M,
    activityPace,
    averageEffort,
    cardioRecords,
    cardioWeeks,
    collectCardioActivities,
    formatTotalTime,
    type CardioActivity,
  } from "@/composables/useCardioActivities";

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  /** One counted strength set of this exercise, with where and when it happened. */
  type Performance = {
    id: string;
    sessionId: string;
    weight: number;
    reps: number;
    date: Date;
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const route = useRoute();
  const router = useRouter();
  const workoutData = useHybridData();
  const exercisesStore = useExercises();

  const isLoading = computed(() => workoutData.isLoading.value);
  const exercise = ref<any>(null);
  const showEditForm = ref(false);

  /** Weeks shown in the progress charts. */
  const WEEKS_TO_SHOW = 12;

  // ID match whatever the type (route params are strings).
  const sameId = (a: unknown, b: unknown) => String(a) === String(b);

  /** The main (parent) exercise group. */
  const mainExerciseForEdit = computed<ExerciseData | null>(() => {
    if (!exercise.value) return null;
    const id = exercise.value.id as number;
    const direct = exercisesStore.exercises.value.find((e) => e.id === id);
    if (direct) return direct;
    return exercisesStore.exercises.value.find((e) => e.variants?.some((v) => v.id === id)) ?? null;
  });

  /** True when the current page is for a variant (not a top-level exercise group). */
  const isVariant = computed(() => {
    if (!exercise.value) return false;
    const id = exercise.value.id as number;
    return !exercisesStore.exercises.value.find((e) => e.id === id);
  });

  /** The ExerciseVariant object when viewing a variant page. */
  const currentVariant = computed(() => {
    if (!isVariant.value || !mainExerciseForEdit.value) return null;
    const id = exercise.value.id as number;
    return mainExerciseForEdit.value.variants?.find((v) => v.id === id) ?? null;
  });

  /** Re-reads the exercise after a save in the slide-over, so a rename shows at once. */
  const onEditSaved = () => {
    showEditForm.value = false;
    const id = exercise.value?.id as number | undefined;
    if (!id) return;
    const updated = workoutData.getExerciseById(id);
    if (updated) exercise.value = updated;
  };

  /** Cardio is measured in time and distance, so the load-based analytics say nothing about it. */
  const isCardio = computed(() => exercise.value?.trackingType === "cardio");

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  const formatNumber = (num: number): string => new Intl.NumberFormat("no-NO").format(Math.round(num));

  /** Weights keep their halves: "77,5". */
  const formatKg = (kg: number): string => kg.toLocaleString("no-NO", { maximumFractionDigits: 2 });

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("no-NO", { day: "numeric", month: "short" }).format(d);
  };

  /** "tor. 15. okt." — with the year only when it isn't this one. */
  const formatSessionDate = (date: Date): string => {
    const d = new Date(date);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return new Intl.DateTimeFormat("no-NO", { weekday: "short", day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }).format(d);
  };

  const groupColor = (name: string): string => MUSCLE_GROUP_COLORS[name] ?? "#6b7280";

  const openGoogleSearch = () => {
    if (!exercise.value?.name) return;
    const searchQuery = encodeURIComponent(`${exercise.value.name} strength training exercise`);
    window.open(`https://www.google.com/search?q=${searchQuery}&tbm=isch`, "_blank");
  };

  // ---------------------------------------------------------------------------
  // Sessions with this exercise
  // ---------------------------------------------------------------------------

  /** Completed sessions that include this exercise, newest first. */
  const sessionsWithExercise = computed(() => {
    if (!exercise.value) return [] as Array<{ session: WorkoutSession; entry: any }>;
    return workoutData.sessions.value
      .filter((s) => s.isCompleted)
      .map((session) => ({ session, entry: session.exercises?.find((e) => sameId(e.exerciseId, exercise.value.id)) }))
      .filter((x) => x.entry)
      .sort((a, b) => new Date(b.session.date).getTime() - new Date(a.session.date).getTime());
  });

  /** Every counted strength set of this exercise, newest first. */
  const performances = computed<Performance[]>(() => {
    const out: Performance[] = [];
    sessionsWithExercise.value.forEach(({ session, entry }) => {
      (entry.sets || []).forEach((set: any) => {
        if (!isSetCounted(entry, set)) return;
        out.push({ id: `${session.id}-${set.id}`, sessionId: session.id, weight: Number(set.weight), reps: Number(set.reps), date: new Date(session.date) });
      });
    });
    return out;
  });

  const lastTrainedLabel = computed(() => {
    const latest = isCardio.value ? cardioActivities.value[0]?.date : performances.value[0]?.date;
    if (!latest) return "Ikke trent ennå";
    // Calendar days, so "i går" means yesterday rather than 24–48 hours ago;
    // never negative, in case a session's clock was slightly ahead.
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.max(0, Math.round((startOfDay(new Date()) - startOfDay(new Date(latest))) / 86_400_000));
    if (diffDays === 0) return "Sist trent i dag";
    if (diffDays === 1) return "Sist trent i går";
    if (diffDays < 7) return `Sist trent for ${diffDays} dager siden`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `Sist trent for ${weeks} ${weeks === 1 ? "uke" : "uker"} siden`;
    }
    const months = Math.floor(diffDays / 30);
    return `Sist trent for ${months} ${months === 1 ? "måned" : "måneder"} siden`;
  });

  const sessionCountLabel = computed(() => {
    const n = isCardio.value ? cardioActivities.value.length : new Set(performances.value.map((p) => p.sessionId)).size;
    return isCardio.value ? `${n} ${n === 1 ? "aktivitet" : "aktiviteter"}` : `${n} ${n === 1 ? "økt" : "økter"}`;
  });

  // ---------------------------------------------------------------------------
  // Strength: overview and progress
  // ---------------------------------------------------------------------------

  const strengthStats = computed(() => {
    const sets = performances.value.length;
    const reps = performances.value.reduce((sum, p) => sum + p.reps, 0);
    const avgWeight = sets > 0 ? performances.value.reduce((sum, p) => sum + p.weight, 0) / sets : 0;
    return [
      { label: "Økter", value: String(new Set(performances.value.map((p) => p.sessionId)).size), unit: "" },
      { label: "Sett", value: formatNumber(sets), unit: "" },
      { label: "Reps", value: formatNumber(reps), unit: "" },
      { label: "Snittvekt", value: formatKg(Math.round(avgWeight * 2) / 2), unit: "kg" },
    ];
  });

  /**
   * Heaviest set per week over the last WEEKS_TO_SHOW calendar weeks. Weeks
   * without training stay in as gaps, so a break shows as a break.
   */
  const progressWeeks = computed(() => {
    const end = startOfIsoWeek(new Date());
    const weeks: Array<{ key: number; weekNumber: number; weight: number | null; reps: number }> = [];
    for (let i = WEEKS_TO_SHOW - 1; i >= 0; i--) {
      const start = new Date(end);
      start.setDate(start.getDate() - i * 7);
      weeks.push({ key: start.getTime(), weekNumber: getIsoWeekNumber(start), weight: null, reps: 0 });
    }
    const byKey = new Map(weeks.map((w) => [w.key, w]));
    performances.value.forEach((p) => {
      const week = byKey.get(startOfIsoWeek(p.date).getTime());
      if (!week) return;
      if (week.weight === null || p.weight > week.weight || (p.weight === week.weight && p.reps > week.reps)) {
        week.weight = p.weight;
        week.reps = p.reps;
      }
    });
    return weeks;
  });

  const hasProgress = computed(() => progressWeeks.value.some((w) => w.weight !== null));

  /** Direct labels at the ends — where it started and where it is — instead of a number per point. */
  const progressCaption = computed(() => {
    const points = progressWeeks.value.filter((w) => w.weight !== null);
    if (points.length === 0) return null;
    const first = points[0];
    const last = points[points.length - 1];
    if (points.length === 1) return `${formatKg(last.weight!)} kg i uke ${last.weekNumber}`;
    return `Fra ${formatKg(first.weight!)} kg i uke ${first.weekNumber} til ${formatKg(last.weight!)} kg i uke ${last.weekNumber}`;
  });

  const progressSeries = computed(() => [{ name: "Tyngste sett", data: progressWeeks.value.map((w) => w.weight) }]);

  const axisLabel = { colors: "#94a3b8", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif" };

  const progressOptions = computed<ApexOptions>(() => ({
    chart: {
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "Inter, system-ui, sans-serif",
    },
    colors: ["#f97316"],
    stroke: { curve: "straight", width: 2 },
    // 8px markers with a 2px ring in the panel colour, so overlapping points stay separate.
    markers: { size: 4, strokeColors: "#111827", strokeWidth: 2, hover: { size: 6 } },
    grid: {
      borderColor: "#334155",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 4, right: 8, top: 0, bottom: 0 },
    },
    xaxis: {
      categories: progressWeeks.value.map((w) => String(w.weekNumber)),
      labels: { style: axisLabel, rotate: 0, hideOverlappingLabels: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      tickAmount: 4,
      forceNiceScale: true,
      labels: { style: axisLabel, formatter: (v: number) => (v == null ? "" : formatKg(Math.round(v * 2) / 2)) },
    },
    tooltip: {
      theme: "dark",
      x: { formatter: (_: unknown, opts?: { dataPointIndex: number }) => `Uke ${progressWeeks.value[opts?.dataPointIndex ?? 0]?.weekNumber ?? ""}` },
      y: {
        formatter: (v: number, opts?: { dataPointIndex: number }) => {
          const week = progressWeeks.value[opts?.dataPointIndex ?? 0];
          return v == null ? "" : `${formatKg(v)} kg × ${week?.reps ?? ""}`;
        },
        title: { formatter: () => "" },
      },
      marker: { show: false },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
  }));

  // ---------------------------------------------------------------------------
  // Strength: records, volume, recent sessions
  // ---------------------------------------------------------------------------

  const REP_TARGETS = [1, 3, 4, 6, 8, 10, 12, 14];

  /** Heaviest weight lifted for exactly N reps. */
  const prBoard = computed(() =>
    REP_TARGETS.map((reps) => {
      let best: Performance | null = null;
      performances.value.forEach((p) => {
        if (p.reps === reps && (!best || p.weight > best.weight)) best = p;
      });
      const record = best as Performance | null;
      return { reps, weight: record?.weight ?? null, date: record?.date ?? null };
    }),
  );

  const volumeStats = computed(() => {
    const byWeek = new Map<number, number>();
    const byMonth = new Map<string, { date: Date; volume: number }>();

    performances.value.forEach((p) => {
      const volume = p.weight * p.reps;
      const week = startOfIsoWeek(p.date).getTime();
      byWeek.set(week, (byWeek.get(week) ?? 0) + volume);
      const monthKey = `${p.date.getFullYear()}-${p.date.getMonth()}`;
      const month = byMonth.get(monthKey) ?? { date: new Date(p.date.getFullYear(), p.date.getMonth(), 1), volume: 0 };
      month.volume += volume;
      byMonth.set(monthKey, month);
    });

    const bestWeekEntry = [...byWeek.entries()].sort((a, b) => b[1] - a[1])[0];
    const bestMonthEntry = [...byMonth.values()].sort((a, b) => b.volume - a.volume)[0];

    // Calendar weeks: the last four (this one included) against the four before them.
    const thisWeek = startOfIsoWeek(new Date());
    const sumWeeks = (fromAgo: number, toAgo: number) => {
      let sum = 0;
      for (let i = fromAgo; i < toAgo; i++) {
        const start = new Date(thisWeek);
        start.setDate(start.getDate() - i * 7);
        sum += byWeek.get(start.getTime()) ?? 0;
      }
      return sum;
    };
    const last4 = sumWeeks(0, 4);
    const prev4 = sumWeeks(4, 8);

    return {
      bestWeek: bestWeekEntry ? { volume: bestWeekEntry[1], weekNumber: getIsoWeekNumber(new Date(bestWeekEntry[0])) } : null,
      bestMonth: bestMonthEntry
        ? { volume: bestMonthEntry.volume, label: new Intl.DateTimeFormat("no-NO", { month: "long", year: "numeric" }).format(bestMonthEntry.date) }
        : null,
      trend: prev4 > 0 ? Math.round(((last4 - prev4) / prev4) * 100) : null,
    };
  });

  /** Average load per rep in the six most recent weeks with training, oldest first. */
  const intensityWeeks = computed(() => {
    const byWeek = new Map<number, { volume: number; reps: number }>();
    performances.value.forEach((p) => {
      const key = startOfIsoWeek(p.date).getTime();
      const week = byWeek.get(key) ?? { volume: 0, reps: 0 };
      week.volume += p.weight * p.reps;
      week.reps += p.reps;
      byWeek.set(key, week);
    });
    return [...byWeek.entries()]
      .sort((a, b) => b[0] - a[0])
      .slice(0, 6)
      .reverse()
      .map(([key, w]) => ({ key, weekNumber: getIsoWeekNumber(new Date(key)), kgPerRep: w.reps > 0 ? w.volume / w.reps : 0 }));
  });

  /**
   * The last few sessions with this exercise, each led by its heaviest set —
   * reading down the list shows the progression. Every set is one tap away in
   * the session itself.
   */
  const recentSessions = computed(() =>
    sessionsWithExercise.value
      .map(({ session, entry }) => {
        const sets = (entry.sets || []).filter((set: any) => isSetCounted(entry, set));
        // Heaviest by weight; on equal weight, more reps wins.
        const top = sets.reduce(
          (best: { weight: number; reps: number }, set: any) => {
            const weight = Number(set.weight);
            const reps = Number(set.reps);
            return weight > best.weight || (weight === best.weight && reps > best.reps) ? { weight, reps } : best;
          },
          { weight: 0, reps: 0 },
        );
        return {
          id: session.id,
          name: session.templateName,
          date: new Date(session.date),
          topWeight: top.weight,
          topReps: top.reps,
          volume: sets.reduce((sum: number, set: any) => sum + Number(set.weight) * Number(set.reps), 0),
          count: sets.length,
        };
      })
      .filter((s) => s.count > 0)
      .slice(0, 5),
  );

  // ---------------------------------------------------------------------------
  // Cardio
  // ---------------------------------------------------------------------------

  /** Every finished activity with this exercise, newest first. */
  const cardioActivities = computed<CardioActivity[]>(() => {
    if (!exercise.value || !isCardio.value) return [];
    return collectCardioActivities(workoutData.sessions.value || []).filter((a) => sameId(a.exerciseId, exercise.value.id));
  });

  const recentCardio = computed(() => cardioActivities.value.slice(0, 8));

  const cardioWeekly = computed(() => cardioWeeks(cardioActivities.value, new Date(), WEEKS_TO_SHOW));

  const cardioStats = computed(() => {
    const activities = cardioActivities.value;
    const seconds = activities.reduce((sum, a) => sum + a.seconds, 0);
    const metres = activities.reduce((sum, a) => sum + a.metres, 0);
    const effort = averageEffort(activities);

    const stats = [
      { label: "Total tid", value: formatTotalTime(seconds) },
      { label: "Snitt per aktivitet", value: activities.length > 0 ? formatDuration(seconds / activities.length) : "–" },
    ];
    if (metres > 0) stats.push({ label: "Distanse", value: formatDistance(metres) });
    if (effort !== null) stats.push({ label: "Snitt anstrengelse", value: `${String(effort).replace(".", ",")}/10` });
    return stats;
  });

  const cardioRecordTiles = computed(() => {
    const records = cardioRecords(cardioActivities.value);
    const tiles: Array<{ label: string; value: string; detail: string }> = [];

    if (records.longest) {
      tiles.push({ label: "Lengste aktivitet", value: formatDuration(records.longest.seconds), detail: formatDate(records.longest.date) });
    }
    if (records.farthest) {
      tiles.push({ label: "Lengste distanse", value: formatDistance(records.farthest.metres), detail: formatDate(records.farthest.date) });
    }
    if (records.fastestPace) {
      // formatPace over one kilometre is the pace itself.
      tiles.push({ label: "Raskeste tempo", value: formatPace(records.fastestPace.secPerKm, 1000) ?? "–", detail: `Runde på minst ${MIN_PACE_DISTANCE_M} m` });
    }
    if (records.bestWeek) {
      tiles.push({ label: "Beste uke", value: formatTotalTime(records.bestWeek.seconds), detail: `Uke ${records.bestWeek.weekNumber}` });
    }
    return tiles;
  });

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  onMounted(() => {
    const exerciseId = route.params.id as string;
    const foundExercise = workoutData.getExerciseById(exerciseId);
    if (foundExercise) exercise.value = foundExercise;
    else router.push("/exercises");
  });
</script>

<template>
  <div class="space-y-5 pb-24 md:pb-8">
    <Breadcrumbs
      :breadcrumbs="[
        { name: 'Øvelser', path: '/exercises' },
        { name: exercise?.name || 'Øvelse' },
      ]" />

    <!-- Header -->
    <header class="flex items-center gap-3">
      <router-link
        to="/exercises"
        class="inline-flex items-center justify-center w-10 h-10 flex-shrink-0 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors"
        aria-label="Tilbake til øvelser">
        <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </router-link>

      <div class="min-w-0 flex-1">
        <h1 class="ed-title" @click="openGoogleSearch">{{ exercise?.name }}</h1>
        <p v-if="exercise" class="ed-meta">
          <span v-for="group in exercise.muscleGroups ?? []" :key="group" class="ed-meta__group">
            <span class="ed-meta__dot" :style="{ backgroundColor: groupColor(group) }"></span>
            {{ group }}
          </span>
          <span>{{ sessionCountLabel }}</span>
        </p>
        <!-- Own line: as a third meta item it wraps on phones and leaves a stray "·" -->
        <p v-if="exercise" class="ed-meta-sub">{{ lastTrainedLabel }}</p>
      </div>

      <button type="button" class="ed-icon-btn" title="Rediger" aria-label="Rediger øvelse" @click="showEditForm = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </header>

    <!-- Unified edit drawer for both variants and groups -->
    <ExerciseEditForm
      v-model:visible="showEditForm"
      :variant="isVariant ? currentVariant : null"
      :parent-exercise-id="isVariant ? (mainExerciseForEdit?.id ?? null) : null"
      :exercise="!isVariant ? mainExerciseForEdit : null"
      @saved="onEditSaved"
      @deleted="router.push('/exercises')" />

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4 animate-pulse">
      <div class="ed-panel h-72"></div>
      <div class="ed-panel h-40"></div>
    </div>

    <!-- Not found -->
    <div v-else-if="!exercise" class="ed-panel ed-empty">
      <p class="text-dark-300 text-sm">Øvelse ikke funnet.</p>
    </div>

    <!-- ── Cardio ─────────────────────────────────────────────────────────── -->
    <template v-else-if="isCardio">
      <section class="ed-panel">
        <h2 class="ed-section-title"><span class="ed-section-title__dot ed-section-title__dot--cardio"></span>Oversikt</h2>
        <dl class="ed-stats">
          <div v-for="stat in cardioStats" :key="stat.label" class="ed-stat">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>
        <div class="ed-divider">
          <CardioWeeklyChart :weeks="cardioWeekly" />
        </div>
      </section>

      <section v-if="cardioRecordTiles.length > 0" class="ed-panel">
        <h2 class="ed-section-title">Rekorder</h2>
        <dl class="ed-stats ed-stats--records">
          <div v-for="record in cardioRecordTiles" :key="record.label" class="ed-stat">
            <dt>{{ record.label }}</dt>
            <dd>{{ record.value }}</dd>
            <p class="ed-stat__detail">{{ record.detail }}</p>
          </div>
        </dl>
      </section>

      <section class="space-y-2">
        <h2 class="ed-list-title">Siste aktiviteter</h2>
        <div v-if="recentCardio.length === 0" class="ed-panel ed-empty">
          <p class="text-dark-300 text-sm">Ingen aktiviteter ennå.</p>
        </div>
        <div v-else class="ed-panel ed-panel--list">
          <router-link v-for="activity in recentCardio" :key="activity.key" :to="`/session/${activity.sessionId}`" class="ed-row">
            <div class="ed-row__main">
              <p class="ed-row__name">
                {{ formatDuration(activity.seconds) }}<span v-if="activity.metres > 0" class="ed-row__soft"> · {{ formatDistance(activity.metres) }}</span>
              </p>
              <p class="ed-row__meta">
                {{ formatSessionDate(activity.date) }} · {{ activity.sessionName }}<template v-if="activity.rounds.length > 1"> · {{ activity.rounds.length }} runder</template>
              </p>
              <p v-if="activity.note" class="ed-row__note">{{ activity.note }}</p>
            </div>
            <div class="ed-row__side">
              <span v-if="activity.effort" class="ed-pill">{{ activity.effort }}/10</span>
              <span v-if="activityPace(activity.rounds)" class="ed-row__pace">{{ activityPace(activity.rounds) }}</span>
            </div>
            <svg class="ed-row__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </router-link>
        </div>
      </section>
    </template>

    <!-- ── Strength ───────────────────────────────────────────────────────── -->
    <template v-else>
      <!-- Overview and progress: one panel -->
      <section class="ed-panel">
        <h2 class="ed-section-title"><span class="ed-section-title__dot ed-section-title__dot--strength"></span>Fremgang</h2>
        <dl class="ed-stats">
          <div v-for="stat in strengthStats" :key="stat.label" class="ed-stat">
            <dt>{{ stat.label }}</dt>
            <dd>
              {{ stat.value }}<span v-if="stat.unit" class="ed-stat__unit">{{ stat.unit }}</span>
            </dd>
          </div>
        </dl>

        <div class="ed-divider">
          <h3 class="ed-sub-title">Tyngste sett per uke</h3>
          <p class="ed-chart-unit">Kilo · siste {{ WEEKS_TO_SHOW }} uker</p>
          <div v-if="!hasProgress" class="ed-chart-empty">Ingen sett i perioden ennå.</div>
          <template v-else>
            <VueApexCharts type="line" height="200" :options="progressOptions" :series="progressSeries" />
            <p v-if="progressCaption" class="ed-caption">{{ progressCaption }}</p>
          </template>
        </div>
      </section>

      <!-- Records -->
      <section class="ed-panel">
        <h2 class="ed-section-title">Rekorder</h2>
        <p class="ed-section-hint">Tyngste vekt for nøyaktig så mange reps.</p>
        <div class="ed-pr">
          <div v-for="pr in prBoard" :key="pr.reps" class="ed-pr__cell">
            <span class="ed-pr__reps">{{ pr.reps }} ×</span>
            <span class="ed-pr__weight" :class="{ 'ed-pr__weight--empty': pr.weight === null }">
              <template v-if="pr.weight !== null">{{ formatKg(pr.weight) }}<span class="ed-stat__unit">kg</span></template>
              <template v-else>–</template>
            </span>
            <span v-if="pr.date" class="ed-pr__date">{{ formatDate(pr.date) }}</span>
          </div>
        </div>
      </section>

      <!-- Volume and intensity -->
      <section v-if="volumeStats.bestWeek" class="ed-panel">
        <h2 class="ed-section-title">Volum</h2>
        <div class="ed-lines">
          <div class="ed-line">
            <span class="ed-line__label">Beste uke</span>
            <span class="ed-line__value">
              {{ formatNumber(volumeStats.bestWeek.volume) }} kg <span class="ed-line__soft">uke {{ volumeStats.bestWeek.weekNumber }}</span>
            </span>
          </div>
          <div v-if="volumeStats.bestMonth" class="ed-line">
            <span class="ed-line__label">Beste måned</span>
            <span class="ed-line__value">
              {{ formatNumber(volumeStats.bestMonth.volume) }} kg <span class="ed-line__soft">{{ volumeStats.bestMonth.label }}</span>
            </span>
          </div>
          <div class="ed-line">
            <span class="ed-line__label">Siste 4 uker mot 4 før</span>
            <span v-if="volumeStats.trend !== null" class="ed-line__value" :class="volumeStats.trend >= 0 ? 'ed-line__value--up' : 'ed-line__value--down'">
              {{ volumeStats.trend > 0 ? "+" : "" }}{{ volumeStats.trend }} %
            </span>
            <span v-else class="ed-line__value ed-line__soft">For lite data</span>
          </div>
        </div>

        <!-- Numbers, not bars: the values sit close together, and bars from zero would all look alike -->
        <div v-if="intensityWeeks.length > 0" class="ed-divider">
          <h3 class="ed-sub-title">Snitt kg per rep</h3>
          <div class="ed-strip">
            <div v-for="week in intensityWeeks" :key="week.key" class="ed-strip__cell">
              <span class="ed-strip__label">Uke {{ week.weekNumber }}</span>
              <span class="ed-strip__value">{{ formatKg(Math.round(week.kgPerRep * 10) / 10) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Recent sessions -->
      <section class="space-y-2">
        <h2 class="ed-list-title">
          <span>Siste økter</span>
          <span v-if="recentSessions.length > 0" class="ed-list-title__hint">Tyngste sett og volum</span>
        </h2>
        <div v-if="recentSessions.length === 0" class="ed-panel ed-empty">
          <p class="text-dark-300 text-sm">Ingen økter med denne øvelsen ennå.</p>
        </div>
        <div v-else class="ed-panel ed-panel--list">
          <router-link v-for="s in recentSessions" :key="s.id" :to="`/session/${s.id}`" class="ed-row">
            <div class="ed-row__main">
              <!-- One line on purpose: spacing comes from CSS, not from template whitespace Vue may drop -->
              <p class="ed-row__name">{{ formatKg(s.topWeight) }}<span class="ed-stat__unit">kg</span><span class="ed-row__times">×</span>{{ s.topReps }}</p>
              <p class="ed-row__meta">{{ formatSessionDate(s.date) }} · {{ s.name }} · {{ s.count }} sett</p>
            </div>
            <div class="ed-row__side">
              <span class="ed-row__value">{{ formatNumber(s.volume) }}<span class="ed-stat__unit">kg</span></span>
              <span class="ed-row__label">volum</span>
            </div>
            <svg class="ed-row__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </router-link>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
  /* ── Header ──────────────────────────────────────────────────────────────── */

  .ed-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ed-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.625rem;
    margin-top: 0.25rem;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  .ed-meta > span + span::before {
    content: "·";
    margin-right: 0.625rem;
    color: #475569;
  }

  .ed-meta-sub {
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .ed-meta__group {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .ed-meta__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  .ed-icon-btn {
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

  .ed-icon-btn:active {
    color: #fff;
    background: #334155;
  }

  /* ── Panels and titles ───────────────────────────────────────────────────── */

  .ed-panel {
    padding: 1.125rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
  }

  /* Navigable rows run edge to edge, so the pressed state fills the row. */
  .ed-panel--list {
    padding: 0;
    overflow: hidden;
  }

  .ed-empty {
    padding: 2rem 1rem;
    text-align: center;
  }

  .ed-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .ed-section-title__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }

  .ed-section-title__dot--strength {
    background: #f97316;
  }

  .ed-section-title__dot--cardio {
    background: #06b6d4;
  }

  .ed-section-hint {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Group heading above a list panel, like the months in Historikk. */
  .ed-list-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .ed-list-title__hint {
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: #64748b;
  }

  .ed-sub-title {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
  }

  .ed-divider {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #1f2937;
  }

  /* ── Key figures ─────────────────────────────────────────────────────────── */

  .ed-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.875rem 1rem;
    margin-top: 0.875rem;
  }

  @media (min-width: 640px) {
    .ed-stats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .ed-stat dt {
    font-size: 0.6875rem;
    color: #64748b;
  }

  .ed-stat dd {
    margin-top: 0.125rem;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.15;
    color: #fff;
    white-space: nowrap;
  }

  .ed-stat__unit {
    margin-left: 0.1875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .ed-stat__detail {
    margin-top: 0.125rem;
    font-size: 0.6875rem;
    color: #64748b;
  }

  /* ── Charts ──────────────────────────────────────────────────────────────── */

  .ed-chart-unit {
    margin-top: 0.125rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .ed-chart-empty {
    padding: 2rem 0;
    font-size: 0.875rem;
    color: #64748b;
    text-align: center;
  }

  .ed-caption {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  /* ── Records ─────────────────────────────────────────────────────────────── */

  .ed-pr {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem 0.75rem;
    margin-top: 0.875rem;
  }

  .ed-pr__cell {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .ed-pr__reps {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
  }

  .ed-pr__weight {
    font-size: 1.0625rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }

  .ed-pr__weight--empty {
    color: #475569;
  }

  .ed-pr__date {
    font-size: 0.6875rem;
    color: #64748b;
  }

  /* ── Volume ──────────────────────────────────────────────────────────────── */

  .ed-lines {
    margin-top: 0.5rem;
  }

  .ed-line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0;
  }

  .ed-line + .ed-line {
    border-top: 1px solid #1f2937;
  }

  .ed-line__label {
    font-size: 0.875rem;
    color: #cbd5e1;
  }

  .ed-line__value {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #fff;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .ed-line__soft {
    font-weight: 500;
    font-size: 0.8125rem;
    color: #64748b;
  }

  .ed-line__value--up {
    color: #22c55e;
  }

  .ed-line__value--down {
    color: #f87171;
  }

  .ed-strip {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 0.625rem;
  }

  .ed-strip__cell {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .ed-strip__label {
    font-size: 0.6875rem;
    color: #64748b;
    white-space: nowrap;
  }

  .ed-strip__value {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #fff;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* ── Navigable rows ──────────────────────────────────────────────────────── */

  .ed-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.125rem;
    transition: background 0.15s;
  }

  .ed-row + .ed-row {
    border-top: 1px solid #1f2937;
  }

  .ed-row:active {
    background: #161f2e;
  }

  @media (hover: hover) {
    .ed-row:hover {
      background: #161f2e;
    }
  }

  .ed-row__main {
    flex: 1;
    min-width: 0;
  }

  .ed-row__name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ed-row__soft {
    color: #cbd5e1;
  }

  .ed-row__times {
    margin: 0 0.3125rem;
    font-weight: 500;
    color: #64748b;
  }

  .ed-row__label {
    font-size: 0.6875rem;
    color: #64748b;
  }

  .ed-row__meta {
    margin-top: 0.1875rem;
    font-size: 0.75rem;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ed-row__note {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ed-row__side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .ed-row__value {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #fff;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .ed-row__pace {
    font-size: 0.75rem;
    color: #cbd5e1;
  }

  .ed-row__chevron {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: #475569;
  }

  .ed-pill {
    padding: 0.0625rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #fdba74;
    background: #f9731618;
    border: 1px solid #f9731640;
    border-radius: 999px;
  }
</style>
