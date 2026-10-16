<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { ref, computed } from "vue";
  import { useHybridData } from "@/composables/useHybridData";
  import FilterModal from "@/components/FilterModal.vue";
  import type { WorkoutSession } from "@/types/workout";
  import { formatDistance, formatDuration, isCardioExercise, isSetCounted, setDistance, setDuration } from "@/composables/useSetMetrics";
  import { formatTotalTime } from "@/composables/useCardioActivities";

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const workoutData = useHybridData();

  const isLoading = computed(() => workoutData.isLoading.value);

  const searchQuery = ref("");
  const selectedTypes = ref<string[]>([]);
  const sortBy = ref("date");
  const showFilterModal = ref(false);

  /** Sessions shown before "Last inn flere". */
  const PAGE_SIZE = 30;
  const visibleCount = ref(PAGE_SIZE);

  // ---------------------------------------------------------------------------
  // Filtering and sorting
  // ---------------------------------------------------------------------------

  const getTotalSets = (session: WorkoutSession): number => session.exercises.reduce((total, ex) => total + ex.sets.length, 0);

  const filteredSessions = computed(() => {
    let sessions = workoutData.completedSessions.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      sessions = sessions.filter((s) => s.templateName.toLowerCase().includes(query));
    }

    if (selectedTypes.value.length > 0) {
      sessions = sessions.filter((s) => selectedTypes.value.includes(s.workoutType));
    }

    return [...sessions].sort((a, b) => {
      switch (sortBy.value) {
        case "volume":
          return (b.totalVolume || 0) - (a.totalVolume || 0);
        case "volume-asc":
          return (a.totalVolume || 0) - (b.totalVolume || 0);
        case "duration":
          return b.duration - a.duration;
        case "duration-asc":
          return a.duration - b.duration;
        case "exercises":
          return b.exercises.length - a.exercises.length;
        case "sets":
          return getTotalSets(b) - getTotalSets(a);
        case "name":
          return a.templateName.localeCompare(b.templateName, "no");
        case "name-desc":
          return b.templateName.localeCompare(a.templateName, "no");
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "date":
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  });

  const pagedSessions = computed(() => filteredSessions.value.slice(0, visibleCount.value));
  const loadMore = () => {
    visibleCount.value += PAGE_SIZE;
  };

  const hasActiveFilters = computed(() => Boolean(searchQuery.value) || selectedTypes.value.length > 0);

  const addType = (typeId: string) => {
    if (!selectedTypes.value.includes(typeId)) selectedTypes.value = [...selectedTypes.value, typeId];
  };

  const removeType = (typeId: string) => {
    selectedTypes.value = selectedTypes.value.filter((id) => id !== typeId);
  };

  const onTypeToggle = (event: Event, typeId: string) => {
    if ((event.target as HTMLInputElement).checked) addType(typeId);
    else removeType(typeId);
  };

  const clearAllFilters = () => {
    searchQuery.value = "";
    selectedTypes.value = [];
    sortBy.value = "date";
    showFilterModal.value = false;
  };

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------

  const formatNumber = (num: number): string => new Intl.NumberFormat("no-NO").format(Math.round(num));

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

  /**
   * What a row leads with: kilos for a strength session, time for a cardio one.
   * A mixed session leads with kilos and flags "+ kondisjon" underneath, so the
   * two never share a number.
   */
  const rowFor = (session: WorkoutSession) => {
    let cardioSeconds = 0;
    let cardioMetres = 0;
    let hasStrength = false;

    session.exercises.forEach((ex) => {
      if (!isCardioExercise(ex)) {
        if (ex.sets.some((set) => isSetCounted(ex, set))) hasStrength = true;
        return;
      }
      ex.sets.forEach((set) => {
        if (!isSetCounted(ex, set)) return;
        cardioSeconds += setDuration(ex, set);
        cardioMetres += setDistance(ex, set);
      });
    });

    const meta = [formatDate(session.date), formatTotalTime(session.duration * 60)];
    const hasCardio = cardioSeconds > 0 || cardioMetres > 0;

    if (hasStrength) {
      return { meta, value: formatNumber(session.totalVolume || 0), unit: "kg", label: hasCardio ? "+ kondisjon" : "volum", cardio: hasCardio };
    }
    if (hasCardio) {
      return { meta, value: formatDuration(cardioSeconds), unit: "", label: cardioMetres > 0 ? formatDistance(cardioMetres) : "kondisjon", cardio: true };
    }
    return { meta, value: "–", unit: "", label: "", cardio: false };
  };

  /**
   * Month groups while the list is in date order; one plain list otherwise,
   * since "October" means nothing in a list sorted by volume.
   */
  const groups = computed(() => {
    const byDate = sortBy.value === "date" || sortBy.value === "date-asc";
    const withRows = (sessions: WorkoutSession[]) => sessions.map((session) => ({ session, row: rowFor(session) }));
    if (!byDate) return [{ key: "all", label: null as string | null, count: pagedSessions.value.length, items: withRows(pagedSessions.value) }];

    const monthFormat = new Intl.DateTimeFormat("no-NO", { month: "long", year: "numeric" });
    const result: Array<{ key: string; label: string | null; count: number; sessions: WorkoutSession[] }> = [];
    // Counts come from the full filtered list, so a month cut by paging still shows its real size.
    const monthTotals = new Map<string, number>();
    filteredSessions.value.forEach((s) => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthTotals.set(key, (monthTotals.get(key) ?? 0) + 1);
    });

    pagedSessions.value.forEach((session) => {
      const d = new Date(session.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let group = result[result.length - 1];
      if (!group || group.key !== key) {
        group = { key, label: monthFormat.format(d), count: monthTotals.get(key) ?? 0, sessions: [] };
        result.push(group);
      }
      group.sessions.push(session);
    });
    return result.map(({ sessions, ...group }) => ({ ...group, items: withRows(sessions) }));
  });

  const getWorkoutTypeName = (typeId: string): string => workoutData.getWorkoutType(typeId);
  const getWorkoutTypeColor = (typeId: string): string => workoutData.getWorkoutTypeColor(typeId);
</script>

<template>
  <div class="space-y-5 pb-24 md:pb-8">
    <!-- Header -->
    <header class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="hx-title">Historikk</h1>
        <p v-if="!isLoading" class="hx-meta">
          {{ filteredSessions.length }} {{ filteredSessions.length === 1 ? "økt" : "økter" }}<template v-if="hasActiveFilters"> · filtrert</template>
        </p>
      </div>

      <button type="button" class="hx-filter-btn" :class="{ 'hx-filter-btn--active': hasActiveFilters }" @click="showFilterModal = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
        </svg>
        Filtre
        <span v-if="hasActiveFilters" class="hx-filter-btn__dot"></span>
      </button>
    </header>

    <!-- Active filters -->
    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
      <button v-if="searchQuery" type="button" class="hx-pill" @click="searchQuery = ''">
        «{{ searchQuery }}»
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <button v-for="typeId in selectedTypes" :key="typeId" type="button" class="hx-pill" @click="removeType(typeId)">
        {{ getWorkoutTypeName(typeId) }}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <button type="button" class="hx-clear" @click="clearAllFilters">Nullstill</button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="hx-panel animate-pulse">
      <div v-for="i in 6" :key="i" class="hx-row hx-row--skeleton">
        <div class="space-y-2 flex-1">
          <div class="h-4 bg-dark-700 rounded w-32"></div>
          <div class="h-3 bg-dark-700 rounded w-48"></div>
        </div>
        <div class="h-4 bg-dark-700 rounded w-14"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredSessions.length === 0" class="hx-panel hx-empty">
      <p class="text-dark-300 text-sm">{{ hasActiveFilters ? "Ingen økter passer filtrene." : "Ingen fullførte økter ennå." }}</p>
      <button v-if="hasActiveFilters" type="button" class="btn-secondary btn-sm mt-3" @click="clearAllFilters">Nullstill filtre</button>
      <router-link v-else to="/" class="btn-primary btn-sm mt-3">Start din første økt</router-link>
    </div>

    <!-- Sessions, one panel per month -->
    <template v-else>
      <section v-for="group in groups" :key="group.key" class="space-y-2">
        <h2 v-if="group.label" class="hx-month">
          <span>{{ group.label }}</span>
          <span class="hx-month__count">{{ group.count }} {{ group.count === 1 ? "økt" : "økter" }}</span>
        </h2>

        <div class="hx-panel">
          <router-link v-for="{ session, row } in group.items" :key="session.id" :to="`/session/${session.id}`" class="hx-row">
            <div class="hx-row__main">
              <p class="hx-row__name">
                <span class="hx-row__dot" :style="{ backgroundColor: getWorkoutTypeColor(session.workoutType) }"></span>
                <span class="truncate">{{ session.templateName }}</span>
              </p>
              <p class="hx-row__meta">{{ row.meta.join(" · ") }}</p>
            </div>

            <div class="hx-row__side">
              <p class="hx-row__value">
                {{ row.value }}<span v-if="row.unit" class="hx-row__unit">{{ row.unit }}</span>
              </p>
              <p class="hx-row__label" :class="{ 'hx-row__label--cardio': row.cardio }">{{ row.label }}</p>
            </div>

            <svg class="hx-row__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </router-link>
        </div>
      </section>

      <div v-if="filteredSessions.length > visibleCount" class="flex justify-center">
        <button type="button" class="btn-secondary btn-sm" @click="loadMore">Last inn flere</button>
      </div>
    </template>

    <!-- Filter modal -->
    <FilterModal
      :is-visible="showFilterModal"
      title="Filtrer historikk"
      apply-text="Bruk filtre"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @clear-all="clearAllFilters">
      <!-- Search -->
      <div>
        <label class="block text-sm font-medium text-white mb-2">Søk etter økt</label>
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input v-model="searchQuery" type="text" class="input-field w-full pl-10 text-base" placeholder="Søk etter økt navn..." />
        </div>
      </div>

      <!-- Workout types -->
      <div>
        <label class="block text-sm font-medium text-white mb-2">Økt Typer</label>
        <div class="space-y-2">
          <div v-for="type in workoutData.workoutTypes.value" :key="type.id" class="flex items-center gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                :checked="selectedTypes.includes(type.id)"
                class="form-checkbox h-4 w-4 text-primary-500 rounded bg-dark-600 border-dark-500"
                @change="(event) => onTypeToggle(event, type.id)" />
              <span class="text-dark-200">{{ type.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Sort -->
      <div>
        <label class="block text-sm font-medium text-white mb-2">Sorter etter</label>
        <select v-model="sortBy" class="input-field w-full">
          <option value="date">Dato (nyeste først)</option>
          <option value="date-asc">Dato (eldste først)</option>
          <option value="volume">Volum (høyest først)</option>
          <option value="volume-asc">Volum (lavest først)</option>
          <option value="duration">Varighet (lengst først)</option>
          <option value="duration-asc">Varighet (kortest først)</option>
          <option value="exercises">Antall øvelser</option>
          <option value="sets">Antall sett</option>
          <option value="name">Navn (A-Å)</option>
          <option value="name-desc">Navn (Å-A)</option>
        </select>
      </div>
    </FilterModal>
  </div>
</template>

<style scoped>
  /* ── Header ──────────────────────────────────────────────────────────────── */

  .hx-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
  }

  .hx-meta {
    margin-top: 0.25rem;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  .hx-filter-btn {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.5rem;
    padding: 0 0.875rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #e2e8f0;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    cursor: pointer;
  }

  .hx-filter-btn--active {
    color: #fdba74;
    background: #f9731618;
    border-color: #f9731640;
  }

  .hx-filter-btn__dot {
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 50%;
    background: #f97316;
  }

  /* ── Active filters ──────────────────────────────────────────────────────── */

  .hx-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2rem;
    min-width: auto;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #fdba74;
    background: #f9731618;
    border: 1px solid #f9731640;
    border-radius: 999px;
    cursor: pointer;
  }

  .hx-clear {
    min-height: 2rem;
    min-width: auto;
    padding: 0 0.5rem;
    font-size: 0.8125rem;
    color: #94a3b8;
    cursor: pointer;
  }

  /* ── Month heading ───────────────────────────────────────────────────────── */

  .hx-month {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .hx-month__count {
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: #64748b;
  }

  /* ── Panel and rows ──────────────────────────────────────────────────────── */

  /* Rows run edge to edge, so the pressed state fills the whole row. */
  .hx-panel {
    overflow: hidden;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
  }

  .hx-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    text-align: center;
  }

  .hx-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.125rem;
    transition: background 0.15s;
  }

  .hx-row + .hx-row {
    border-top: 1px solid #1f2937;
  }

  .hx-row:active {
    background: #161f2e;
  }

  @media (hover: hover) {
    .hx-row:hover {
      background: #161f2e;
    }
  }

  .hx-row--skeleton {
    justify-content: space-between;
  }

  .hx-row__main {
    flex: 1;
    min-width: 0;
  }

  .hx-row__name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .hx-row__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .hx-row__meta {
    margin-top: 0.1875rem;
    padding-left: 1rem;
    font-size: 0.75rem;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hx-row__side {
    flex-shrink: 0;
    text-align: right;
  }

  .hx-row__value {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #fff;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .hx-row__unit {
    margin-left: 0.1875rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .hx-row__label {
    margin-top: 0.125rem;
    font-size: 0.6875rem;
    color: #64748b;
    white-space: nowrap;
  }

  .hx-row__label--cardio {
    color: #22d3ee;
  }

  .hx-row__chevron {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: #475569;
  }
</style>
