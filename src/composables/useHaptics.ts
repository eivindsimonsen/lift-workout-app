/**
 * Haptic feedback that stays quiet when the browser won't allow it.
 *
 * Chrome refuses `navigator.vibrate` until the frame has seen a user gesture and
 * logs an intervention warning every time it blocks a call. Checking for sticky
 * user activation first keeps the console clean, and the try/catch covers
 * browsers that expose the API but reject the call anyway.
 *
 * Haptics are decoration — a failure here must never interrupt a flow.
 */
type UserActivation = { hasBeenActive: boolean };

export const vibrate = (pattern: number | number[]): void => {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  const activation = (navigator as Navigator & { userActivation?: UserActivation }).userActivation;
  if (activation && !activation.hasBeenActive) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignored on purpose: never let feedback break the thing it accompanies.
  }
};
