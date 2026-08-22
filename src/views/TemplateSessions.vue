<script setup lang="ts">
  import { ref, computed, onUnmounted } from "vue";
  import { useRouter } from "vue-router";
  import { useHybridData } from "@/composables/useHybridData";
  import { useWeekStats, WEEK_DAYS, getTodayIndex } from "@/composables/useWeekStats";
  import SwipeableCard from "@/components/SwipeableCard.vue";
  import NetworkStatus from "@/components/NetworkStatus.vue";
  import { vibrate } from "@/composables/useHaptics";

  const router = useRouter();
  const workoutData = useHybridData();

  // Countdown state
  const showCountdown = ref(false);
  const countdownNumber = ref(3);
  const countdownInterval = ref<number | null>(null);
  const pendingSessionId = ref<string | null>(null);

  // Computed properties
  const filteredTemplates = computed(() => {
    return workoutData.templates.value;
  });

  const templatesByType = computed(() => {
    const groups: Array<{ id: string; name: string; color: string; templates: any[] }> = [];
    const seen = new Set<string>();

    // Known workout types in configured order
    workoutData.workoutTypes.value.forEach((wt: any) => {
      const items = workoutData.templates.value.filter((t: any) => t.workoutType === wt.id);
      if (items.length > 0) {
        groups.push({ id: wt.id, name: wt.name, color: wt.color, templates: items });
        seen.add(wt.id);
      }
    });

    // Any templates with unknown/legacy types
    workoutData.templates.value.forEach((tpl: any) => {
      if (!seen.has(tpl.workoutType)) {
        const items = workoutData.templates.value.filter((t: any) => t.workoutType === tpl.workoutType);
        groups.push({
          id: tpl.workoutType,
          name: getWorkoutTypeName(tpl.workoutType),
          color: getWorkoutTypeColor(tpl.workoutType),
          templates: items,
        });
        seen.add(tpl.workoutType);
      }
    });

    return groups;
  });

  const activeSessions = computed(() => {
    return workoutData.sessions.value.filter((session) => !session.isCompleted);
  });

  // Loading state
  const isLoading = computed(() => workoutData.isLoading.value);

  // Methods
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("no-NO").format(Math.round(num));
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("no-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getWorkoutTypeName = (typeId: string): string => {
    return workoutData.getWorkoutType(typeId);
  };

  const getWorkoutTypeColor = (typeId: string): string => {
    return workoutData.getWorkoutTypeColor(typeId);
  };

  const getMotivationalText = (): string => {
    const texts = ["Gjør deg klar!", "Fokus!", "Nesten der!", "Løft!"];
    return texts[4 - countdownNumber.value] || "Gjør deg klar!";
  };

  const getMotivationalSubtext = (): string => {
    const subtexts = ["Treningsøkten starter snart", "Konsentrer deg på formen", "Beregn deg for å løfte", "La oss gjøre dette!"];
    return subtexts[4 - countdownNumber.value] || "Treningsøkten starter snart";
  };

  const startCountdown = (sessionId: string) => {
    pendingSessionId.value = sessionId;
    showCountdown.value = true;
    countdownNumber.value = 3;

    // Haptic feedback on mobile
    vibrate(100);

    countdownInterval.value = window.setInterval(() => {
      countdownNumber.value--;

      // Haptic feedback for each countdown number
      if (countdownNumber.value > 0) vibrate(50);

      if (countdownNumber.value <= 0) {
        clearInterval(countdownInterval.value!);
        countdownInterval.value = null;

        // Final haptic feedback
        vibrate([100, 50, 100]);

        // Navigate to workout after a brief pause
        setTimeout(() => {
          showCountdown.value = false;
          router.push(`/workout/${sessionId}`);
        }, 500);
      }
    }, 1000);
  };

  const cancelCountdown = async () => {
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value);
      countdownInterval.value = null;
    }
    showCountdown.value = false;

    // Cancel the workout session in the backend
    if (pendingSessionId.value) {
      try {
        await workoutData.abandonWorkoutSession(pendingSessionId.value);
      } catch (error) {
        console.error("Error abandoning workout session:", error);
      }
      pendingSessionId.value = null;
    }

    // Haptic feedback for cancellation
    vibrate([200, 100, 200]);
  };

  const startWorkout = async (templateId: string) => {
    // 1) Do ONLY the primary action in a guarded try/catch
    let session: { id: string } | null = null;
    try {
      session = await workoutData.startWorkoutSession(templateId);
    } catch (error) {
      console.error("Error starting workout:", error);
      alert("Kunne ikke starte økt. Prøv igjen.");
      return;
    }

    if (!session) {
      // explicit null/undefined -> primary action failed
      alert("Kunne ikke starte økt. Prøv igjen.");
      return;
    }

    // 2) Kick off a best-effort refresh, but don't block UX or show alerts if it fails
    workoutData.refreshUIData?.().catch((e: unknown) => console.warn("refreshUIData failed (non-fatal):", e));

    // 3) Proceed with UX
    startCountdown(session.id);
  };

  const continueWorkout = (sessionId: string) => {
    router.push(`/workout/${sessionId}`);
  };

  const abandonWorkout = async (sessionId: string) => {
    if (!confirm("Er du sikker på at du vil avbryte denne økten? Dette kan ikke angres og økten vil slettes permanent.")) {
      return;
    }

    // Haptic feedback on mobile
    vibrate(100);

    // 1) Do ONLY the primary action in a guarded try/catch
    try {
      await workoutData.abandonWorkoutSession(sessionId);
    } catch (error) {
      console.error("Error abandoning workout:", error);
      vibrate([200, 100, 200]);
      alert("Kunne ikke avbryte økt. Prøv igjen.");
      return;
    }

    // 2) Best-effort refresh that won't trigger alerts on failure
    workoutData.refreshUIData?.().catch((e: unknown) => console.warn("refreshUIData failed (non-fatal):", e));

    // Success feedback
    vibrate([50, 100, 50]);
  };

  // Helper methods for exercise grouping
  const getExerciseGroups = (exercises: any[]) => {
    const groups: Record<string, any[]> = {};

    // Safety check for exercises
    if (!exercises || !Array.isArray(exercises)) {
      return groups;
    }

    exercises.forEach((exercise) => {
      // Find the exercise data using getExerciseById which can handle both main exercises and variants
      const exerciseData = workoutData.getExerciseById(exercise.exerciseId);
      if (exerciseData && exerciseData.muscleGroups && exerciseData.muscleGroups.length > 0) {
        // Use the first muscle group as the primary category
        const primaryGroup = exerciseData.muscleGroups[0];
        if (!groups[primaryGroup]) {
          groups[primaryGroup] = [];
        }
        groups[primaryGroup].push(exercise);
      } else if (exerciseData && exerciseData.category) {
        // Fallback to category if no muscleGroups
        if (!groups[exerciseData.category]) {
          groups[exerciseData.category] = [];
        }
        groups[exerciseData.category].push(exercise);
      } else {
        // Last resort fallback
        if (!groups["other"]) {
          groups["other"] = [];
        }
        groups["other"].push(exercise);
      }
    });

    return groups;
  };

  // ---------------------------------------------------------------------------
  // Weekly summary — the detailed breakdown lives on /week
  // ---------------------------------------------------------------------------

  const { weekNumber, trainedDayIndices, totals: weekTotals, setsGoalProgress } = useWeekStats(0);

  const todayIdx = computed(() => getTodayIndex());

  /** Visual state for each day dot */
  const getDayState = (idx: number): "done" | "today" | "past" | "future" => {
    if (trainedDayIndices.value.has(idx)) return "done";
    if (idx === todayIdx.value) return "today";
    if (idx < todayIdx.value) return "past";
    return "future";
  };

  /** Motivational label based on how active this week has been */
  const weekMotivation = computed(() => {
    const n = weekTotals.value.workouts;
    if (n === 0 && todayIdx.value <= 1) return "Ny uke, nye muligheter!";
    if (n === 0) return "Kroppen venter – gi den litt kjærlighet!";
    if (n === 1) return "Bra startet – hold momentum!";
    if (n === 2) return "Du er i rute!";
    if (n === 3) return "Halvveis og kjempesterkt!";
    if (n === 4) return "Solid uke – press på!";
    return "Beist-modus aktivert 🔥";
  });

  // ---------------------------------------------------------------------------
  // Cleanup on component unmount
  // ---------------------------------------------------------------------------

  onUnmounted(() => {
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value);
    }
  });
