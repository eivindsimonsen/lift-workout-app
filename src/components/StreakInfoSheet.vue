<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from "vue";
  import { useSheetDrag } from "@/composables/useSheetDrag";
  import { useBodyScrollLock } from "@/composables/useBodyScrollLock";

  /**
   * Bottom sheet behind the (i) on the home page's streak: the streak and the
   * record, the rules for keeping it, and the way to the weekly goals.
   */
  const props = defineProps<{
    open: boolean;
    /** Weeks in a row with every weekly goal met. */
    current: number;
    /** The longest streak so far. */
    best: number;
  }>();

  const emit = defineEmits<{
    (e: "close"): void;
    (e: "edit-goals"): void;
  }>();

  const weeksUnit = (n: number): string => (n === 1 ? "uke" : "uker");

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
    <Transition name="streak-sheet">
      <div v-if="open" class="streak-sheet" role="dialog" aria-modal="true" aria-label="Ukestreak">
        <div class="streak-sheet__backdrop" :style="backdropStyle" @click="emit('close')"></div>

        <div ref="panelEl" class="streak-sheet__panel" :style="panelStyle">
          <!-- The top (handle and title) pulls the sheet down; the click that ends a pull is stopped here -->
          <div class="streak-sheet__grab" @pointerdown="onGrabPointerDown" @click.capture="onGrabClickCapture">
            <!-- The visible bar is 4px; the whole width of the top closes the sheet -->
            <div class="streak-sheet__handle" role="button" tabindex="0" aria-label="Lukk" @click="emit('close')" @keydown.enter="emit('close')"></div>
            <h2 class="streak-sheet__title">Ukestreak</h2>
          </div>

          <dl class="streak-sheet__facts">
            <div>
              <dt class="streak-sheet__fact-label">På rad nå</dt>
              <dd class="streak-sheet__fact-value">
                {{ current }}<span class="streak-sheet__unit">{{ weeksUnit(current) }}</span>
              </dd>
            </div>
            <div>
              <dt class="streak-sheet__fact-label">Rekord</dt>
              <!-- No record yet reads as a dash, never "0 uker" -->
              <dd class="streak-sheet__fact-value">
                <template v-if="best > 0">{{ best }}<span class="streak-sheet__unit">{{ weeksUnit(best) }}</span></template>
                <template v-else>–</template>
              </dd>
            </div>
          </dl>

          <ul class="streak-sheet__rules">
            <li><span>Nå <strong>alle ukesmålene innen søndag</strong>, så øker streaken med én.</span></li>
            <li><span>Hvert mål teller for seg. Er du langt over på ett, veier det ikke opp for et annet.</span></li>
            <li><span>Mangler ett mål når uka er over, starter streaken på nytt.</span></li>
          </ul>

          <button type="button" class="streak-sheet__edit" @click="emit('edit-goals')">Endre ukesmål</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .streak-sheet {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .streak-sheet__backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.65);
  }

  /* Full width on a phone; a readable column on a wide screen */
  .streak-sheet__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 40rem;
    max-height: calc(100dvh * 3 / 4);
    margin: 0 auto;
    padding: 0 1.125rem calc(1.25rem + env(safe-area-inset-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
    background: #1a2233;
    border-top: 1px solid #2d3a4f;
    border-radius: 1.25rem 1.25rem 0 0;
  }

  /* The top pulls the sheet down: the browser mustn't claim the gesture for scrolling */
  .streak-sheet__grab {
    touch-action: none;
  }

  .streak-sheet__handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.5rem;
    cursor: pointer;
  }

  .streak-sheet__handle::before {
    content: "";
    width: 2.25rem;
    height: 0.25rem;
    border-radius: 999px;
    background: #3d5068;
  }

  .streak-sheet__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }

  .streak-sheet__facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.875rem 1rem;
    margin: 1rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid #2d3a4f;
  }

  .streak-sheet__fact-label {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .streak-sheet__fact-value {
    margin: 0.125rem 0 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }

  .streak-sheet__unit {
    margin-left: 0.1875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .streak-sheet__rules {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 1rem 0 0;
    padding: 1rem 0 0;
    list-style: none;
    border-top: 1px solid #2d3a4f;
  }

  .streak-sheet__rules li {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: #94a3b8;
  }

  .streak-sheet__rules li::before {
    content: "";
    width: 0.25rem;
    height: 0.25rem;
    margin-top: 0.5rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: #475569;
  }

  .streak-sheet__rules strong {
    font-weight: 600;
    color: #e2e8f0;
  }

  /* Secondary action in the sheet's field colours */
  .streak-sheet__edit {
    width: 100%;
    margin-top: 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #e2e8f0;
    background: #243044;
    border: 1px solid #3d5068;
    border-radius: 0.625rem;
    transition: background 0.15s;
  }

  .streak-sheet__edit:active {
    background: #3d5068;
  }

  /* style.css removes the focus outline on buttons; keyboard users still need one */
  .streak-sheet__edit:focus-visible {
    outline: 2px solid #f97316;
    outline-offset: 2px;
  }

  /* Open and close: the backdrop fades, the panel slides — timing as the template sheet */
  .streak-sheet-enter-active {
    transition: opacity 0.25s ease;
  }

  .streak-sheet-leave-active {
    transition: opacity 0.2s ease;
  }

  .streak-sheet-enter-from,
  .streak-sheet-leave-to {
    opacity: 0;
  }

  .streak-sheet-enter-active .streak-sheet__panel {
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .streak-sheet-leave-active .streak-sheet__panel {
    transition: transform 0.22s cubic-bezier(0.4, 0, 1, 1);
  }

  .streak-sheet-enter-from .streak-sheet__panel,
  .streak-sheet-leave-to .streak-sheet__panel {
    transform: translateY(100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .streak-sheet-enter-active,
    .streak-sheet-leave-active,
    .streak-sheet-enter-active .streak-sheet__panel,
    .streak-sheet-leave-active .streak-sheet__panel,
    .streak-sheet__edit {
      transition: none;
    }
  }
</style>
