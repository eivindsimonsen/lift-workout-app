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
      class="transition-transform duration-200 ease-out"
      :style="{ transform: `translateX(${translateX}px)` }"
    >
      <slot />
    </div>
    
    <!-- Delete Action (shown when swiping) -->
    <div 
      class="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 text-white px-6 transition-opacity duration-200"
      :class="{ 'opacity-100': showDeleteAction, 'opacity-0': !showDeleteAction }"
      :style="{ width: `${Math.abs(translateX)}px` }"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </div>
    
    <!-- Swipe Hint (shown on first visit) -->
    <div 
      v-if="showSwipeHint && !hasInteracted"
      class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm pointer-events-none"
    >
      <div class="text-center">
        <svg class="w-8 h-8 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
        </svg>
        <p>Sveip til venstre for å slette</p>
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
    showDeleteAction.value = Math.abs(deltaX) > props.threshold / 2
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
</style>
