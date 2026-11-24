<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from "vue";
  import { isCardioExercise } from "@/composables/useSetMetrics";
  import { formatClock, liveExerciseSeconds } from "@/composables/useCardioTimer";
  import type { WorkoutExercise, WorkoutSession } from "@/types/workout";

  /**
   * The active session as a panel on the home page, under the week: name, time
   * since start and logged sets, one tap back into the session. The home page
   * wraps it in a swipe-to-cancel.
   */
  const props = defineProps<{
    session: WorkoutSession;
    /** The template's own colour; null when it has none or was deleted, which keeps the default colours. */
    color: string | null;
  }>();

  /**
   * Sets logged in the session live in its local copy (WorkoutSession's
   * `workout-session-<id>`) until the session is saved, so read that first —
   * otherwise the panel could show fewer sets than the session itself after an
   * app restart.
   */
  const readLocalExercises = (sessionId: string): WorkoutExercise[] | null => {
    try {
      const raw = localStorage.getItem(`workout-session-${sessionId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.exercises) ? (parsed.exercises as WorkoutExercise[]) : null;
    } catch {
      return null;
    }
  };

  const exercises = computed(() => readLocalExercises(props.session.id) ?? props.session.exercises ?? []);

  // Same counts as the top of the active session: completed sets out of all sets.
  const completedSets = computed(() => exercises.value.reduce((n, ex) => n + ex.sets.filter((set) => set.isCompleted).length, 0));
  const totalSets = computed(() => exercises.value.reduce((n, ex) => n + ex.sets.length, 0));

  /** A run is one round that only counts once saved, so cardio shows a full ring and active time instead. */
  const isCardioOnly = computed(() => exercises.value.length > 0 && exercises.value.every((ex) => isCardioExercise(ex)));

  const now = ref(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });
  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  const elapsed = computed(() => formatClock((now.value - new Date(props.session.date).getTime()) / 1000));
  const activeTime = computed(() => formatClock(exercises.value.reduce((sum, ex) => sum + liveExerciseSeconds(ex, now.value), 0)));

  const progress = computed(() => (isCardioOnly.value ? 1 : totalSets.value > 0 ? completedSets.value / totalSets.value : 0));
  /** Tints the panel, the ring and the live dot. Without a template colour: orange, or cyan for cardio only. */
  const tint = computed(() => props.color ?? (isCardioOnly.value ? "#06b6d4" : "#f97316"));
  const detail = computed(() => (isCardioOnly.value ? `Aktiv tid ${activeTime.value}` : `${completedSets.value} av ${totalSets.value} sett`));
</script>

<template>
  <router-link
    :to="`/workout/${session.id}`"
    class="active-tile"
    :style="{ '--tint': tint }"
    :aria-label="`Fortsett ${session.templateName}, ${detail}`">
    <span class="active-tile__ring-wrap" aria-hidden="true">
      <span class="active-tile__ring" :style="{ '--progress': `${Math.round(progress * 100)}%` }"></span>
      <span class="active-tile__live"></span>
    </span>
    <span class="active-tile__text">
      <span class="active-tile__title">
        <span class="active-tile__name">{{ session.templateName }}</span>
        <span class="active-tile__time">{{ elapsed }}</span>
      </span>
      <span class="active-tile__detail">{{ detail }}</span>
    </span>
    <svg class="active-tile__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </router-link>
</template>

<style scoped>
  /* In the page's flow, full width; the look is the sheet colours the tile had */
  .active-tile {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 3.75rem;
    padding: 0.75rem 1rem 0.75rem 0.875rem;
    /* Opaque, also with the tint below, so the swipe's red stays hidden */
    background: #1a2233;
    border: 1px solid #2d3a4f;
    border-radius: 0.875rem;
    color: #f1f5f9;
    -webkit-tap-highlight-color: transparent;
  }

  .active-tile:active {
    background: #243044;
  }

  .active-tile__ring-wrap {
    position: relative;
    width: 2.125rem;
    height: 2.125rem;
    flex-shrink: 0;
  }

  /* Masked to a ring, so the panel's tint shows through the middle */
  .active-tile__ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(var(--tint) var(--progress), #243044 0);
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4.5px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4.5px));
  }

  .active-tile__live {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.4375rem;
    height: 0.4375rem;
    margin: -0.21875rem 0 0 -0.21875rem;
    border-radius: 50%;
    background: var(--tint);
    animation: active-tile-live 1.6s ease-in-out infinite;
  }

  /* The tint fades in from the ring side. Behind @supports, because a color-mix() with
     var() can't fall back to an earlier declaration: unsupported, it would leave the
     panel transparent and drop the ring instead of the flat look above. */
  @supports (color: color-mix(in srgb, red 50%, blue)) {
    .active-tile {
      background: linear-gradient(90deg, color-mix(in srgb, var(--tint) 24%, #1a2233) 0%, #1a2233 70%);
    }

    .active-tile:active {
      background: linear-gradient(90deg, color-mix(in srgb, var(--tint) 24%, #243044) 0%, #243044 70%);
    }

    .active-tile__ring {
      background: conic-gradient(var(--tint) var(--progress), color-mix(in srgb, var(--tint) 25%, #243044) 0);
    }
  }

  @keyframes active-tile-live {
    50% {
      opacity: 0.35;
    }
  }

  .active-tile__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .active-tile__title {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .active-tile__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-tile__time {
    flex-shrink: 0;
    font-weight: 500;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
  }

  .active-tile__detail {
    font-size: 0.75rem;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }

  .active-tile__chevron {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: #64748b;
  }

  @media (prefers-reduced-motion: reduce) {
    .active-tile__live {
      animation: none;
    }
  }
</style>
