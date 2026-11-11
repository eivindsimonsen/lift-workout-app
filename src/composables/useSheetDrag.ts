import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from "vue";

/**
 * Pull a bottom sheet down by its top (the handle and the header) to close it.
 *
 * Only the grab area starts the gesture, so number fields, swipe-to-delete rows
 * and scrolling in the rest of the sheet behave as before. The grab area needs
 * `touch-action: none`; otherwise the browser claims the gesture for scrolling
 * and cancels the pointer events.
 */

/** Movement before a press on the grab area is judged — the same slop as the app's other gestures, so a sloppy tap stays a tap. */
export const DRAG_START_PX = 8;

const FLICK_PX_PER_MS = 0.5;
const FLICK_MIN_PX = 24;
const CLOSE_MS = 220;
const SETTLE_MS = 250;
/** Velocity is measured over the last ~100 ms of movement. */
const VELOCITY_WINDOW_MS = 100;

/** True once the movement is a drag down: more than DRAG_START_PX, and more down than sideways. */
export const isDownwardDrag = (dx: number, dy: number): boolean => dy > DRAG_START_PX && dy > Math.abs(dx);

/**
 * What a press has become: still within the slop on both axes ("wait"), a pull
 * down ("drag"), or something else ("ignore"). Judging only once an axis is past
 * the slop keeps a slow pull that drifts a little sideways from being dropped.
 */
export const pressDecision = (dx: number, dy: number): "wait" | "drag" | "ignore" => {
  if (Math.abs(dx) <= DRAG_START_PX && Math.abs(dy) <= DRAG_START_PX) return "wait";
  return isDownwardDrag(dx, dy) ? "drag" : "ignore";
};

/** Close when pulled past a quarter of the panel's height, or flicked down after at least FLICK_MIN_PX. */
export const shouldCloseSheet = (dy: number, panelHeight: number, velocityPxPerMs: number): boolean =>
  dy > panelHeight / 4 || (velocityPxPerMs > FLICK_PX_PER_MS && dy >= FLICK_MIN_PX);

export interface SheetDragOptions {
  /** The panel that moves; its height sets the close threshold. */
  panelEl: Ref<HTMLElement | null>;
  /** The sheet's own open state; the gesture resets when it opens again. */
  isOpen: () => boolean;
  onClose: () => void;
}

/**
 * pressed: finger down on the grab area, not yet a drag (a tap stays a tap).
 * settling: springing back after a drag that didn't close.
 * closing: sliding out; stays until the sheet opens again, so the leave
 * transition doesn't pull the panel back up first.
 */
type Phase = "idle" | "pressed" | "dragging" | "settling" | "closing";

