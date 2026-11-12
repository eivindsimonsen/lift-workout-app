import { onBeforeUnmount, watch } from "vue";

/**
 * Locks the page behind an open sheet or panel, so a swipe inside it can't
 * scroll what's underneath.
 *
 * `body` is the app's scroll container (html and body are 100% high with
 * `overflow-x: hidden` in style.css), so `overflow: hidden` on it stops touch
 * scrolling — on iOS too — and keeps the scroll position. `overscroll-behavior`
 * on the panel isn't enough: a panel whose content fits has nothing to scroll,
 * and the swipe goes straight on to the body.
 *
 * Counted across every caller, so a panel that opens as another closes in the
 * same tick (the exercise sheet → the «!» panel) never leaves the page
 * unlocked, or locked for good.
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
export const useBodyScrollLock = (isOpen: () => boolean): void => {
  let held = false;
  const hold = (open: boolean) => {
    if (open === held) return;
    held = open;
    if (open) lock();
    else unlock();
  };

  watch(isOpen, hold, { immediate: true });
  onBeforeUnmount(() => hold(false));
};
