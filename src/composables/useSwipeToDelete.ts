import { onMounted, onUnmounted, reactive } from "vue";

export interface SwipeToDeleteOptions {
  /** How far (px) a row must travel left in one gesture to be deleted. */
  threshold?: number;
  /** Rows that can't be swiped right now — e.g. a cardio round whose clock is running. */
  canSwipe?: (key: string) => boolean;
  onDelete: (key: string) => void;
}

/** Movement before a gesture commits to an axis — enough that a tap stays a tap. */
const AXIS_LOCK_PX = 8;

/**
 * Swipe-left-to-delete for list rows: strength sets, cardio rounds, SwipeableCard.
 *
 * Built to survive interrupted gestures. When the phone locks or the app goes to
 * the background mid-touch, the browser sends `touchcancel` — or nothing — instead
 * of `touchend`. The earlier handlers only listened for `touchend` and decided from
 * the row's displayed offset, so a half-swipe left behind by a screen lock stayed on
 * screen, and the next plain tap on that row deleted it. Here a delete is decided
 * only by the movement of the gesture that is ending, and any interruption resets
 * every row.
 */
export const useSwipeToDelete = (options: SwipeToDeleteOptions) => {
  const threshold = options.threshold ?? 60;

  /** Displayed offset per row (≤ 0), and whether the delete background shows. */
  const offset = reactive<Record<string, number>>({});
  const revealed = reactive<Record<string, boolean>>({});

  type Gesture = { key: string; startX: number; startY: number; dx: number; axis: "x" | "y" | null };
  let gesture: Gesture | null = null;

  const resetAll = () => {
    gesture = null;
    Object.keys(offset).forEach((key) => {
      offset[key] = 0;
      revealed[key] = false;
    });
  };

  const onTouchStart = (event: TouchEvent, key: string) => {
    // Clear anything an earlier, interrupted gesture may have left on screen.
    resetAll();
    if (event.touches.length !== 1) return;
    if (options.canSwipe && !options.canSwipe(key)) return;
    gesture = { key, startX: event.touches[0].clientX, startY: event.touches[0].clientY, dx: 0, axis: null };
  };

  const onTouchMove = (event: TouchEvent, key: string) => {
    if (!gesture || gesture.key !== key || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - gesture.startX;
    const dy = event.touches[0].clientY - gesture.startY;

    if (!gesture.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      // Decided once per gesture: a scroll that drifts sideways never becomes a delete.
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (gesture.axis !== "x") return;

    gesture.dx = Math.min(0, dx);
    offset[key] = Math.max(gesture.dx, -threshold * 1.5);
    revealed[key] = -gesture.dx > threshold / 3;
  };

  const onTouchEnd = (key: string) => {
    const ended = gesture;
    resetAll();
    if (ended && ended.key === key && ended.axis === "x" && -ended.dx >= threshold) options.onDelete(key);
  };

  /** The system took over the touch — a lock, a notification, an app switch. Never a delete. */
  const onTouchCancel = () => resetAll();

  // Locking the phone mid-gesture doesn't always deliver touchcancel; the page hiding always tells.
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") resetAll();
  };

  onMounted(() => {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", resetAll);
    window.addEventListener("blur", resetAll);
  });

  onUnmounted(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", resetAll);
    window.removeEventListener("blur", resetAll);
  });

  return { offset, revealed, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
};
