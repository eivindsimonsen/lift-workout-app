import { onBeforeUnmount, watch, type Ref } from "vue";

/**
 * Locks the page behind an open sheet or panel, so a swipe inside it can't
 * scroll what's underneath.
 *
 * `body` is the app's scroll container (html and body are 100% high with
 * `overflow-x: hidden` in style.css), so `overflow: hidden` on it stops it
 * from scrolling and keeps the scroll position.
 *
 * That isn't enough on iOS. A swipe the panel can't use (on the backdrop, or in
 * a panel whose content fits and so has nothing to scroll) is handed past the
 * locked body to the page itself, which still moves. With `panel` given, such
 * swipes are cancelled before any scrolling starts. A panel that can scroll
 * keeps its own swipes; `overscroll-behavior: contain` on it stops those at its
 * ends.
 *
 * The body lock is counted across every caller, so a panel that opens as
 * another closes in the same tick (the exercise sheet → the «!» panel) never
 * leaves the page unlocked, or locked for good.
 */

let locks = 0;
let overflowBefore = "";

const lock = () => {
  if (locks === 0) {
    overflowBefore = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;
};

const unlock = () => {
  if (locks === 0) return;
  locks -= 1;
  if (locks === 0) document.body.style.overflow = overflowBefore;
};

/** Holds the lock while `isOpen()` is true, and lets go when the component unmounts. */
export const useBodyScrollLock = (isOpen: () => boolean, panel?: Ref<HTMLElement | null>): void => {
  let held = false;

  // A touch event's target is where the finger went down, for the whole gesture.
  const onTouchMove = (event: TouchEvent) => {
    const el = panel?.value;
    const startedInPanel = el && event.target instanceof Node && el.contains(event.target);
    if (startedInPanel && el.scrollHeight > el.clientHeight) return;
    if (event.cancelable) event.preventDefault();
  };

  const hold = (open: boolean) => {
    if (open === held) return;
    held = open;
    if (open) {
      lock();
      // Not passive: a passive listener can't cancel the scroll
      if (panel) document.addEventListener("touchmove", onTouchMove, { passive: false });
    } else {
      unlock();
      if (panel) document.removeEventListener("touchmove", onTouchMove);
    }
  };

  watch(isOpen, hold, { immediate: true });
  onBeforeUnmount(() => hold(false));
};
