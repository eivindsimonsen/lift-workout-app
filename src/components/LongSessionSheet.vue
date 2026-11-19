<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref, watch } from "vue";
  import { useSheetDrag } from "@/composables/useSheetDrag";
  import { useBodyScrollLock } from "@/composables/useBodyScrollLock";
  import { formatTotalTime } from "@/composables/useCardioActivities";
  import { finalDurationMinutes, minutesFromFields, startedLabel, suggestedMinutes } from "@/composables/longSession";

  /**
   * Shown instead of the «are you sure» box when a session is completed more
   * than three hours after it started — usually one left running. The fields
   * start at the template's usual duration: «Lagre» saves what they say, «Ja, …
   * stemmer» keeps the time since the start. Closing it does nothing.
   */
  const props = defineProps<{
    open: boolean;
    templateName: string;
    /** The session's start (`session.date`: typed as a Date, but an ISO string once read from the cache). */
    startedAt: Date | string;
    elapsedMinutes: number;
    /** The template's usual duration; null when there's no history to go on. */
    averageMinutes: number | null;
    /** Cardio time already banked, which is kept whatever is entered. */
    loggedSeconds: number;
    /** What incomplete sets the save removes, as the confirm box says it; null when none. */
    removalNote: string | null;
  }>();

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "keep"): void;
    (e: "save", minutes: number): void;
  }>();

  const hoursText = ref("");
  const minutesText = ref("");
  // The sheet stays mounted with the session, so «i dag / i går» is worked out from when it opens
  const openedAt = ref(Date.now());

  // Filled from the suggestion every time it opens, not left at what was typed last time
  watch(
    () => props.open,
    (open) => {
      if (!open) return;
      openedAt.value = Date.now();
      const start = suggestedMinutes(props.averageMinutes, props.loggedSeconds);
      hoursText.value = String(Math.floor(start / 60));
      minutesText.value = String(start % 60);
    },
    { immediate: true },
  );

  const enteredMinutes = computed(() => minutesFromFields(hoursText.value, minutesText.value));
  const elapsedText = computed(() => formatTotalTime(props.elapsedMinutes * 60));
  const meta = computed(() => `${props.templateName} · startet ${startedLabel(new Date(props.startedAt), new Date(openedAt.value))}`);
  const hint = computed(() =>
    props.averageMinutes === null ? "" : `Snittet ditt for ${props.templateName} er ${formatTotalTime(props.averageMinutes * 60)}.`,
  );
  // What will actually be saved: never less than the logged time (the wall clock doesn't apply with an entered value)
  const savedMinutes = computed(() => finalDurationMinutes(0, props.loggedSeconds, enteredMinutes.value));
  const saveLabel = computed(() => (enteredMinutes.value > 0 ? `Lagre ${formatTotalTime(savedMinutes.value * 60)}` : "Lagre"));

  /** Digits only, minutes at most 59 — written back to the field, so what you see is what's saved. */
  const onFieldInput = (event: Event, field: "hours" | "minutes") => {
    const input = event.target as HTMLInputElement;
    let clean = input.value.replace(/\D/g, "");
    if (field === "minutes" && Number(clean) > 59) clean = "59";
    input.value = clean;
    if (field === "hours") hoursText.value = clean;
    else minutesText.value = clean;
  };

  // Pull down by the handle or the header to close
  const panelEl = ref<HTMLElement | null>(null);
  const { panelStyle, backdropStyle, onGrabPointerDown, onGrabClickCapture } = useSheetDrag({
    panelEl,
    isOpen: () => props.open,
    onClose: () => emit("close"),
  });

  // Nothing behind the sheet scrolls while it's open
  useBodyScrollLock(() => props.open, panelEl);

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && props.open) emit("close");
  };

  onMounted(() => window.addEventListener("keydown", onKeydown));
  onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="long-sheet">
      <div v-if="open" class="long-sheet" role="dialog" aria-modal="true" aria-labelledby="long-sheet-title">
        <div class="long-sheet__backdrop" :style="backdropStyle" @click="emit('close')"></div>

        <div ref="panelEl" class="long-sheet__panel" :style="panelStyle">
          <!-- The top (handle and header) pulls the sheet down; the click that ends a pull is stopped here -->
          <div class="long-sheet__grab" @pointerdown="onGrabPointerDown" @click.capture="onGrabClickCapture">
            <div class="long-sheet__handle" role="button" tabindex="0" aria-label="Lukk" @click="emit('close')" @keydown.enter="emit('close')"></div>
            <h2 id="long-sheet-title" class="long-sheet__title">Økta har vart i {{ elapsedText }}</h2>
            <p class="long-sheet__meta">{{ meta }}</p>
          </div>

          <p class="long-sheet__lead">Oi, det var en usedvanlig lang økt! Stemmer det, eller glemte du å avslutte den?</p>

          <fieldset class="long-sheet__duration">
            <legend class="long-sheet__label">Hvor lenge trente du?</legend>
            <div class="long-sheet__fields">
              <label class="long-sheet__field">
                <input
                  :value="hoursText"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="2"
                  class="long-sheet__input"
                  aria-label="Timer"
                  @input="(event) => onFieldInput(event, 'hours')" />
                <span class="long-sheet__unit">t</span>
              </label>
              <label class="long-sheet__field">
                <input
                  :value="minutesText"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="2"
                  class="long-sheet__input"
                  aria-label="Minutter"
                  @input="(event) => onFieldInput(event, 'minutes')" />
                <span class="long-sheet__unit">min</span>
              </label>
            </div>
            <p v-if="hint" class="long-sheet__help">{{ hint }}</p>
            <p v-if="removalNote" class="long-sheet__help">{{ removalNote }}</p>
          </fieldset>

          <button type="button" class="btn-primary long-sheet__save" :disabled="enteredMinutes === 0" @click="emit('save', enteredMinutes)">
            {{ saveLabel }}
          </button>
          <button type="button" class="long-sheet__keep" @click="emit('keep')">Ja, {{ elapsedText }} stemmer</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .long-sheet {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .long-sheet__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
  }

  /* Full width on a phone; a readable column on a wide screen */
  .long-sheet__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 40rem;
    max-height: calc(100dvh * 3 / 4);
    margin: 0 auto;
    padding: 0 1.125rem calc(1rem + env(safe-area-inset-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
    background: #1a2233;
    border-top: 1px solid #2d3a4f;
    border-radius: 1.25rem 1.25rem 0 0;
  }

  /* The top pulls the sheet down: the browser mustn't claim the gesture for scrolling */
  .long-sheet__grab {
    touch-action: none;
  }

  .long-sheet__handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.5rem;
    cursor: pointer;
  }

  .long-sheet__handle::before {
    content: "";
    width: 2.25rem;
    height: 0.25rem;
    border-radius: 999px;
    background: #3d5068;
  }

  .long-sheet__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.3;
    color: #fff;
  }

  .long-sheet__meta {
    margin: 0.1875rem 0 0;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  .long-sheet__lead {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: #cbd5e1;
  }

  .long-sheet__duration {
    margin: 1rem 0 0;
    padding: 1rem 0 0;
    border: 0;
    border-top: 1px solid #2d3a4f;
    min-width: 0;
  }

  .long-sheet__label {
    float: left;
    width: 100%;
    margin-bottom: 0.5rem;
    padding: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #cbd5e1;
  }

  .long-sheet__fields {
    clear: both;
    display: flex;
    gap: 0.5rem;
  }

  /* One field in the sheet's field colours, with its unit inside it */
  .long-sheet__field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 3rem;
    padding: 0 0.875rem;
    background: #243044;
    border: 1px solid #3d5068;
    border-radius: 0.625rem;
    cursor: text;
    transition:
      border-color 0.15s,
      background 0.15s;
  }

  .long-sheet__field:focus-within {
    border-color: #f97316;
    background: #2d3a4f;
    box-shadow: 0 0 0 3px #f9731620;
  }

  .long-sheet__input {
    flex: 1;
    width: 100%;
    min-width: 0;
    height: 100%;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }

  .long-sheet__unit {
    flex-shrink: 0;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .long-sheet__help {
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .long-sheet__save {
    width: 100%;
    justify-content: center;
    margin-top: 1.25rem;
  }

  .long-sheet__keep {
    width: 100%;
    height: 2.75rem;
    margin-top: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #94a3b8;
    border-radius: 0.625rem;
  }

  .long-sheet__keep:active {
    color: #e2e8f0;
  }

  /* Open and close: the backdrop fades, the panel slides — timing as the other sheets */
  .long-sheet-enter-active {
    transition: opacity 0.25s ease;
  }

  .long-sheet-leave-active {
    transition: opacity 0.2s ease;
  }

  .long-sheet-enter-from,
  .long-sheet-leave-to {
    opacity: 0;
  }

  .long-sheet-enter-active .long-sheet__panel {
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .long-sheet-leave-active .long-sheet__panel {
    transition: transform 0.22s cubic-bezier(0.4, 0, 1, 1);
  }

  .long-sheet-enter-from .long-sheet__panel,
  .long-sheet-leave-to .long-sheet__panel {
    transform: translateY(100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .long-sheet-enter-active,
    .long-sheet-leave-active,
    .long-sheet-enter-active .long-sheet__panel,
    .long-sheet-leave-active .long-sheet__panel,
    .long-sheet__field {
      transition: none;
    }
  }
</style>
