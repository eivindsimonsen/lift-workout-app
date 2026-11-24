<script setup lang="ts">
  import { ref, computed, onUnmounted, watch } from "vue";
  import { useRouter } from "vue-router";
  import { useHybridData } from "@/composables/useHybridData";
  import { useWeekStats, WEEK_DAYS, getTodayIndex } from "@/composables/useWeekStats";
  import { useTrainingGoals } from "@/composables/useTrainingGoals";
  import { useGoalStreak, type ChainLink } from "@/composables/useGoalStreak";
  import { CHAIN_LENGTH } from "@/composables/goalStreak";
  import NetworkStatus from "@/components/NetworkStatus.vue";
  import TemplateCard from "@/components/TemplateCard.vue";
  import TemplateSheet from "@/components/TemplateSheet.vue";
  import StreakInfoSheet from "@/components/StreakInfoSheet.vue";
  import WeekGoalsSettings from "@/components/WeekGoalsSettings.vue";
  import ActiveSessionButton from "@/components/ActiveSessionButton.vue";
  import SwipeableCard from "@/components/SwipeableCard.vue";
  import { vibrate } from "@/composables/useHaptics";
  import { useGridReorder } from "@/composables/useGridReorder";
  import { useTemplateStats } from "@/composables/useTemplateStats";
  import { loadTemplateOrder, orderTemplates, saveTemplateOrder } from "@/composables/templateOrder";
  import type { WorkoutTemplate } from "@/types/workout";

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

  /** Only one session runs at a time; should there ever be more, the newest wins. */
  const activeSession = computed(
    () => [...activeSessions.value].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null
  );

  // ---------------------------------------------------------------------------
  // Template order — chosen by long-press dragging, kept on the phone per user
  // ---------------------------------------------------------------------------

  const userId = computed(() => workoutData.currentUser.value?.id as string | undefined);

  /**
   * Template ids in the order shown; the drag reorders this list in place. Ids rather
   * than templates, so a card always shows the template as it is now (name, colour).
   * Rebuilt when templates are added or removed, or the user changes.
   */
  const templateOrderIds = ref<string[]>([]);
  watch(
    [() => workoutData.templates.value.map((t) => t.id).join("|"), userId],
    () => {
      const saved = userId.value ? loadTemplateOrder(userId.value) : [];
      templateOrderIds.value = orderTemplates(workoutData.templates.value, saved).map((t) => t.id);
    },
    { immediate: true },
  );

  const templatesById = computed(() => new Map(workoutData.templates.value.map((t) => [t.id, t])));

  /** The active session's template colour as the template is now; null when it has none or was deleted. */
  const activeSessionColor = computed(() => {
    const templateId = activeSession.value?.templateId;
    return (templateId && templatesById.value.get(templateId)?.color) || null;
  });

  const orderedTemplates = computed(() =>
    templateOrderIds.value.map((id) => templatesById.value.get(id)).filter((t): t is WorkoutTemplate => Boolean(t)),
  );

  const templateListRef = ref<HTMLElement | null>(null);
  const { draggingIndex, dragX, dragY, onItemPointerDown, consumeClickSuppression } = useGridReorder({
    getItems: () => templateOrderIds.value,
    gridEl: templateListRef,
    onReordered: () => {
      if (userId.value) saveTemplateOrder(userId.value, [...templateOrderIds.value]);
    },
  });

  /** The click that ends a drag must neither open the sheet nor start a session. */
  const onTemplateClickCapture = (event: MouseEvent) => {
    if (!consumeClickSuppression()) return;
    event.stopPropagation();
    event.preventDefault();
  };

  // ---------------------------------------------------------------------------
  // Startup placeholders — the page is drawn at once and fills in two waves:
  // templates/sessions read from the phone, then the exercise library.
  // ---------------------------------------------------------------------------

  const localReady = computed(() => workoutData.localDataReady.value);

  // Captured once: content fades in only where it replaces a placeholder, not on every visit.
  const fadeLocal = !localReady.value;

  /** Name widths for the placeholder template tiles (one tile each). */
  const PLACEHOLDER_NAME_WIDTHS = ["w-20", "w-16", "w-24", "w-14"];

  // Methods
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

  /** Swiped left: asks first, then deletes the session, as «Avbryt» in the session does. */
  const abandonActiveSession = async (sessionId: string) => {
    if (!confirm("Er du sikker på at du vil avbryte denne økten? Dette kan ikke angres og økten vil slettes permanent.")) return;
    vibrate(100);
    try {
      await workoutData.abandonWorkoutSession(sessionId);
    } catch (error) {
      console.error("Error abandoning workout:", error);
      vibrate([200, 100, 200]);
      alert("Kunne ikke avbryte økten. Prøv igjen.");
      return;
    }
    // The session's own unsaved copy (WorkoutSession's `workout-session-<id>`) goes with it
    try {
      localStorage.removeItem(`workout-session-${sessionId}`);
    } catch {
      // Nothing to clean up without storage
    }
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

  // ---------------------------------------------------------------------------
  // Weekly summary — the detailed breakdown lives on /week
  // ---------------------------------------------------------------------------

  const { weekNumber, trainedDayIndices } = useWeekStats(0);

  const todayIdx = computed(() => getTodayIndex());

  /** Visual state for each day dot */
  const getDayState = (idx: number): "done" | "today" | "past" | "future" => {
    if (trainedDayIndices.value.has(idx)) return "done";
    if (idx === todayIdx.value) return "today";
    if (idx < todayIdx.value) return "past";
    return "future";
  };

  // ---------------------------------------------------------------------------
  // Weekly goal streak
  // ---------------------------------------------------------------------------

  const { hasGoals } = useTrainingGoals();
  const {
    ready: streakReady,
    current: streakCurrent,
    best: streakBest,
    chain: streakChain,
    thisWeek,
    thisWeekKey,
    thisWeekTally,
  } = useGoalStreak();

  /**
   * The streak needs both the sessions and the exercise library; until then it's a
   * placeholder, so a reload never flashes "0" or a half-counted week.
   */
  const streakDataReady = computed(() => localReady.value && streakReady.value);
  const showStreak = computed(() => hasGoals.value && streakDataReady.value);
  const fadeStreak = !streakDataReady.value;

  const weeksLabel = (n: number): string => (n === 1 ? "uke på rad" : "uker på rad");

  /** Only the record, when it's higher; how to keep the streak is explained in the sheet behind the (i). */
  const streakMeta = computed(() => (streakBest.value > streakCurrent.value ? `Rekord ${streakBest.value}` : ""));

  const chainLabel = computed(() => {
    const met = streakChain.value.filter((link) => link.approved).length;
    return `${met} av de siste ${streakChain.value.length} ukene nådd`;
  });

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

  // The (i) after the streak opens its rules; the rules sheet and the no-goals line lead to the goal settings
  const showStreakInfo = ref(false);
  const showGoalSettings = ref(false);

  /** From the rules sheet: close it first, so the settings aren't opened behind it. */
  const openGoalSettings = () => {
    showStreakInfo.value = false;
    showGoalSettings.value = true;
  };

  // ---------------------------------------------------------------------------
  // Template tiles and their sheet
  // ---------------------------------------------------------------------------

  /** Numbers for every tile, built once for the page; this week's tally is the streak's. */
  const { statsById } = useTemplateStats(thisWeekTally);

  /** The template whose sheet is open; a template deleted meanwhile closes it. */
  const openTemplateId = ref<string | null>(null);
  const openTemplate = computed(() => (openTemplateId.value ? (templatesById.value.get(openTemplateId.value) ?? null) : null));

  /** Start from the sheet: close it first so the countdown isn't behind it. */
  const startFromSheet = (templateId: string) => {
    openTemplateId.value = null;
    startWorkout(templateId);
  };

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

    <!-- ── Weekly goals → full breakdown on /week ─────────────────────────── -->
    <section class="week-card">
      <!--
        The link is a layer over the whole panel rather than its wrapper, so the
        (i) and «Sett opp» can sit above it as buttons of their own.
      -->
      <router-link to="/week" class="week-card__open" :aria-label="`Ukesmål, uke ${weekNumber}`"></router-link>

      <!-- Header row: hidden from screen readers, the link above already reads «Ukesmål, uke N» -->
      <div class="week-card__header" aria-hidden="true">
        <span class="week-card__title">Ukesmål</span>
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
            <span class="week-card__streak-label">
              {{ streakCurrent > 0 ? weeksLabel(displayedStreak) : "Start en ny streak"
              }}<button type="button" class="week-card__info" aria-label="Slik fungerer streaken" @click="showStreakInfo = true">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.5" stroke-width="2.25" />
                  <path stroke-linecap="round" stroke-width="2.75" d="M12 11v5.5M12 7.5h.01" />
                </svg>
              </button>
            </span>
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
            <svg v-if="getDayState(i) === 'done'" class="week-card__dot-check" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 5.5l2.2 2.2 3.8-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <!-- The check is hidden from screen readers; the day says it in words instead -->
          <span :class="['week-card__day-label', { 'week-card__day-label--today': i === todayIdx }]">
            {{ label }}<span v-if="localReady && getDayState(i) === 'done'" class="sr-only">, trent</span>
          </span>
        </div>
      </div>

      <!--
        With goals the card ends at the day track: what is left this week lives on
        the Ukesmål page, and each template tile shows what it adds. Without goals
        a single line says they exist and opens the settings.
      -->
      <p v-if="!hasGoals" class="week-card__setup">
        Ingen ukesmål ennå.
        <button type="button" class="week-card__setup-btn" @click="showGoalSettings = true">
          Sett opp
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </p>
    </section>

    <!-- Active session: between the week and the templates, known once the sessions are read. Swipe left to cancel it. -->
    <section v-if="localReady && activeSession" class="mt-8">
      <div class="mb-4 flex items-baseline justify-between gap-3">
        <h2 class="text-xl font-semibold text-white">Aktiv økt</h2>
        <span class="text-xs text-dark-400 md:hidden">Sveip til venstre for å avbryte</span>
      </div>
      <SwipeableCard class="active-swipe" :show-swipe-hint="false" @delete="abandonActiveSession(activeSession.id)">
        <ActiveSessionButton :session="activeSession" :color="activeSessionColor" />
      </SwipeableCard>
    </section>

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

      <!-- Placeholder tiles until the templates are read from the phone (same shape as a tile without its goal part) -->
      <div v-if="!localReady" class="tpl-list" aria-hidden="true">
        <div v-for="(width, i) in PLACEHOLDER_NAME_WIDTHS" :key="i" class="tpl-ph">
          <span class="tpl-ph__top">
            <span class="tpl-ph__dot skeleton skeleton--circle"></span>
            <span class="tpl-ph__id">
              <span class="tpl-ph__name"><span :class="['tpl-ph__bar', 'skeleton', width]"></span></span>
              <span class="tpl-ph__meta"><span class="tpl-ph__bar skeleton w-20"></span></span>
            </span>
          </span>
          <span class="tpl-ph__big"><span class="tpl-ph__bar skeleton w-20"></span></span>
          <span class="tpl-ph__label"><span class="tpl-ph__bar skeleton w-16"></span></span>
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

      <!-- Templates — hold and drag a tile to change the order -->
      <div v-else ref="templateListRef" :class="['tpl-list', { 'fade-in': fadeLocal }]">
        <div
          v-for="(template, index) in orderedTemplates"
          :key="template.id"
          :class="['tpl-item', { 'tpl-item--dragging': draggingIndex === index }]"
          :style="draggingIndex === index ? { transform: `translate(${dragX}px, ${dragY}px)` } : undefined"
          @pointerdown="onItemPointerDown($event, index)"
          @click.capture="onTemplateClickCapture">
          <TemplateCard :template="template" :stats="statsById.get(template.id)" @open="openTemplateId = $event" />
        </div>
      </div>
    </div>

    <TemplateSheet
      :template="openTemplate"
      :stats="openTemplate ? statsById.get(openTemplate.id) : undefined"
      :start-disabled="!!activeSession"
      @close="openTemplateId = null"
      @start="startFromSheet" />

    <StreakInfoSheet
      :open="showStreakInfo"
      :current="streakCurrent"
      :best="streakBest"
      @close="showStreakInfo = false"
      @edit-goals="openGoalSettings" />

    <WeekGoalsSettings v-model:visible="showGoalSettings" />

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
  /* The swipe wrapper takes the panel's corners, so the red cancel area behind it is clipped to match */
  .active-swipe {
    border-radius: 0.875rem;
    overflow: hidden;
  }

  /* ── Week summary card ───────────────────────────────────────────────────── */

  .week-card {
    margin-bottom: 2rem;
    padding: 1.125rem 1.25rem 1rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* The link to /week covers the whole panel, border included, and draws the pressed border itself */
  .week-card__open {
    position: absolute;
    inset: -1px;
    z-index: 1;
    border: 1px solid transparent;
    border-radius: inherit;
    transition: border-color 0.15s;
  }

  .week-card__open:active {
    border-color: #334155;
  }

  .week-card__open:focus-visible {
    outline: 2px solid #f97316;
    outline-offset: 2px;
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

  /* ── Without goals: one line that opens the settings ────────────────────── */

  .week-card__setup {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 0.25rem;
    margin: -0.5rem 0 -0.75rem;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  /* Above the link layer, so it opens the settings instead of the week */
  .week-card__setup-btn {
    position: relative;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #fdba74;
    background: none;
    border: 0;
  }

  .week-card__setup-btn svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  /* Pressed: the full orange accent, so the tap registers before the settings open */
  .week-card__setup-btn:active {
    color: #f97316;
  }

  /* style.css removes the focus outline on buttons; keyboard users still need one */
  .week-card__setup-btn:focus-visible {
    outline: 2px solid #f97316;
    outline-offset: 2px;
    border-radius: 0.25rem;
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

  /*
   * The (i): a footnote-sized mark after the label, above the link layer. It
   * looks 12px but its tap area is an invisible 44px circle, so it opts out
   * of the global 44px minimum on buttons.
   */
  .week-card__info {
    position: relative;
    z-index: 2;
    display: inline-flex;
    min-width: 0;
    min-height: 0;
    margin-left: 0.1875rem;
    padding: 0;
    line-height: 0;
    vertical-align: super;
    color: #64748b;
    background: none;
    border: 0;
  }

  .week-card__info::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .week-card__info svg {
    width: 0.75rem;
    height: 0.75rem;
  }

  /* Pressed: a step lighter, so the tap registers before the sheet slides up */
  .week-card__info:active {
    color: #94a3b8;
  }

  .week-card__info:focus-visible {
    outline: 2px solid #f97316;
    outline-offset: 2px;
    border-radius: 50%;
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

  @media (prefers-reduced-motion: reduce) {
    .week-card__streak-num--pop {
      animation: none;
    }

    .week-card__link {
      transition: none;
    }
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

  /* ── Templates ───────────────────────────────────────────────────────────── */

  /*
   * Two columns on a phone (also at 320px), more on wide screens. Tiles in a row
   * share its height. Positioned, so the drag measures the tiles from its corner.
   */
  .tpl-list {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: 0.5rem;
  }

  .tpl-item > * {
    height: 100%;
  }

  /* A long press drags, so it mustn't select text or open the iOS callout */
  .tpl-item {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  /* Lifted while dragged, like an exercise row in the template form */
  .tpl-item--dragging {
    position: relative;
    z-index: 20;
  }

  .tpl-item--dragging > * {
    transform: scale(1.02);
    box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.7);
    cursor: grabbing;
  }

  /* Placeholder tile: same box and line heights as a tile without its goal part */
  .tpl-ph {
    display: flex;
    flex-direction: column;
    padding: 0.875rem 0.875rem 0.75rem;
    background: #111827;
    border: 1px solid #2d3a4f;
    border-radius: 0.875rem;
  }

  .tpl-ph__top {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  /* Stands in for the template's colour dot */
  .tpl-ph__dot {
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
    margin-top: 0.375rem;
  }

  .tpl-ph__id {
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
  }

  .tpl-ph__name {
    font-size: 0.9375rem;
  }

  .tpl-ph__meta {
    font-size: 0.75rem;
  }

  .tpl-ph__big {
    margin-top: 0.875rem;
    font-size: 1.5rem;
    line-height: 1.1;
  }

  .tpl-ph__label {
    margin-top: 0.1875rem;
    font-size: 0.6875rem;
  }

  .tpl-ph__bar {
    display: inline-block;
    height: 0.7em;
    vertical-align: middle;
  }
</style>
