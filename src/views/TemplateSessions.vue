<script setup lang="ts">
  import { ref, computed, onUnmounted, watch } from "vue";
  import { useRouter } from "vue-router";
  import { useHybridData } from "@/composables/useHybridData";
  import { useWeekStats, WEEK_DAYS, getTodayIndex } from "@/composables/useWeekStats";
  import { useTrainingGoals, MUSCLE_GROUP_COLORS } from "@/composables/useTrainingGoals";
  import { useGoalStreak, type ChainLink } from "@/composables/useGoalStreak";
  import { CHAIN_LENGTH, type GoalGap, type GoalGapKind } from "@/composables/goalStreak";
  import SwipeableCard from "@/components/SwipeableCard.vue";
  import NetworkStatus from "@/components/NetworkStatus.vue";
  import { vibrate } from "@/composables/useHaptics";
  import muscleGroupsData from "@/data/muscle-groups.json";

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

  const activeSessions = computed(() => {
    return workoutData.sessions.value.filter((session) => !session.isCompleted);
  });

  // ---------------------------------------------------------------------------
  // Startup placeholders — the page is drawn at once and fills in two waves:
  // templates/sessions read from the phone, then the exercise library.
  // ---------------------------------------------------------------------------

  const localReady = computed(() => workoutData.localDataReady.value);
  const exercisesReady = computed(() => workoutData.exerciseIndex.value.size > 0);

  // Captured once: content fades in only where it replaces a placeholder, not on every visit.
  const fadeLocal = !localReady.value;
  const fadeExercises = !exercisesReady.value;

  /** Varied widths for the exercise rows of a placeholder template card. */
  const PLACEHOLDER_ROW_WIDTHS = ["w-32", "w-24", "w-28", "w-20"];

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

  /** Muscle group (name + colour) shown on each exercise in the template preview */
  const getExerciseGroup = (exerciseId: number): { name: string; color: string } => {
    // getExerciseById resolves both main exercises and variants
    const exercise = workoutData.getExerciseById(exerciseId);
    // Primary muscle group first, then category (cardio exercises use "Kondisjon")
    const groupName = exercise?.muscleGroups?.[0] || exercise?.category || "";
    const group = muscleGroupsData.muscleGroups.find((g) => g.name === groupName);
    return { name: groupName, color: group?.color || "#64748b" };
  };

  // ---------------------------------------------------------------------------
  // Weekly summary — the detailed breakdown lives on /week
  // ---------------------------------------------------------------------------

  const { weekNumber, trainedDayIndices, totals: weekTotals, setsGoalProgress, cardioGoalProgress } = useWeekStats(0);

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
  // Weekly goal streak
  // ---------------------------------------------------------------------------

  const { hasGoals, goals } = useTrainingGoals();
  const {
    ready: streakReady,
    current: streakCurrent,
    best: streakBest,
    nextMilestone,
    chain: streakChain,
    thisWeek,
    thisWeekKey,
  } = useGoalStreak();

  /**
   * The streak needs both the sessions and the exercise library; until then it's a
   * placeholder, so a reload never flashes "0" or a half-counted week.
   */
  const streakDataReady = computed(() => localReady.value && streakReady.value);
  const showStreak = computed(() => hasGoals.value && streakDataReady.value);
  const fadeStreak = !streakDataReady.value;

  /** Rows the goal list can need at most: one per target in the plan (strength groups, cardio minutes, cardio km). */
  const reservedGoalRows = computed(() => {
    const g = goals.value;
    const strengthTargets = Object.values(g.setsPerMuscleGroup).filter((sets) => sets > 0).length;
    return strengthTargets + (g.cardio.minutesPerWeek > 0 ? 1 : 0) + (g.cardio.kilometresPerWeek > 0 ? 1 : 0);
  });

  const weeksLabel = (n: number): string => (n === 1 ? "uke på rad" : "uker på rad");

  const streakMeta = computed(() => {
    const parts: string[] = [];
    if (streakBest.value > streakCurrent.value) parts.push(`Rekord ${streakBest.value}`);
    if (nextMilestone.value) parts.push(`neste merke ved ${nextMilestone.value}`);
    return parts.join(" · ");
  });

  const chainLabel = computed(() => {
    const met = streakChain.value.filter((link) => link.approved).length;
    return `${met} av de siste ${streakChain.value.length} ukene nådd`;
  });

  const GAP_UNIT: Record<GoalGapKind, string> = { strength: "", minutes: " min", km: " km" };
  const kmFormat = new Intl.NumberFormat("no-NO", { maximumFractionDigits: 1 });
  const formatGap = (gap: GoalGap, value: number): string => (gap.kind === "km" ? kmFormat.format(value) : String(value));
  const gapColor = (gap: GoalGap): string => (gap.kind === "strength" ? (MUSCLE_GROUP_COLORS[gap.name] ?? "#64748b") : "#06b6d4");

  // The week's first look after it's secured: show the old number, then pop to
  // the new one. Once per week per device; skipped for reduced motion.
  const CELEBRATED_KEY = "lift-streak-celebrated";
  const celebrationPhase = ref<"idle" | "before" | "pop">("idle");
  let celebrationTimer: number | null = null;

  watch(
    () => showStreak.value && thisWeek.value.approved,
    (approved) => {
      if (!approved) return;
      const marker = `${workoutData.currentUser.value?.id ?? ""}:${thisWeekKey.value}`;
      try {
        if (localStorage.getItem(CELEBRATED_KEY) === marker) return;
        localStorage.setItem(CELEBRATED_KEY, marker);
      } catch {
        return; // without storage it would replay on every visit
      }
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      celebrationPhase.value = "before";
      celebrationTimer = window.setTimeout(() => {
        celebrationPhase.value = "pop";
      }, 400);
    },
    { immediate: true },
  );

  const displayedStreak = computed(() => (celebrationPhase.value === "before" ? streakCurrent.value - 1 : streakCurrent.value));

  const isLinkMet = (link: ChainLink): boolean => link.approved && !(link.isCurrent && celebrationPhase.value === "before");

  // ---------------------------------------------------------------------------
  // Cleanup on component unmount
  // ---------------------------------------------------------------------------

  onUnmounted(() => {
    if (countdownInterval.value) {
      clearInterval(countdownInterval.value);
    }
    if (celebrationTimer) clearTimeout(celebrationTimer);
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
    <router-link to="/week" class="week-card">
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

      <!-- Streak placeholder until both the sessions and the exercise library are in -->
      <div v-if="hasGoals && !streakDataReady" class="week-card__streak" aria-hidden="true">
        <div class="week-card__streak-head">
          <span class="week-card__flame skeleton skeleton--circle"></span>
          <span class="week-card__streak-num"><span class="week-card__ph-bar skeleton w-5"></span></span>
          <span class="week-card__streak-text">
            <span class="week-card__streak-label"><span class="week-card__ph-bar skeleton w-28"></span></span>
            <span class="week-card__streak-meta"><span class="week-card__ph-bar skeleton w-40"></span></span>
          </span>
        </div>
        <div class="week-card__chain">
          <span v-for="i in CHAIN_LENGTH" :key="i" class="week-card__ph-link skeleton"></span>
        </div>
      </div>

      <!-- Weekly goal streak — the chain of recent weeks, current week last -->
      <div v-else-if="showStreak" :class="['week-card__streak', { 'fade-in': fadeStreak }]">
        <div class="week-card__streak-head">
          <svg class="week-card__flame" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
          <span
            v-if="streakCurrent > 0"
            :class="['week-card__streak-num', { 'week-card__streak-num--pop': celebrationPhase === 'pop' }]">
            {{ displayedStreak }}
          </span>
          <span class="week-card__streak-text">
            <span class="week-card__streak-label">{{ streakCurrent > 0 ? weeksLabel(displayedStreak) : "Start en ny streak" }}</span>
            <span v-if="streakMeta" class="week-card__streak-meta">{{ streakMeta }}</span>
          </span>
        </div>
        <div class="week-card__chain" role="img" :aria-label="chainLabel">
          <span
            v-for="link in streakChain"
            :key="link.key"
            :class="['week-card__link', { 'week-card__link--met': isLinkMet(link), 'week-card__link--current': link.isCurrent && !isLinkMet(link) }]">
            <span v-if="link.isCurrent && !isLinkMet(link)" class="week-card__link-fill" :style="{ width: link.progress * 100 + '%' }"></span>
          </span>
        </div>
      </div>

      <!-- Day track -->
      <div class="week-card__days">
        <div v-for="(label, i) in WEEK_DAYS" :key="label" class="week-card__day">
          <div v-if="!localReady" class="week-card__dot skeleton skeleton--circle"></div>
          <div v-else :class="['week-card__dot', `week-card__dot--${getDayState(i)}`, { 'fade-in': fadeLocal }]">
            <svg v-if="getDayState(i) === 'done'" class="week-card__dot-check" viewBox="0 0 10 10" fill="none">
              <path d="M2 5.5l2.2 2.2 3.8-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <span :class="['week-card__day-label', { 'week-card__day-label--today': i === todayIdx }]">
            {{ label }}
          </span>
        </div>
      </div>

      <!-- Goal placeholder: room for one row per target, the most the list can need -->
      <div v-if="hasGoals && !streakDataReady" class="week-card__goal" aria-hidden="true">
        <div class="week-card__goal-head">
          <span class="week-card__goal-label"><span class="week-card__ph-bar skeleton w-36"></span></span>
          <span class="week-card__goal-count"><strong><span class="week-card__ph-bar skeleton w-6"></span></strong></span>
        </div>
        <ul class="week-card__gaps">
          <li v-for="i in reservedGoalRows" :key="i" class="week-card__gap">
            <span class="week-card__gap-dot skeleton skeleton--circle"></span>
            <span class="week-card__gap-name"><span class="week-card__ph-bar skeleton w-14"></span></span>
            <span class="week-card__gap-value"><span class="week-card__ph-bar skeleton w-10"></span></span>
            <span class="week-card__gap-left"><span class="week-card__ph-bar skeleton w-12"></span></span>
          </li>
        </ul>
      </div>

      <!-- Week secured: every target met -->
      <div v-else-if="showStreak && thisWeek.approved" :class="['week-card__secured', { 'fade-in': fadeStreak }]">
        <span class="week-card__secured-check">
          <svg viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 5.5l2.2 2.2 3.8-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="week-card__secured-text">
          <span class="week-card__secured-title">Uka er i boks — {{ streakCurrent }} {{ weeksLabel(streakCurrent) }}</span>
          <span class="week-card__secured-sub">Alle mål nådd. Resten av uka er bonus.</span>
        </span>
      </div>

      <!-- What's left this week, target by target — the total isn't the rule -->
      <div v-else-if="showStreak" :class="['week-card__goal', { 'fade-in': fadeStreak }]">
        <div class="week-card__goal-head">
          <span class="week-card__goal-label">{{ streakCurrent > 0 ? "Igjen for å holde streaken" : "Igjen for å nå ukesmålet" }}</span>
          <span v-if="thisWeek.remainingSets > 0" class="week-card__goal-count">
            <strong>{{ thisWeek.remainingSets }}</strong> sett
          </span>
        </div>
        <ul class="week-card__gaps">
          <li v-for="gap in thisWeek.gaps" :key="gap.kind + gap.name" class="week-card__gap">
            <span class="week-card__gap-dot" :style="{ background: gapColor(gap) }"></span>
            <span class="week-card__gap-name">{{ gap.name }}</span>
            <span class="week-card__gap-value">{{ formatGap(gap, gap.done) }} / {{ formatGap(gap, gap.target) }}{{ GAP_UNIT[gap.kind] }}</span>
            <span class="week-card__gap-left">{{ formatGap(gap, gap.remaining) }}{{ GAP_UNIT[gap.kind] }} igjen</span>
          </li>
        </ul>
        <span v-if="thisWeek.groupsMet > 0" class="week-card__gaps-met">
          ✓ {{ thisWeek.groupsMet }} av {{ thisWeek.groupsTotal }} muskelgrupper er nådd
        </span>
      </div>

      <!-- Without goals: placeholder for the plain totals until the sessions are read -->
      <div v-else-if="!hasGoals && !localReady" class="week-card__stats" aria-hidden="true">
        <div class="week-card__stat">
          <span class="week-card__stat-value"><span class="week-card__ph-bar skeleton w-6"></span></span>
          <span class="week-card__stat-label">Økter</span>
        </div>
        <div class="week-card__stat-divider"></div>
        <div class="week-card__stat">
          <span class="week-card__stat-value"><span class="week-card__ph-bar skeleton w-12"></span></span>
          <span class="week-card__stat-label">Volum (kg)</span>
        </div>
        <div class="week-card__stat-divider"></div>
        <div class="week-card__stat">
          <span class="week-card__stat-value"><span class="week-card__ph-bar skeleton w-6"></span></span>
          <span class="week-card__stat-label">Sett</span>
        </div>
      </div>

      <!-- Progress toward this week's goal (only without a goal plan; with one the streak covers it) -->
      <div v-else-if="setsGoalProgress.hasTarget" class="week-card__goal">
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

      <div v-else-if="cardioGoalProgress.hasTarget" class="week-card__goal">
        <div class="week-card__goal-head">
          <span class="week-card__goal-label">{{ cardioGoalProgress.minutesTarget > 0 ? 'Ukens kondisjon' : 'Ukens distanse' }}</span>
          <span class="week-card__goal-count">
            <template v-if="cardioGoalProgress.minutesTarget > 0">
              <strong>{{ cardioGoalProgress.minutesDone }}</strong> / {{ cardioGoalProgress.minutesTarget }} min
            </template>
            <template v-else>
              <strong>{{ cardioGoalProgress.kmDone }}</strong> / {{ cardioGoalProgress.kmTarget }} km
            </template>
          </span>
        </div>
        <div class="week-card__goal-bar">
          <div
            class="week-card__goal-fill week-card__goal-fill--cardio"
            :style="{ width: (cardioGoalProgress.minutesTarget > 0 ? cardioGoalProgress.minutesPct : cardioGoalProgress.kmPct) + '%' }"></div>
        </div>
        <span class="week-card__goal-pct">
          {{ cardioGoalProgress.minutesTarget > 0 ? cardioGoalProgress.minutesPct : cardioGoalProgress.kmPct }} % av målet
        </span>
      </div>

      <!-- No goals set yet — plain totals instead -->
      <div v-else :class="['week-card__stats', { 'fade-in': fadeLocal }]">
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

      <p class="week-card__motivation">
        <span v-if="!localReady" class="week-card__ph-bar skeleton w-40" aria-hidden="true"></span>
        <span v-else :class="{ 'fade-in': fadeLocal }">{{ weekMotivation }}</span>
      </p>
    </router-link>

    <!-- Active Workout Sessions -->
    <div class="mt-8">
      <!-- Active Sessions Content — known once the sessions are read from the phone -->
      <div v-if="localReady && activeSessions.length > 0">
        <h2 class="text-xl font-semibold text-white mb-4">Aktiv Økt</h2>

        <div class="space-y-2">
          <SwipeableCard v-for="session in activeSessions" :key="session.id" @delete="abandonWorkout(session.id)">
            <div @click="continueWorkout(session.id)" class="flex items-center justify-between p-4 bg-dark-800 rounded-lg hover:bg-dark-600 cursor-pointer transition-colors border-l-4 border-primary-500">
              <div class="flex-1">
                <h3 class="font-medium text-white">{{ session.templateName }}</h3>
                <p class="text-sm text-dark-300">Startet {{ formatDate(session.date) }}</p>
                <p class="text-xs text-dark-400">{{ session.exercises.length }} øvelser • Fortsett økt</p>
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

      <!-- Placeholder cards until the templates are read from the phone (same shape as a real card) -->
      <div v-if="!localReady" class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
        <div v-for="i in 2" :key="i" class="bg-dark-800 rounded-lg p-6 flex flex-col h-full ring-1 ring-dark-700/40">
          <div class="mb-4 h-7 flex items-center"><span class="skeleton h-4 w-28"></span></div>
          <div class="mb-4 h-5 flex items-center"><span class="skeleton h-3 w-16"></span></div>
          <ul class="mb-6 flex-grow space-y-1.5">
            <li v-for="(width, j) in PLACEHOLDER_ROW_WIDTHS" :key="j" class="flex items-center gap-2.5 h-5">
              <span class="skeleton skeleton--circle w-2 h-2 flex-shrink-0"></span>
              <span :class="['skeleton', 'h-3', width]"></span>
              <span class="skeleton h-2.5 w-10 ml-auto flex-shrink-0"></span>
            </li>
          </ul>
          <div class="flex gap-2 mt-auto pointer-events-none">
            <span class="flex-1 bg-dark-600 text-white rounded-lg text-sm py-2 text-center">Rediger</span>
            <span class="flex-1 bg-primary-500 text-white rounded-lg text-sm py-2 text-center">Start Økt</span>
          </div>
        </div>
      </div>

      <!-- Empty State — only once the templates are read, so it never flashes by -->
      <div v-else-if="filteredTemplates.length === 0" class="mt-4 text-center py-12">
        <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p class="text-dark-300 mb-4">Ingen økter opprettet enda</p>
        <router-link to="/template/create" class="btn-primary"> Opprett din første økt </router-link>
      </div>

      <!-- Templates -->
      <div v-else class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="template in filteredTemplates" :key="template.id" :class="['bg-dark-800', 'rounded-lg', 'p-6', 'transition-all', 'flex', 'flex-col', 'h-full', 'ring-1', 'ring-dark-700/40', 'hover:ring-dark-500/50', 'hover:-translate-y-0.5']">
          <h3 class="mb-4 text-lg font-semibold text-white truncate">{{ template.name }}</h3>

          <p class="text-sm text-dark-300 mb-4">{{ template.exercises.length }} øvelser</p>

          <!-- Exercise Preview — in the order set up in the template -->
          <ul class="mb-6 flex-grow space-y-1.5">
            <li v-for="(exercise, index) in template.exercises" :key="`${index}-${exercise.exerciseId}`" class="flex items-center gap-2.5 min-w-0 text-sm text-dark-200">
              <!-- Muscle group needs the exercise library (wave 2) -->
              <span v-if="!exercisesReady" class="skeleton skeleton--circle w-2 h-2 flex-shrink-0"></span>
              <span v-else :class="['w-2 h-2 rounded-full flex-shrink-0', { 'fade-in': fadeExercises }]" :style="{ backgroundColor: getExerciseGroup(exercise.exerciseId).color }"></span>
              <span class="truncate">{{ exercise.name }}</span>
              <span v-if="!exercisesReady" class="skeleton h-2.5 w-10 ml-auto flex-shrink-0"></span>
              <span v-else :class="['ml-auto pl-2 flex-shrink-0 text-xs text-dark-500', { 'fade-in': fadeExercises }]">{{ getExerciseGroup(exercise.exerciseId).name }}</span>
            </li>
          </ul>

          <!-- Action Buttons -->
          <div class="flex gap-2 mt-auto">
            <router-link :to="`/template/edit/${template.id}`" class="flex-1 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors text-sm py-2 flex items-center justify-center"> Rediger </router-link>
            <button @click.stop="startWorkout(template.id)" :disabled="activeSessions.length > 0" :class="['flex-1', 'text-sm', 'py-2', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'rounded-lg', 'bg-primary-500', 'hover:bg-primary-600', 'text-white', 'transition-colors']" :title="activeSessions.length > 0 ? 'Du har allerede en aktiv økt. Fullfør den først.' : 'Start ny økt'">Start Økt</button>
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

  .week-card__goal-fill--cardio {
    background: #06b6d4;
  }

  .week-card__goal-pct {
    font-size: 0.6875rem;
    color: #4b5563;
  }

  /* ── Weekly goal streak ──────────────────────────────────────────────────── */

  .week-card__streak {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .week-card__streak-head {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .week-card__flame {
    width: 1.375rem;
    height: 1.375rem;
    flex-shrink: 0;
    color: #f97316;
  }

  .week-card__streak-num {
    display: inline-block;
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .week-card__streak-num--pop {
    animation: streak-pop 0.45s ease-out;
  }

  @keyframes streak-pop {
    40% {
      transform: scale(1.25);
    }
  }

  .week-card__streak-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .week-card__streak-label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .week-card__streak-meta {
    font-size: 0.75rem;
    color: #64748b;
  }

  .week-card__chain {
    display: flex;
    gap: 0.25rem;
  }

  .week-card__link {
    position: relative;
    flex: 1;
    height: 0.625rem;
    overflow: hidden;
    background: #1f2937;
    border-radius: 3px;
    transition: background-color 0.35s ease-out;
  }

  .week-card__link--met {
    background: #22c55e;
  }

  .week-card__link--current {
    background: #0d1117;
    box-shadow: inset 0 0 0 1px #f9731640;
  }

  .week-card__link-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: #f97316;
  }

  /* ── What's left this week ───────────────────────────────────────────────── */

  .week-card__gaps {
    display: flex;
    flex-direction: column;
    margin: 0.25rem 0 0;
    padding: 0;
    list-style: none;
  }

  .week-card__gap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    border-top: 1px solid #1f2937;
  }

  .week-card__gap:first-child {
    border-top: 0;
  }

  .week-card__gap-dot {
    width: 0.5rem;
    height: 0.5rem;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .week-card__gap-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .week-card__gap-value {
    margin-left: auto;
    font-size: 0.8125rem;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
  }

  .week-card__gap-left {
    min-width: 4.75rem;
    font-size: 0.75rem;
    color: #fdba74;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .week-card__gaps-met {
    padding-top: 0.5rem;
    border-top: 1px solid #1f2937;
    font-size: 0.75rem;
    color: #4ade80;
  }

  /* ── Week secured ────────────────────────────────────────────────────────── */

  .week-card__secured {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem;
    background: #16a34a1a;
    border: 1px solid #16a34a50;
    border-radius: 0.75rem;
  }

  .week-card__secured-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: #22c55e;
    color: #fff;
  }

  .week-card__secured-check svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  .week-card__secured-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .week-card__secured-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #fff;
  }

  .week-card__secured-sub {
    font-size: 0.75rem;
    color: #4ade80;
  }

  @media (prefers-reduced-motion: reduce) {
    .week-card__streak-num--pop {
      animation: none;
    }

    .week-card__link {
      transition: none;
    }
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

  /* ── Placeholders while loading ──────────────────────────────────────────── */
  /* Sit inside the real text elements, so each line keeps the content's height. */

  .week-card__ph-bar {
    display: inline-block;
    height: 0.7em;
    vertical-align: middle;
  }

  .week-card__ph-link {
    flex: 1;
    height: 0.625rem;
    border-radius: 3px;
  }
</style>
