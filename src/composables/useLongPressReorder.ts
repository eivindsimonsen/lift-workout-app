import { onMounted, onUnmounted, nextTick, ref, type Ref } from "vue";
import { vibrate } from "./useHaptics";

/**
 * Long-press to drag a list into a new order.
 *
 * The rows this is used on already own a tap and a horizontal swipe, and a plain
 * vertical drag would be indistinguishable from scrolling the page. Requiring a
 * long press settles the intent first: any movement before the timer fires
 * cancels it, so scrolling and swiping keep working untouched.
 */
export interface LongPressReorderOptions {
  /** The array to reorder in place. Return null while it isn't ready yet. */
  getItems: () => unknown[] | null | undefined;
  /** Element whose direct children are the draggable rows. */
  listEl: Ref<HTMLElement | null>;
  /** Called after a drag ends, so the caller can persist the new order. */
  onReordered?: () => void;
  longPressMs?: number;
}

const DRAG_CANCEL_PX = 8;

export const useLongPressReorder = (options: LongPressReorderOptions) => {
  const longPressMs = options.longPressMs ?? 400;

  const draggingIndex = ref<number | null>(null);
  const dragTranslateY = ref(0);

  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStartX = 0;
  let pressStartY = 0;
  let lastPointerY = 0;
  /** Pointer Y that corresponds to a translate of 0 for the dragged row. */
  let dragBaselineY = 0;
  /** Per-row height including the flex gap, measured when the drag starts. */
  let rowPitch: number[] = [];
  let suppressNextClick = false;

  const clearPressTimer = () => {
    if (pressTimer === null) return;
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  const measureRows = () => {
    const list = options.listEl.value;
    if (!list) {
      rowPitch = [];
      return;
    }
    const gap = parseFloat(getComputedStyle(list).rowGap || "0") || 0;
    rowPitch = Array.from(list.children).map((el) => (el as HTMLElement).offsetHeight + gap);
  };

  const beginDrag = (index: number) => {
    pressTimer = null;
    measureRows();
    draggingIndex.value = index;
    dragBaselineY = pressStartY;
    dragTranslateY.value = 0;
    vibrate(30);
  };

  const onRowPointerDown = (event: PointerEvent, index: number) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressNextClick = false;
    pressStartX = event.clientX;
    pressStartY = event.clientY;
    lastPointerY = event.clientY;
    clearPressTimer();
    pressTimer = setTimeout(() => beginDrag(index), longPressMs);
  };

  /** Moves the dragged row one slot and keeps the card under the finger. */
  const moveItem = (from: number, to: number, pitch: number) => {
    const items = options.getItems();
    if (!items) return;

    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);

    draggingIndex.value = to;
    // The row's natural position just shifted by one slot; compensate the
    // baseline or the card jumps a full row under the finger.
    dragBaselineY += to < from ? -pitch : pitch;
    dragTranslateY.value = lastPointerY - dragBaselineY;

    nextTick(measureRows);
  };

  /** Swaps with a neighbour once the drag passes half that neighbour's height. */
  const settleDragPosition = () => {
    const index = draggingIndex.value;
    const items = options.getItems();
    if (index === null || !items) return;

    if (dragTranslateY.value < 0 && index > 0) {
      const pitch = rowPitch[index - 1] ?? 0;
      if (pitch > 0 && -dragTranslateY.value > pitch / 2) moveItem(index, index - 1, pitch);
      return;
    }

    if (dragTranslateY.value > 0 && index < items.length - 1) {
      const pitch = rowPitch[index + 1] ?? 0;
      if (pitch > 0 && dragTranslateY.value > pitch / 2) moveItem(index, index + 1, pitch);
    }
  };

  const onWindowPointerMove = (event: PointerEvent) => {
    lastPointerY = event.clientY;

    if (draggingIndex.value === null) {
      // Still waiting on the long press — real movement means the user meant to
      // scroll or swipe, so give the gesture back.
      if (pressTimer !== null && Math.hypot(event.clientX - pressStartX, event.clientY - pressStartY) > DRAG_CANCEL_PX) {
        clearPressTimer();
      }
      return;
    }

    dragTranslateY.value = event.clientY - dragBaselineY;
    settleDragPosition();
  };

  const endDrag = () => {
    clearPressTimer();
    if (draggingIndex.value === null) return;

    draggingIndex.value = null;
    dragTranslateY.value = 0;
    // The pointerup that ends a drag still produces a click; swallow it so the
    // row's own tap handler doesn't fire on top of the reorder.
    suppressNextClick = true;
    options.onReordered?.();
    vibrate(15);
  };

  /**
   * touch-action can't be flipped mid-gesture, so scrolling is blocked here
   * instead. Safe because any movement before the long press fires cancels the
   * drag, meaning no scroll is ever in flight when this starts preventing.
   */
  const blockScrollWhileDragging = (event: TouchEvent) => {
    if (draggingIndex.value !== null) event.preventDefault();
  };

  /** True when the click that follows a drag should be ignored. */
  const consumeClickSuppression = (): boolean => {
    if (!suppressNextClick) return false;
    suppressNextClick = false;
    return true;
  };

  onMounted(() => {
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    document.addEventListener("touchmove", blockScrollWhileDragging, { passive: false });
  });

  onUnmounted(() => {
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    document.removeEventListener("touchmove", blockScrollWhileDragging);
    clearPressTimer();
  });

  return {
    draggingIndex,
    dragTranslateY,
    onRowPointerDown,
    consumeClickSuppression,
  };
};
