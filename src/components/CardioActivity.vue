<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { computed, ref } from "vue";
  import { useSwipeToDelete } from "@/composables/useSwipeToDelete";
  import type { WorkoutExercise } from "@/types/workout";
  import { vibrate } from "@/composables/useHaptics";
  import { formatDistance, isSetLogged } from "@/composables/useSetMetrics";
  import {
    addRound,
    cardioTimerState,
    formatClock,
    isSetRunning,
    lapTimer,
    liveExerciseSeconds,
    liveSetSeconds,
    pauseTimer,
    setRoundDistance,
    setRoundSeconds,
    startNewRound,
    startOrResume,
  } from "@/composables/useCardioTimer";
  import { EFFORT_LEVELS, activityPace, effortLabel } from "@/composables/useCardioActivities";

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  /**
   * The active-session view of one cardio exercise: a stopwatch with rounds,
   * optional distance, perceived effort and a note.
   *
   * `exercise` is the session's own object and is edited in place, the same
   * way the strength set rows edit theirs — WorkoutSession owns persistence and
   * saves on every `change`.
   */
  const props = defineProps<{
    exercise: WorkoutExercise;
    /** Wall clock from the parent's ticker, so the row list and this view agree. */
    now: number;
  }>();

  /** `remove-exercise`: the last round was swiped away — like the last strength set, that removes the exercise. */
  const emit = defineEmits<{ change: []; "remove-exercise": [] }>();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const hasDistance = computed(() => props.exercise.sets.some((s) => Number(s.distance) > 0));

  /** Km is opt-in per activity: hidden until asked for, open again only if km was logged. */
  const distanceOpen = ref(hasDistance.value);

  const state = computed(() => cardioTimerState(props.exercise));
  const totalSeconds = computed(() => liveExerciseSeconds(props.exercise, props.now));
  const runningIndex = computed(() => props.exercise.sets.findIndex(isSetRunning));

  /** Rounds worth listing: logged, running, or the single row to type into. */
  const rounds = computed(() => props.exercise.sets);

  const roundCount = computed(() => props.exercise.sets.filter((s) => isSetRunning(s) || isSetLogged(props.exercise, s)).length);

  const currentRoundLabel = computed(() => {
    if (runningIndex.value < 0 || props.exercise.sets.length < 2) return null;
    const seconds = liveSetSeconds(props.exercise.sets[runningIndex.value], props.now);
    return `Runde ${runningIndex.value + 1} · ${formatClock(seconds)}`;
  });

  const totalMetres = computed(() => props.exercise.sets.reduce((sum, s) => sum + (Number(s.distance) || 0), 0));

  const pace = computed(() =>
    activityPace(props.exercise.sets.filter((s) => !isSetRunning(s)).map((s) => ({ seconds: Number(s.duration) || 0, metres: Number(s.distance) || 0 }))),
  );

  const summaryParts = computed(() => {
    const parts: string[] = [];
    if (roundCount.value > 1) parts.push(`${roundCount.value} runder`);
    if (totalMetres.value > 0) parts.push(formatDistance(totalMetres.value));
    if (pace.value) parts.push(pace.value);
    return parts;
  });

  const stateLabel = computed(() => ({ idle: "Klar", running: "Pågår", paused: "Pause" })[state.value]);

  // ---------------------------------------------------------------------------
  // Clock controls
  // ---------------------------------------------------------------------------

  const commit = () => emit("change");

  const onPrimary = () => {
    const now = Date.now();
    if (state.value === "running") pauseTimer(props.exercise, now);
    else startOrResume(props.exercise, now);
    vibrate(30);
    commit();
  };

  const onLap = () => {
    lapTimer(props.exercise, Date.now());
    vibrate([20, 40, 20]);
    commit();
  };

  const onNewRound = () => {
    startNewRound(props.exercise, Date.now());
    vibrate(30);
    commit();
  };

  const primaryLabel = computed(() => ({ idle: "Start", running: "Pause", paused: "Fortsett" })[state.value]);

  // ---------------------------------------------------------------------------
  // Rounds — hand-entered time and distance
  // ---------------------------------------------------------------------------

  /** The input being typed in — left unformatted so the value doesn't jump mid-edit. */
  const focusedInput = ref<string | null>(null);

  const minutesOf = (seconds: unknown): string => {
    const total = Number(seconds) || 0;
    return total > 0 ? String(Math.floor(total / 60)) : "";
  };

  /** "05" rather than "5" once a time is set, so 32:05 reads as a time. */
  const secondsOf = (seconds: unknown, inputKey: string): string => {
    const total = Number(seconds) || 0;
    if (total === 0) return "";
    const secs = total % 60;
    return focusedInput.value === inputKey ? String(secs) : String(secs).padStart(2, "0");
  };

  const kmOf = (metres: unknown): string => {
    const m = Number(metres) || 0;
    return m === 0 ? "" : String(m / 1000).replace(".", ",");
  };

  const onTimeInput = (event: Event, index: number, part: "min" | "sec") => {
    const raw = (event.target as HTMLInputElement).value;
    const entered = raw === "" ? 0 : Math.max(0, parseInt(raw) || 0);
    const current = Number(props.exercise.sets[index]?.duration) || 0;
    const minutes = part === "min" ? entered : Math.floor(current / 60);
    // Clamp rather than roll over, so what you typed is what you see.
    const seconds = part === "sec" ? Math.min(59, entered) : current % 60;
    setRoundSeconds(props.exercise, index, minutes * 60 + seconds);
    commit();
  };

  const onDistanceInput = (event: Event, index: number) => {
    const raw = (event.target as HTMLInputElement).value.replace(",", ".");
    const km = raw === "" ? 0 : parseFloat(raw) || 0;
    setRoundDistance(props.exercise, index, km * 1000);
    commit();
  };

  /**
   * Turning km off removes it from the rounds, so what's saved matches what's
   * shown — a hidden distance would still count towards pace and totals.
   */
  const toggleDistance = () => {
    if (!distanceOpen.value) {
      distanceOpen.value = true;
      return;
    }
    if (hasDistance.value && !confirm("Fjerne km fra alle rundene?")) return;
    props.exercise.sets.forEach((_, index) => setRoundDistance(props.exercise, index, 0));
    distanceOpen.value = false;
    commit();
  };

  const onAddRound = () => {
    addRound(props.exercise);
    commit();
  };

  /** "04:05 totalt · 1,00 km" under the rounds, like "1 650 kg totalt" under strength sets. */
  const roundsSummary = computed(() => {
    const parts = [`${formatClock(totalSeconds.value)} totalt`];
    if (totalMetres.value > 0) parts.push(formatDistance(totalMetres.value));
    return parts.join(" · ");
  });

  // ---------------------------------------------------------------------------
  // Swipe to delete — the same gesture as strength sets
  // ---------------------------------------------------------------------------

  /** Looked up by id when the swipe completes, so the index is the current one. */
  const removeRound = (setId: string) => {
    const index = props.exercise.sets.findIndex((s) => s.id === setId);
    if (index < 0 || isSetRunning(props.exercise.sets[index])) return;
    vibrate(50);
    if (props.exercise.sets.length <= 1) {
      emit("remove-exercise");
      return;
    }
    props.exercise.sets.splice(index, 1);
    commit();
  };

  const roundSwipe = useSwipeToDelete({
    // A round that is still being timed can't be swiped away.
    canSwipe: (setId) => !isSetRunning(props.exercise.sets.find((s) => s.id === setId)),
    onDelete: removeRound,
  });

  // ---------------------------------------------------------------------------
  // Effort and note
  // ---------------------------------------------------------------------------

  const onEffort = (level: number) => {
    // Tapping the chosen level again clears it — effort is optional.
    props.exercise.effort = props.exercise.effort === level ? undefined : level;
    vibrate(15);
    commit();
  };

  /** One line until there's more to say: the field grows with what's typed. */
  const onNote = (event: Event) => {
    const field = event.target as HTMLTextAreaElement;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight + 2}px`;
    props.exercise.note = field.value.trim() ? field.value : undefined;
    commit();
  };
</script>

<template>
  <div class="cardio">
    <!-- Clock -->
    <div class="cardio__clock-block">
      <span class="cardio__state" :class="`cardio__state--${state}`">
        <span class="cardio__state-dot"></span>
        {{ stateLabel }}
      </span>
      <p class="cardio__clock" :class="{ 'cardio__clock--idle': state === 'idle' }">{{ formatClock(totalSeconds) }}</p>
      <p v-if="currentRoundLabel" class="cardio__sub">{{ currentRoundLabel }}</p>
      <p v-else-if="summaryParts.length > 0" class="cardio__sub">{{ summaryParts.join(" · ") }}</p>
    </div>

    <!-- Controls -->
    <div class="cardio__controls">
      <button v-if="state === 'running'" type="button" class="cardio__btn cardio__btn--secondary" @click="onLap">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
        Runde
      </button>
      <button v-else-if="state === 'paused'" type="button" class="cardio__btn cardio__btn--secondary" @click="onNewRound">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.25" d="M12 5v14m7-7H5" />
        </svg>
        Ny runde
      </button>

      <button type="button" class="cardio__btn cardio__btn--primary" @click="onPrimary">
        <svg v-if="state === 'running'" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
        <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5.14v13.72a1 1 0 001.5.86l11-6.86a1 1 0 000-1.72l-11-6.86A1 1 0 008 5.14z" />
        </svg>
        {{ primaryLabel }}
      </button>
    </div>

    <!-- Rounds -->
    <section class="cardio__section">
      <div class="cardio__section-head">
        <h3 class="cardio__section-title">{{ rounds.length > 1 ? "Runder" : "Tid" }}</h3>
        <div class="cardio__head-actions">
          <button
            type="button"
            class="cardio__chip"
            :class="{ 'cardio__chip--on': distanceOpen }"
            :aria-pressed="distanceOpen"
            :aria-label="distanceOpen ? 'Fjern km' : 'Legg til km'"
            @click="toggleDistance">
            <svg v-if="distanceOpen" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span v-else aria-hidden="true">+</span>
            Km
          </button>
        </div>
      </div>

      <div class="cardio__rounds">
        <div
          v-for="(set, index) in rounds"
          :key="set.id"
          class="cardio__swipe"
          @touchstart="(event) => roundSwipe.onTouchStart(event, set.id)"
          @touchmove="(event) => roundSwipe.onTouchMove(event, set.id)"
          @touchend="roundSwipe.onTouchEnd(set.id)"
          @touchcancel="roundSwipe.onTouchCancel()">
          <!-- Revealed behind the row while swiping -->
          <div class="cardio__swipe-bg" :class="{ 'cardio__swipe-bg--visible': roundSwipe.revealed[set.id] }" aria-hidden="true">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <div
            class="cardio__round"
            :class="{ 'cardio__round--running': isSetRunning(set), 'cardio__round--km': distanceOpen }"
            :style="{ transform: `translateX(${roundSwipe.offset[set.id] ?? 0}px)`, transition: roundSwipe.offset[set.id] ? 'none' : 'transform 0.2s ease-out' }">
            <span class="cardio__round-num">{{ index + 1 }}</span>

            <span v-if="isSetRunning(set)" class="cardio__round-live">
              <span class="cardio__state-dot"></span>
              {{ formatClock(liveSetSeconds(set, now)) }}
            </span>
            <span v-else class="cardio__time">
              <input
                :value="minutesOf(set.duration)"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                class="cardio__input"
                placeholder="min"
                aria-label="Minutter"
                @input="(event) => onTimeInput(event, index, 'min')" />
              <span class="cardio__time-sep">:</span>
              <input
                :value="secondsOf(set.duration, `${set.id}-sec`)"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                class="cardio__input"
                placeholder="sek"
                aria-label="Sekunder"
                @focus="focusedInput = `${set.id}-sec`"
                @blur="focusedInput = null"
                @input="(event) => onTimeInput(event, index, 'sec')" />
            </span>

            <span v-if="distanceOpen" class="cardio__km">
              <input
                :value="kmOf(set.distance)"
                type="text"
                inputmode="decimal"
                class="cardio__input"
                placeholder="km"
                aria-label="Kilometer"
                @input="(event) => onDistanceInput(event, index)" />
            </span>
          </div>
        </div>
      </div>

      <!-- Same as "+ Sett" under strength sets: what's logged, and add another -->
      <!-- <div class="cardio__rounds-foot">
        <span class="cardio__rounds-sum">{{ roundsSummary }}</span>
        <button
          type="button"
          class="cardio__add-round"
          :disabled="state === 'running'"
          :title="state === 'running' ? 'Bruk «Runde» mens klokka går' : 'Legg til runde'"
          @click="onAddRound">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Runde
        </button>
      </div> -->
    </section>

    <!-- Effort and note — always shown; the session is finished from the page, not here -->
    <section class="cardio__section">
      <div class="cardio__section-head">
        <h3 class="cardio__section-title">Anstrengelse</h3>
        <span v-if="exercise.effort" class="cardio__effort-label">{{ exercise.effort }} · {{ effortLabel(exercise.effort) }}</span>
        <span v-else class="cardio__effort-label cardio__effort-label--muted">1 lett · 10 maks</span>
      </div>
      <div class="cardio__effort" role="radiogroup" aria-label="Anstrengelse fra 1 til 10">
        <button
          v-for="level in EFFORT_LEVELS"
          :key="level"
          type="button"
          role="radio"
          class="cardio__effort-btn"
          :class="{ 'cardio__effort-btn--active': exercise.effort === level, 'cardio__effort-btn--within': !!exercise.effort && level < exercise.effort }"
          :aria-checked="exercise.effort === level"
          @click="onEffort(level)">
          {{ level }}
        </button>
      </div>

      <textarea
        :value="exercise.note ?? ''"
        rows="1"
        class="cardio__note"
        aria-label="Notat"
        placeholder="Notat, f.eks. «kamp mot Lyn» eller «4×4 på mølla»"
        @input="onNote"></textarea>
    </section>
  </div>
</template>

<style scoped>
  /* Bottom padding clears the home indicator on phones. */
  .cardio {
    padding: 0.875rem 1rem calc(1rem + env(safe-area-inset-bottom));
  }

  /* ── Clock ───────────────────────────────────────────────────────────────── */

  .cardio__clock-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    text-align: center;
  }

  .cardio__state {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }

  .cardio__state-dot {
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  .cardio__state--running {
    color: #22d3ee;
  }

  .cardio__state--running .cardio__state-dot,
  .cardio__round-live .cardio__state-dot {
    animation: cardio-pulse 1.4s ease-in-out infinite;
  }

  .cardio__state--paused {
    color: #f59e0b;
  }

  @keyframes cardio-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cardio__state--running .cardio__state-dot,
    .cardio__round-live .cardio__state-dot {
      animation: none;
    }
  }

  /* Tabular figures on purpose: the clock updates every second, and
     proportional digits would make it jitter sideways. */
  .cardio__clock {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }

  .cardio__clock--idle {
    color: #475569;
  }

  .cardio__sub {
    font-size: 0.8125rem;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }

  /* ── Controls ────────────────────────────────────────────────────────────── */

  .cardio__controls {
    display: flex;
    gap: 0.625rem;
    margin-top: 0.875rem;
  }

  .cardio__btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 3rem;
    font-size: 1rem;
    font-weight: 700;
    border-radius: 0.875rem;
    cursor: pointer;
    transition:
      background 0.15s,
      transform 0.1s;
    touch-action: manipulation;
  }

  .cardio__btn:active {
    transform: scale(0.98);
  }

  .cardio__btn--primary {
    color: #fff;
    background: #f97316;
  }

  .cardio__btn--primary:active {
    background: #ea580c;
  }

  .cardio__btn--secondary {
    color: #e2e8f0;
    background: #243044;
    border: 1px solid #3d5068;
  }

  .cardio__btn--secondary:active {
    background: #2d3a4f;
  }

  .cardio__hint {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    line-height: 1.35;
    color: #64748b;
    text-align: center;
  }

  /* ── Sections ────────────────────────────────────────────────────────────── */

  .cardio__section {
    margin-top: 0.875rem;
    padding-top: 0.75rem;
    border-top: 1px solid #2d3a4f;
  }

  .cardio__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 2rem;
  }

  .cardio__section-title {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }

  .cardio__head-actions {
    display: flex;
    gap: 0.375rem;
  }

  /* Compact toggles; opt out of the global 44px button minimum. */
  .cardio__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-width: auto;
    min-height: 2rem;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #cbd5e1;
    background: #243044;
    border: 1px solid #3d5068;
    border-radius: 999px;
    cursor: pointer;
    touch-action: manipulation;
  }

  .cardio__chip--on {
    color: #fdba74;
    background: #f9731618;
    border-color: #f9731640;
  }

  /* ── Rounds ──────────────────────────────────────────────────────────────── */

  .cardio__rounds {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-top: 0.5rem;
  }

  /* Opaque row over the red delete background, so the red only shows while swiping. */
  .cardio__round {
    position: relative;
    display: grid;
    grid-template-columns: 1.5rem 1fr;
    align-items: center;
    gap: 0.5rem;
    background: #1a2233;
  }

  .cardio__round--km {
    grid-template-columns: 1.5rem 1fr 5.5rem;
  }

  .cardio__swipe {
    position: relative;
    overflow: hidden;
    border-radius: 0.625rem;
  }

  .cardio__swipe-bg {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 1.25rem;
    color: #fff;
    background: #dc2626;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .cardio__swipe-bg--visible {
    opacity: 1;
  }

  .cardio__rounds-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.625rem;
  }

  .cardio__rounds-sum {
    font-size: 0.6875rem;
    color: #7b8fa8;
    font-variant-numeric: tabular-nums;
  }

  /* Matches .ex-card__add-set on strength exercises. */
  .cardio__add-round {
    display: inline-flex;
    align-items: center;
    gap: 0.3125rem;
    min-width: auto;
    min-height: 2.25rem;
    padding: 0.4375rem 0.875rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #f97316;
    background: #f9731612;
    border: 1px solid #f9731630;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .cardio__add-round:hover {
    background: #f9731622;
  }

  .cardio__add-round:disabled {
    color: #475569;
    background: #1e293b;
    border-color: #334155;
    cursor: not-allowed;
  }

  .cardio__round-num {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #64748b;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .cardio__round--running .cardio__round-num {
    color: #22d3ee;
  }

  .cardio__time {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  .cardio__time-sep {
    font-weight: 700;
    color: #64748b;
  }

  .cardio__round-live {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 2.5rem;
    padding: 0 0.75rem;
    font-size: 1rem;
    font-weight: 700;
    color: #22d3ee;
    background: #06b6d414;
    border: 1px solid #06b6d440;
    border-radius: 0.625rem;
    font-variant-numeric: tabular-nums;
  }

  .cardio__km {
    display: flex;
  }

  .cardio__input {
    width: 100%;
    min-width: 0;
    height: 2.5rem;
    padding: 0 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: #f3f4f6;
    background: #243044;
    border: 1px solid #3d5068;
    border-radius: 0.625rem;
    text-align: center;
    -webkit-appearance: none;
    appearance: none;
    font-variant-numeric: tabular-nums;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .cardio__input::placeholder {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
  }

  .cardio__input:focus {
    outline: none;
    border-color: #f97316;
    background: #2d3a4f;
    box-shadow: 0 0 0 3px #f9731620;
  }

  /* ── Effort and note ─────────────────────────────────────────────────────── */

  .cardio__effort-label {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #e2e8f0;
  }

  .cardio__effort-label--muted {
    font-weight: 500;
    color: #64748b;
  }

  .cardio__effort {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .cardio__effort-btn {
    min-width: 0;
    min-height: 0;
    height: 2.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: #94a3b8;
    background: #243044;
    border: 1px solid #3d5068;
    border-radius: 0.5rem;
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    touch-action: manipulation;
    transition:
      color 0.15s,
      background 0.15s,
      border-color 0.15s;
  }

  /* Levels below the chosen one read as a filled scale up to it. */
  .cardio__effort-btn--within {
    color: #fdba74;
    background: #f9731618;
    border-color: #f9731640;
  }

  .cardio__effort-btn--active {
    color: #fff;
    background: #f97316;
    border-color: #f97316;
  }

  .cardio__note {
    display: block;
    width: 100%;
    min-height: 2.5rem;
    margin-top: 0.5rem;
    padding: 0.5625rem 0.75rem;
    font-size: 0.9375rem;
    line-height: 1.4;
    color: #f3f4f6;
    background: #243044;
    border: 1px solid #3d5068;
    border-radius: 0.625rem;
    resize: none;
    overflow: hidden;
    field-sizing: content;
  }

  .cardio__note::placeholder {
    color: #64748b;
  }

  .cardio__note:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 3px #f9731620;
  }
</style>
