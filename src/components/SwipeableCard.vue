<template>
  <div 
    ref="cardRef"
    class="relative overflow-hidden"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
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
      <!-- Delete Icon with better styling -->
      <div class="flex flex-col items-center gap-2 transform transition-transform duration-200 delete-icon" :class="{ 'scale-110': showDeleteAction }">
        <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <span class="text-xs font-semibold text-white tracking-wide">SLETT</span>
      </div>
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
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  threshold?: number // Distance to trigger delete
  showSwipeHint?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 80,
  showSwipeHint: true
})

const emit = defineEmits<{
  delete: []
}>()

// Refs
const cardRef = ref<HTMLElement>()
const translateX = ref(0)
const showDeleteAction = ref(false)
const hasInteracted = ref(false)

// Touch state
let startX = 0
let currentX = 0
let isDragging = false

// Haptic feedback
const triggerHapticFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(50) // Short vibration
  }
}

// Touch handlers
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length !== 1) return
  
  startX = event.touches[0].clientX
  currentX = startX
  isDragging = true
  
  // Hide hint after first interaction
  if (!hasInteracted.value) {
    hasInteracted.value = true
    localStorage.setItem('swipe-hint-shown', 'true')
  }
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isDragging) return
  
  currentX = event.touches[0].clientX
  const deltaX = currentX - startX
  
  // Only allow left swipe (negative deltaX)
  if (deltaX < 0) {
    translateX.value = Math.max(deltaX, -props.threshold * 1.5)
    // Show delete action earlier for better visual feedback
    showDeleteAction.value = Math.abs(deltaX) > props.threshold / 3
  }
}

const handleTouchEnd = () => {
  if (!isDragging) return
  
  isDragging = false
  
  if (Math.abs(translateX.value) > props.threshold) {
    // Trigger delete
    triggerHapticFeedback()
    emit('delete')
  }
  
  // Reset position
  translateX.value = 0
  showDeleteAction.value = false
}

// Check if hint has been shown before
onMounted(() => {
  const hintShown = localStorage.getItem('swipe-hint-shown')
  if (hintShown) {
    hasInteracted.value = true
  }
})

// Cleanup
onUnmounted(() => {
  translateX.value = 0
  showDeleteAction.value = false
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


