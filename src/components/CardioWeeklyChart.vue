<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { computed, ref } from "vue";
  import VueApexCharts from "vue3-apexcharts";
  import type { ApexOptions } from "apexcharts";
  import { formatTotalTime, type CardioWeek } from "@/composables/useCardioActivities";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  /**
   * Cardio per week as columns — time by default, distance on request. One
   * measure at a time on one axis: minutes and kilometres don't share a scale.
   */
  const props = defineProps<{
    weeks: CardioWeek[];
    title?: string;
  }>();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const hasDistance = computed(() => props.weeks.some((w) => w.metres > 0));
  const measure = ref<"time" | "distance">("time");
  const showDistance = computed(() => measure.value === "distance" && hasDistance.value);

  const valueOf = (week: CardioWeek): number => (showDistance.value ? Math.round(week.metres / 100) / 10 : Math.round(week.seconds / 60));

  const values = computed(() => props.weeks.map(valueOf));
  const hasData = computed(() => values.value.some((v) => v > 0));

  /** Minutes as "45 min" or "2 t 5 min"; kilometres with one decimal. */
  const formatValue = (value: number): string =>
    showDistance.value ? `${value.toLocaleString("no-NO", { maximumFractionDigits: 1 })} km` : formatTotalTime(value * 60);

  /** Selective direct labels: the average and the best week, not a number per column. */
  const caption = computed(() => {
    if (!hasData.value) return null;
    const total = values.value.reduce((sum, v) => sum + v, 0);
    const average = total / values.value.length;
    const bestIndex = values.value.indexOf(Math.max(...values.value));
    return {
      average: formatValue(showDistance.value ? Math.round(average * 10) / 10 : Math.round(average)),
      best: `uke ${props.weeks[bestIndex].weekNumber}, ${formatValue(values.value[bestIndex])}`,
    };
  });

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------

  const series = computed(() => [{ name: showDistance.value ? "Distanse" : "Tid", data: values.value }]);

  const axisLabel = { colors: "#94a3b8", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif" };

  const options = computed<ApexOptions>(() => ({
    chart: {
      type: "bar",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      parentHeightOffset: 0,
      fontFamily: "Inter, system-ui, sans-serif",
    },
    colors: ["#06b6d4"],
    plotOptions: {
      bar: { columnWidth: "45%", borderRadius: 4, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#334155",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 4, right: 4, top: 0, bottom: 0 },
    },
    xaxis: {
      categories: props.weeks.map((w) => String(w.weekNumber)),
      labels: { style: axisLabel, rotate: 0, hideOverlappingLabels: true },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      tickAmount: 4,
      forceNiceScale: true,
      labels: {
        style: axisLabel,
        formatter: (v: number) => (showDistance.value ? `${Math.round(v * 10) / 10}` : `${Math.round(v)}`),
      },
    },
    tooltip: {
      theme: "dark",
      x: { formatter: (_: unknown, opts?: { dataPointIndex: number }) => `Uke ${props.weeks[opts?.dataPointIndex ?? 0]?.weekNumber ?? ""}` },
      y: { formatter: (v: number) => formatValue(v), title: { formatter: () => "" } },
      marker: { show: false },
    },
    states: {
      hover: { filter: { type: "lighten" } },
      active: { filter: { type: "none" } },
    },
    legend: { show: false },
  }));
</script>

<template>
  <div class="cweek">
    <div class="cweek__head">
      <h3 class="cweek__title">{{ title ?? "Per uke" }}</h3>
      <div v-if="hasDistance" class="cweek__toggle" role="group" aria-label="Vis tid eller distanse">
        <button type="button" class="cweek__toggle-btn" :class="{ 'cweek__toggle-btn--active': !showDistance }" :aria-pressed="!showDistance" @click="measure = 'time'">
          Tid
        </button>
        <button type="button" class="cweek__toggle-btn" :class="{ 'cweek__toggle-btn--active': showDistance }" :aria-pressed="showDistance" @click="measure = 'distance'">
          Km
        </button>
      </div>
    </div>

    <p class="cweek__unit">{{ showDistance ? "Kilometer" : "Minutter" }} per uke · siste {{ weeks.length }} uker</p>

    <div v-if="!hasData" class="cweek__empty">Ingen kondisjon i perioden ennå.</div>
    <template v-else>
      <VueApexCharts type="bar" height="200" :options="options" :series="series" />
      <p v-if="caption" class="cweek__caption">
        Snitt <strong>{{ caption.average }}</strong> per uke · Best {{ caption.best }}
      </p>
    </template>
  </div>
</template>

<style scoped>
  .cweek__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .cweek__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #fff;
  }

  .cweek__unit {
    margin-top: 0.125rem;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .cweek__toggle {
    display: inline-flex;
    padding: 0.1875rem;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 0.625rem;
  }

  .cweek__toggle-btn {
    min-width: 3rem;
    min-height: 2rem;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #94a3b8;
    border-radius: 0.4375rem;
    cursor: pointer;
  }

  .cweek__toggle-btn--active {
    color: #fff;
    background: #334155;
  }

  .cweek__empty {
    padding: 2rem 0;
    font-size: 0.875rem;
    color: #64748b;
    text-align: center;
  }

  .cweek__caption {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .cweek__caption strong {
    color: #e2e8f0;
    font-weight: 600;
  }
</style>
