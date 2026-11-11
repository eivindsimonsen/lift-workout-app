import { nextTick, onMounted, onUnmounted, ref, type Ref } from "vue";
import { vibrate } from "./useHaptics";

/**
 * Long-press to drag the items of a grid into a new order (the template tiles
 * on the home page).
 *
 * A sibling of useLongPressReorder rather than a mode of it: that one swaps with
 * the row above or below, which can't express a move between columns, and it
 * backs the template form and the active session, which shouldn't change with
 * this. The gesture rules are the same: a long press settles the intent, and
 * any movement before it gives the gesture back to scrolling.
 *
 * The target is the slot under the finger, found from the items' layout boxes as
 * they were when the drag started. The dragged item is inserted there and the
 * ones in between shift one step, like icons on a home screen.
 */
export interface GridReorderOptions {
  /** The array to reorder in place. Return null while it isn't ready yet. */
  getItems: () => unknown[] | null | undefined;
  /**
   * Element whose direct children are the items, one per array entry. Must be
   * `position: relative` without a border, so the items' offsetLeft/offsetTop
   * are measured from its corner.
   */
  gridEl: Ref<HTMLElement | null>;
  /** Called after a drag ends, so the caller can persist the new order. */
  onReordered?: () => void;
  longPressMs?: number;
}

export type Box = { left: number; top: number; width: number; height: number };

const DRAG_CANCEL_PX = 8;

/** Index of the box containing (x, y), skipping `skip`; null over a gap, outside, or over itself. */
export const hitTestIndex = (x: number, y: number, boxes: Box[], skip: number): number | null => {
  for (let i = 0; i < boxes.length; i++) {
    if (i === skip) continue;
    const box = boxes[i];
    if (x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height) return i;
  }
  return null;
};

/**
 * Picks the slot under the finger from boxes measured once, when the drag
 * starts. Grid items stretch to their row, so every move changes the row
 * heights; measuring again after a move can put the finger over the slot it
 * just left, and the item would flip between the two. With the boxes fixed,
 * the target depends only on where the finger is.
 */
export const createDragTargeter =
  (slots: Box[]) =>
  (x: number, y: number, current: number): number | null =>
    hitTestIndex(x, y, slots, current);

/** Insert move: the item at `from` ends up at `to`, the ones between shift one step. In place. */
export const moveItem = <T>(items: T[], from: number, to: number): void => {
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
};

export const useGridReorder = (options: GridReorderOptions) => {
  const longPressMs = options.longPressMs ?? 400;

  const draggingIndex = ref<number | null>(null);
  /** Translate of the dragged item from its place in the layout. */
  const dragX = ref(0);
  const dragY = ref(0);

  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStartX = 0;
  let pressStartY = 0;
  let pointerX = 0;
  let pointerY = 0;
  /** Where the finger holds the item, from the item's top-left corner. */
  let grabX = 0;
  let grabY = 0;
  /** True between a move and the re-render that puts the items in their new places. */
  let layoutPending = false;
  /** Slot boxes as they were when the drag started (see createDragTargeter). */
  let targetAt: ReturnType<typeof createDragTargeter> | null = null;
  let suppressNextClick = false;

  const clearPressTimer = () => {
    if (pressTimer === null) return;
    clearTimeout(pressTimer);
    pressTimer = null;
  };

  const itemEl = (index: number): HTMLElement | null => (options.gridEl.value?.children[index] as HTMLElement | undefined) ?? null;

  /** Each item's place in the layout. offsetLeft/Top ignore transforms, so the dragged one counts where it sits, not where it's shown. */
  const measureSlots = (grid: HTMLElement): Box[] =>
    Array.from(grid.children).map((child) => {
      const el = child as HTMLElement;
      return { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    });

  /** Keeps the dragged item under the finger. */
  const followPointer = () => {
    const grid = options.gridEl.value;
    const index = draggingIndex.value;
    // Before the re-render, the element at the new index is still another item
    const el = index === null || layoutPending ? null : itemEl(index);
    if (!grid || !el) return;
    const rect = grid.getBoundingClientRect();
    dragX.value = pointerX - rect.left - grabX - el.offsetLeft;
    dragY.value = pointerY - rect.top - grabY - el.offsetTop;
  };

  /** Moves the dragged item into the slot under the finger, if that's another item's. */
  const settle = () => {
    const grid = options.gridEl.value;
    const index = draggingIndex.value;
    const items = options.getItems();
    if (layoutPending || !grid || index === null || !items || !targetAt) return;

    const rect = grid.getBoundingClientRect();
    const target = targetAt(pointerX - rect.left, pointerY - rect.top, index);
    if (target === null || target >= items.length) return;

    moveItem(items, index, target);
    draggingIndex.value = target;
    // Re-anchor the item under the finger once Vue has put it in its new place.
    layoutPending = true;
    nextTick(() => {
      layoutPending = false;
      followPointer();
    });
  };

  const beginDrag = (index: number) => {
    pressTimer = null;
    const grid = options.gridEl.value;
    const el = itemEl(index);
    if (!grid || !el) return;
    const rect = grid.getBoundingClientRect();
    grabX = pressStartX - rect.left - el.offsetLeft;
    grabY = pressStartY - rect.top - el.offsetTop;
    targetAt = createDragTargeter(measureSlots(grid));
    draggingIndex.value = index;
    followPointer();
    vibrate(30);
  };

  const onItemPointerDown = (event: PointerEvent, index: number) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressNextClick = false;
    pressStartX = pointerX = event.clientX;
    pressStartY = pointerY = event.clientY;
    clearPressTimer();
    pressTimer = setTimeout(() => beginDrag(index), longPressMs);
  };

  const onWindowPointerMove = (event: PointerEvent) => {
    pointerX = event.clientX;
    pointerY = event.clientY;

    if (draggingIndex.value === null) {
      // Still waiting on the long press: real movement means the user meant to
      // scroll, so give the gesture back.
      if (pressTimer !== null && Math.hypot(pointerX - pressStartX, pointerY - pressStartY) > DRAG_CANCEL_PX) {
        clearPressTimer();
      }
      return;
    }

    followPointer();
    settle();
  };

  const endDrag = () => {
    clearPressTimer();
    if (draggingIndex.value === null) return;

    draggingIndex.value = null;
    dragX.value = 0;
    dragY.value = 0;
    layoutPending = false;
    targetAt = null;
    // The pointerup that ends a drag still produces a click; swallow it so the
    // item's own tap handler doesn't fire on top of the reorder.
    suppressNextClick = true;
    options.onReordered?.();
    vibrate(15);
  };

  /** Scrolling is blocked here, not with touch-action, which can't change mid-gesture. */
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
    dragX,
    dragY,
    onItemPointerDown,
    consumeClickSuppression,
  };
};