export const useSheetDrag = (
  options: SheetDragOptions,
): {
  panelStyle: ComputedRef<Record<string, string>>;
  backdropStyle: ComputedRef<Record<string, string>>;
  onGrabPointerDown: (event: PointerEvent) => void;
  onGrabClickCapture: (event: MouseEvent) => void;
} => {
  const phase = ref<Phase>("idle");
  const offset = ref(0);
  const height = ref(0);

  let startX = 0;
  let startY = 0;
  /** The finger the gesture belongs to; a second finger neither moves nor releases the sheet. */
  let pointerId: number | null = null;
  let samples: { t: number; y: number }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let suppressClick = false;

  const reducedMotion = (): boolean => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  const transition = (css: string): string => (reducedMotion() ? "none" : css);

  const clearTimer = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const velocity = (): number => {
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.t - first.t;
    return dt > 0 ? (last.y - first.y) / dt : 0;
  };

  /** True for events from another finger than the one the gesture started with. */
  const isOtherPointer = (event: PointerEvent): boolean => pointerId !== null && event.pointerId !== pointerId;

  const onGrabPointerDown = (event: PointerEvent) => {
    // A touch after a drag usually brings no click, so the flag would linger and eat the next tap
    suppressClick = false;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (phase.value === "closing" || phase.value === "dragging" || phase.value === "pressed") return;
    const panel = options.panelEl.value;
    // Scrolled down, the top is out of view: the sheet scrolls up first
    if (!panel || panel.scrollTop > 0) return;

    clearTimer();
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    samples = [{ t: event.timeStamp, y: event.clientY }];
    phase.value = "pressed";
  };

  const onWindowPointerMove = (event: PointerEvent) => {
    if (phase.value !== "pressed" && phase.value !== "dragging") return;
    if (isOtherPointer(event)) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (phase.value === "pressed") {
      const decision = pressDecision(dx, dy);
      if (decision === "wait") return;
      // Up or sideways isn't a pull to close; let the press be
      if (decision === "ignore") {
        phase.value = "idle";
        pointerId = null;
        return;
      }
      height.value = options.panelEl.value?.offsetHeight ?? 0;
      phase.value = "dragging";
    }

    offset.value = Math.max(0, dy);
    samples.push({ t: event.timeStamp, y: event.clientY });
    const cutoff = event.timeStamp - VELOCITY_WINDOW_MS;
    while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
  };

  const settle = () => {
    offset.value = 0;
    if (reducedMotion()) {
      phase.value = "idle";
      return;
    }
    phase.value = "settling";
    timer = setTimeout(() => {
      timer = null;
      phase.value = "idle";
    }, SETTLE_MS);
  };

  const onWindowPointerUp = (event: PointerEvent) => {
    if (isOtherPointer(event)) return;
    if (phase.value === "pressed") {
      // A tap: its click goes through (the handle closes, the buttons work)
      phase.value = "idle";
      pointerId = null;
      return;
    }
    if (phase.value !== "dragging") return;
    pointerId = null;

    // The pointerup that ends a drag still produces a click on the grab area
    suppressClick = true;
    if (shouldCloseSheet(offset.value, height.value, velocity())) {
      phase.value = "closing";
      timer = setTimeout(
        () => {
          timer = null;
          options.onClose();
        },
        reducedMotion() ? 0 : CLOSE_MS,
      );
    } else {
      settle();
    }
  };

  /** Lost the finger without a release: spring back, never close. */
  const interrupt = () => {
    pointerId = null;
    if (phase.value === "pressed") phase.value = "idle";
    else if (phase.value === "dragging") settle();
  };

  const onWindowPointerCancel = (event: PointerEvent) => {
    if (isOtherPointer(event)) return;
    interrupt();
  };

  /**
   * Locking the phone or switching apps mid-drag can end the touch with no
   * pointercancel at all; left as is, the next touch anywhere would move the sheet.
   */
  const onVisibilityChange = () => {
    if (document.hidden) interrupt();
  };

  const onGrabClickCapture = (event: MouseEvent) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.stopPropagation();
    event.preventDefault();
  };

  /** Empty while idle, so the sheet's enter/leave transition owns the transform. */
  const panelStyle = computed((): Record<string, string> => {
    switch (phase.value) {
      case "dragging":
        return { transform: `translateY(${offset.value}px)`, transition: "none" };
      case "settling":
        return { transform: "translateY(0px)", transition: transition(`transform ${SETTLE_MS}ms ease-out`) };
      case "closing":
        return { transform: `translateY(${height.value}px)`, transition: transition(`transform ${CLOSE_MS}ms cubic-bezier(0.4, 0, 1, 1)`) };
      default:
        return {};
    }
  });

  /** The backdrop fades as the sheet is pulled down. */
  const backdropStyle = computed((): Record<string, string> => {
    switch (phase.value) {
      case "dragging":
        return { opacity: String(height.value > 0 ? Math.max(0, 1 - offset.value / height.value) : 1), transition: "none" };
      case "settling":
        return { opacity: "1", transition: transition(`opacity ${SETTLE_MS}ms ease-out`) };
      case "closing":
        return { opacity: "0", transition: transition(`opacity ${CLOSE_MS}ms ease-in`) };
      default:
        return {};
    }
  });

  // A sheet that was pulled shut opens again in its normal place
  watch(
    () => options.isOpen(),
    (open) => {
      if (!open) return;
      clearTimer();
      offset.value = 0;
      phase.value = "idle";
    },
  );

  onMounted(() => {
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerCancel);
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("visibilitychange", onVisibilityChange);
  });

  onUnmounted(() => {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerCancel);
    window.removeEventListener("blur", interrupt);
    window.removeEventListener("pagehide", interrupt);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    clearTimer();
  });

  return { panelStyle, backdropStyle, onGrabPointerDown, onGrabClickCapture };
};