</script>

<template>
  <NetworkStatus />
  <div>
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Økter</h1>
      </div>
    </div>

    <!-- ── Weekly summary → full breakdown on /week ────────────────────────── -->
    <router-link v-if="!isLoading" to="/week" class="week-card">
      <!-- Header row -->
      <div class="week-card__header">
        <span class="week-card__title">Denne uken</span>
        <span class="week-card__nav">
          <span class="week-card__badge">Uke {{ weekNumber }}</span>
          <svg class="week-card__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>

      <!-- Day track -->
      <div class="week-card__days">
        <div v-for="(label, i) in WEEK_DAYS" :key="label" class="week-card__day">
          <div :class="['week-card__dot', `week-card__dot--${getDayState(i)}`]">
            <svg v-if="getDayState(i) === 'done'" class="week-card__dot-check" viewBox="0 0 10 10" fill="none">
              <path d="M2 5.5l2.2 2.2 3.8-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <span :class="['week-card__day-label', { 'week-card__day-label--today': i === todayIdx }]">
            {{ label }}
          </span>
        </div>
      </div>

      <!-- Progress toward this week's set goal -->
      <div v-if="setsGoalProgress.hasTarget" class="week-card__goal">
        <div class="week-card__goal-head">
          <span class="week-card__goal-label">Ukens sett</span>
          <span class="week-card__goal-count">
            <strong>{{ setsGoalProgress.done }}</strong> / {{ setsGoalProgress.target }}
          </span>
        </div>
        <div class="week-card__goal-bar">
          <div class="week-card__goal-fill" :style="{ width: setsGoalProgress.percentage + '%' }"></div>
        </div>
        <span class="week-card__goal-pct">{{ setsGoalProgress.percentage }} % av målet</span>
      </div>

      <!-- No goals set yet — plain totals instead -->
      <div v-else class="week-card__stats">
        <div class="week-card__stat">
          <span class="week-card__stat-value">{{ weekTotals.workouts }}</span>
          <span class="week-card__stat-label">Økter</span>
        </div>
        <div class="week-card__stat-divider"></div>
        <div class="week-card__stat">
          <span class="week-card__stat-value">{{ formatNumber(weekTotals.volume) }}</span>
          <span class="week-card__stat-label">Volum (kg)</span>
        </div>
        <div class="week-card__stat-divider"></div>
        <div class="week-card__stat">
          <span class="week-card__stat-value">{{ weekTotals.sets }}</span>
          <span class="week-card__stat-label">Sett</span>
        </div>
      </div>

      <p class="week-card__motivation">{{ weekMotivation }}</p>
    </router-link>

    <!-- Active Workout Sessions -->
    <div class="mt-8">
      <!-- Loading State for Active Sessions -->
      <div v-if="isLoading" class="mb-4">
        <div class="h-7 bg-dark-600 rounded w-32 mb-4 animate-pulse"></div>
        <div class="space-y-4">
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600 animate-pulse">
            <div class="flex items-center justify-between">
              <div class="flex-1 space-y-2">
                <div class="h-5 bg-dark-600 rounded w-40"></div>
                <div class="h-4 bg-dark-600 rounded w-32"></div>
                <div class="h-3 bg-dark-600 rounded w-48"></div>
              </div>
              <div class="h-8 bg-dark-600 rounded-full w-20"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Sessions Content -->
      <div v-else-if="activeSessions.length > 0">
        <h2 class="text-xl font-semibold text-white mb-4">Aktiv Økt</h2>

        <div class="space-y-2">
          <SwipeableCard v-for="session in activeSessions" :key="session.id" @delete="abandonWorkout(session.id)">
            <div @click="continueWorkout(session.id)" class="flex items-center justify-between p-4 bg-dark-800 rounded-lg hover:bg-dark-600 cursor-pointer transition-colors border-l-4 border-primary-500">
              <div class="flex-1">
                <h3 class="font-medium text-white">{{ session.templateName }}</h3>
                <p class="text-sm text-dark-300">Startet {{ formatDate(session.date) }}</p>
                <p class="text-xs text-dark-400">{{ session.exercises.length }} øvelser • Fortsett økt</p>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="px-3 py-2 rounded-full text-sm font-medium"
                  :style="{
                    backgroundColor: getWorkoutTypeColor(session.workoutType) + '20',
                    color: getWorkoutTypeColor(session.workoutType),
                  }">
                  {{ getWorkoutTypeName(session.workoutType) }}
                </span>
              </div>
            </div>
          </SwipeableCard>
          <p class="text-xs text-dark-400 text-center md:hidden">Swipe for å avbryte økt</p>
        </div>
      </div>
    </div>

    <!-- Workout Templates Section -->
    <div class="mt-8 pb-24 md:pb-0">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-white">Treningsøkter</h2>
        <router-link to="/template/create" class="btn-primary btn-sm inline-flex items-center gap-1.5" title="Opprett ny treningsøkt">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Ny økt</span>
        </router-link>
      </div>

      <!-- Info message when there's an active session -->
      <div v-if="activeSessions.length > 0" class="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-blue-300 text-sm font-medium">Du har en aktiv økt</p>
            <p class="text-blue-400/80 text-xs">Fullfør den aktive økten først for å starte en ny økt.</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="mt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="bg-dark-700 rounded-lg p-6 border border-dark-600 animate-pulse">
            <!-- Template Title and Workout Type Skeleton -->
            <div class="flex items-center justify-between mb-4">
              <div class="h-6 bg-dark-600 rounded w-32"></div>
              <div class="h-6 bg-dark-600 rounded w-20"></div>
            </div>

            <!-- Exercise Count Skeleton -->
            <div class="h-4 bg-dark-600 rounded w-24 mb-6"></div>

            <!-- Exercise Preview Skeleton -->
            <div class="mb-6 space-y-3">
              <div class="space-y-2">
                <div class="h-3 bg-dark-600 rounded w-16"></div>
                <div class="space-y-1">
                  <div class="h-3 bg-dark-600 rounded w-full"></div>
                  <div class="h-3 bg-dark-600 rounded w-3/4"></div>
                  <div class="h-3 bg-dark-600 rounded w-1/2"></div>
                </div>
              </div>
            </div>

            <!-- Action Buttons Skeleton -->
            <div class="flex gap-2 mt-auto">
              <div class="flex-1 h-8 bg-dark-600 rounded-lg"></div>
              <div class="flex-1 h-8 bg-dark-600 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTemplates.length === 0" class="mt-4 text-center py-12">
        <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p class="text-dark-300 mb-4">Ingen økter opprettet enda</p>
        <router-link to="/template/create" class="btn-primary"> Opprett din første økt </router-link>
      </div>

      <!-- Templates grouped by Workout Type -->
      <div v-else class="mt-4 space-y-8">
        <div v-for="group in templatesByType" :key="group.id" class="rounded-xl overflow-hidden">
          <div class="px-4 pt-4 pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: group.color }"></span>
                <h3 class="text-lg md:text-xl font-bold tracking-wide" :style="{ color: group.color }">{{ group.name }}</h3>
              </div>
              <span class="min-w-[1.75rem] h-6 px-2 inline-flex items-center justify-center rounded-full text-xs font-semibold tracking-wider bg-dark-700 text-white/90 ring-1 ring-dark-500" :style="{ boxShadow: `0 0 0 2px ${group.color}20 inset`, color: group.color }">
                {{ group.templates.length }}
              </span>
            </div>
            <div class="h-px w-full mt-2 rounded" :style="{ background: `linear-gradient(90deg, transparent, ${group.color}33, transparent)` }"></div>
          </div>

          <div class="pb-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="template in group.templates" :key="template.id" :class="['relative', 'overflow-hidden', 'bg-dark-800', 'rounded-lg', 'p-6', 'transition-all', 'flex', 'flex-col', 'h-full', 'ring-1', 'ring-dark-700/40', 'hover:ring-dark-500/50', 'hover:-translate-y-0.5']" :style="{ boxShadow: `0 10px 24px -18px ${getWorkoutTypeColor(template.workoutType)}55` }">
                <!-- Template Title and Workout Type -->
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2 min-w-0">
                    <h3 class="text-lg font-semibold text-white truncate">{{ template.name }}</h3>
                  </div>
                  <span
                    class="px-3 py-1 rounded-full text-sm font-semibold tracking-wider"
                    :style="{
                      backgroundColor: getWorkoutTypeColor(template.workoutType) + '20',
                      color: getWorkoutTypeColor(template.workoutType),
                    }">
                    {{ getWorkoutTypeName(template.workoutType) }}
                  </span>
                </div>
                <div class="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl opacity-10" :style="{ background: getWorkoutTypeColor(template.workoutType) }"></div>

                <p class="text-sm text-dark-300 mb-4">{{ template.exercises.length }} øvelser</p>

                <!-- Exercise Preview -->
                <div class="mb-6 flex-grow">
                  <div class="space-y-3">
                    <div v-for="(exGroup, exGroupName) in (getExerciseGroups && getExerciseGroups(template.exercises)) || {}" :key="exGroupName" class="space-y-1">
                      <h4 class="text-xs font-medium text-primary-400 uppercase tracking-wide">
                        {{ exGroupName }}
                      </h4>
                      <div class="space-y-1">
                        <div v-for="exercise in exGroup" :key="exercise.exerciseId" class="text-sm text-dark-200">
                          <span class="truncate">{{ exercise.name }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-2 mt-auto">
                  <router-link :to="`/template/edit/${template.id}`" class="flex-1 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors text-sm py-2 flex items-center justify-center"> Rediger </router-link>
                  <button @click.stop="startWorkout(template.id)" :disabled="activeSessions.length > 0" :class="['flex-1', 'text-sm', 'py-2', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'rounded-lg']" :style="{ backgroundColor: getWorkoutTypeColor(template.workoutType), color: '#fff' }" :title="activeSessions.length > 0 ? 'Du har allerede en aktiv økt. Fullfør den først.' : 'Start ny økt'">Start Økt</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Countdown Modal -->
    <div v-if="showCountdown" class="fixed inset-0 bg-black/90 flex items-center justify-center z-50" @click="cancelCountdown">
      <div class="w-full h-full flex flex-col items-center justify-center text-center p-8" @click.stop>
        <!-- Countdown Number -->
        <div class="mb-8">
          <div class="text-9xl md:text-[12rem] font-bold text-primary-500 transition-all duration-300" :class="countdownNumber === 0 ? 'scale-110' : ''">
            {{ countdownNumber }}
          </div>
        </div>

        <!-- Motivational Text -->
        <div class="mb-12">
          <h3 class="text-4xl md:text-5xl font-bold text-white mb-4">
            {{ getMotivationalText() }}
          </h3>
          <p class="text-xl md:text-2xl text-dark-300">
            {{ getMotivationalSubtext() }}
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="w-full max-w-md bg-dark-700 rounded-full h-3 mb-8">
          <div class="bg-primary-500 h-3 rounded-full transition-all duration-1000 ease-out" :style="{ width: `${((4 - countdownNumber) / 4) * 100}%` }"></div>
        </div>

        <!-- Cancel Button -->
        <button @click="cancelCountdown" class="text-dark-400 hover:text-white transition-colors text-lg px-6 py-3 rounded-lg hover:bg-dark-700/50 transition-all">Avbryt</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* ── Week summary card ───────────────────────────────────────────────────── */

  .week-card {
    margin-bottom: 2rem;
    padding: 1.125rem 1.25rem 1rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: border-color 0.15s;
  }

  .week-card:active {
    border-color: #334155;
  }

  .week-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .week-card__title {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
  }

  .week-card__nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .week-card__badge {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: #f97316;
    background: #f9731612;
    border: 1px solid #f9731630;
    border-radius: 999px;
    padding: 0.125rem 0.625rem;
  }

  .week-card__chevron {
    width: 1rem;
    height: 1rem;
    color: #475569;
  }

  /* ── Day track ───────────────────────────────────────────────────────────── */

  .week-card__days {
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
  }

  .week-card__day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3125rem;
    flex: 1;
  }

  .week-card__dot {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .week-card__dot--done {
    background: #f97316;
    color: #fff;
  }

  .week-card__dot--today {
    background: transparent;
    border: 2px solid #f97316;
    box-shadow: 0 0 0 3px #f9731618;
  }

  .week-card__dot--past {
    background: #1f2937;
  }

  .week-card__dot--future {
    background: #111827;
    border: 1px solid #1f2937;
  }

  .week-card__dot-check {
    width: 0.875rem;
    height: 0.875rem;
  }

  .week-card__day-label {
    font-size: 0.625rem;
    font-weight: 500;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .week-card__day-label--today {
    color: #f97316;
    font-weight: 700;
  }

  /* ── Goal progress ───────────────────────────────────────────────────────── */

  .week-card__goal {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.875rem;
    background: #0d1117;
    border: 1px solid #1f2937;
    border-radius: 0.75rem;
  }

  .week-card__goal-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .week-card__goal-label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #4b5563;
  }

  .week-card__goal-count {
    font-size: 0.8125rem;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }

  .week-card__goal-count strong {
    font-size: 1.125rem;
    font-weight: 700;
    color: #fff;
  }

  .week-card__goal-bar {
    height: 0.5rem;
    background: #1f2937;
    border-radius: 999px;
    overflow: hidden;
  }

  .week-card__goal-fill {
    height: 100%;
    background: #f97316;
    border-radius: 999px;
    transition: width 0.35s ease-out;
  }

  .week-card__goal-pct {
    font-size: 0.6875rem;
    color: #4b5563;
  }

  /* ── Stats row (fallback when no goals are set) ──────────────────────────── */

  .week-card__stats {
    display: flex;
    align-items: center;
    gap: 0;
    background: #0d1117;
    border: 1px solid #1f2937;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .week-card__stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 0.5rem;
    gap: 0.125rem;
  }

  .week-card__stat-divider {
    width: 1px;
    height: 2.5rem;
    background: #1f2937;
    flex-shrink: 0;
  }

  .week-card__stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    line-height: 1;
  }

  .week-card__stat-label {
    font-size: 0.625rem;
    font-weight: 500;
    color: #4b5563;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: center;
  }

  /* ── Footer ──────────────────────────────────────────────────────────────── */

  .week-card__motivation {
    font-size: 0.8125rem;
    color: #6b7280;
    font-style: italic;
    margin: 0;
    width: 100%;
    text-align: center;
  }
</style>
