<template>
  <div 
    ref="cardRef"
    class="relative overflow-hidden"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
  >
    <!-- Main Card Content -->
    <div 
      class="transition-all duration-200 ease-out relative z-10"
      :style="{ 
        transform: `translateX(${translateX}px)`,
        borderRadius: showDeleteAction ? '8px 0px 0px 8px' : '8px'
      }"
    >
      <slot />
    </div>
    
    <!-- Delete Action Background (shown when swiping) -->
    <div 
      class="absolute right-0 top-0 bottom-0 flex items-center justify-end delete-action text-white transition-opacity duration-200 ease-out shadow-lg pr-6 rounded-r-lg"
      :class="{ 
        'opacity-100': showDeleteAction, 
        'opacity-0': !showDeleteAction 
      }"
      :style="{ 
        width: '100%',
        left: '0'
      }"
    >
      <!-- Delete Icon -->
      <svg class="w-6 h-6 text-white delete-icon" :class="{ 'scale-110': showDeleteAction }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </div>
    
    <!-- Swipe Hint (shown on first visit) -->
    <div 
      v-if="showSwipeHint && !hasInteracted"
      class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-white text-sm pointer-events-none rounded-lg"
    >
      <div class="text-center bg-dark-800/90 px-4 py-3 rounded-lg border border-dark-600">
        <div class="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-primary-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
        </div>
        <p class="font-medium">Sveip til venstre for å slette</p>
        <p class="text-xs text-dark-300 mt-1">Første gang du bruker denne funksjonen</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { vibrate } from '@/composables/useHaptics'
import { useSwipeToDelete } from '@/composables/useSwipeToDelete'

interface Props {
  threshold?: number // Distance to trigger delete
  showSwipeHint?: boolean
  /** Ignore swipes entirely — used while another gesture (e.g. drag-to-reorder) owns the pointer. */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 80,
  showSwipeHint: true,
  disabled: false
})

const emit = defineEmits<{
  delete: []
}>()

// Refs
const cardRef = ref<HTMLElement>()
const hasInteracted = ref(false)

/** The card is a single row, so it uses one fixed key in the shared swipe logic. */
const CARD = 'card'

// Shared with set and round rows: an interrupted gesture (screen lock, app switch)
// resets instead of leaving a half-swipe that the next tap would complete.
const swipe = useSwipeToDelete({
  threshold: props.threshold,
  canSwipe: () => !props.disabled,
  onDelete: () => {
    vibrate(50)
    emit('delete')
  },
})

const translateX = computed(() => swipe.offset[CARD] ?? 0)
const showDeleteAction = computed(() => swipe.revealed[CARD] ?? false)

// Touch handlers
const handleTouchStart = (event: TouchEvent) => {
  swipe.onTouchStart(event, CARD)

  // Hide hint after first interaction
  if (!props.disabled && !hasInteracted.value) {
    hasInteracted.value = true
    localStorage.setItem('swipe-hint-shown', 'true')
  }
}

const handleTouchMove = (event: TouchEvent) => {
  // Another gesture (e.g. drag-to-reorder) took over mid-swipe: let go, don't delete.
  if (props.disabled) {
    swipe.onTouchCancel()
    return
  }
  swipe.onTouchMove(event, CARD)
}

const handleTouchEnd = () => swipe.onTouchEnd(CARD)

const handleTouchCancel = () => swipe.onTouchCancel()

// Check if hint has been shown before
onMounted(() => {
  const hintShown = localStorage.getItem('swipe-hint-shown')
  if (hintShown) {
    hasInteracted.value = true
  }
})

</script>

<style scoped>
/* Prevent text selection during swipe */
.transition-transform {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Smooth transitions for delete action */
.delete-action-enter-active,
.delete-action-leave-active {
  transition: all 0.2s ease-out;
}

.delete-action-enter-from,
.delete-action-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Enhanced delete action styling */
.delete-action {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* Smooth icon animation */
.delete-icon {
  transition: all 0.2s ease-out;
}

.delete-icon:hover {
  transform: scale(1.1);
}
</style>


