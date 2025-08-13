<template>
  <div 
    ref="containerRef"
    class="relative"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull to refresh indicator -->
    <div 
      class="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 pointer-events-none"
      :class="{ 'opacity-100': showIndicator, 'opacity-0': !showIndicator }"
      :style="{ 
        transform: `translateY(${Math.min(pullDistance, 60)}px)`,
        height: '60px'
      }"
    >
      <div class="flex items-center gap-3 text-primary-500">
        <div 
          class="w-6 h-6 transition-transform duration-300"
          :class="{ 'rotate-180': isRefreshing }"
        >
          <svg v-if="!isRefreshing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <svg v-else class="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <span class="text-sm font-medium">
          {{ isRefreshing ? 'Oppdaterer...' : 'Dra ned for å oppdatere' }}
        </span>
      </div>
    </div>
    
    <!-- Main content -->
    <div 
      class="transition-transform duration-300 ease-out"
      :style="{ transform: `translateY(${Math.max(0, pullDistance)}px)` }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  threshold?: number // Distance to trigger refresh
  onRefresh?: () => Promise<void> | void
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 80,
  onRefresh: () => Promise.resolve()
})

const emit = defineEmits<{
  refresh: []
}>()

// Refs
const containerRef = ref<HTMLElement>()
const pullDistance = ref(0)
const showIndicator = ref(false)
const isRefreshing = ref(false)

// Touch state
let startY = 0
let currentY = 0
let isPulling = false

// Touch handlers
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length !== 1) return
  
  // Only allow pull-to-refresh when at the top of the scroll
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  if (scrollTop > 0) return
  
  startY = event.touches[0].clientY
  currentY = startY
  isPulling = true
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isPulling) return
  
  currentY = event.touches[0].clientY
  const deltaY = currentY - startY
  
  // Only allow downward pull
  if (deltaY > 0) {
    // Add resistance to the pull
    pullDistance.value = deltaY * 0.5
    showIndicator.value = true
    
    // Prevent default scrolling
    event.preventDefault()
  }
}

const handleTouchEnd = async () => {
  if (!isPulling) return
  
  isPulling = false
  
  if (pullDistance.value > props.threshold) {
    // Trigger refresh
    isRefreshing.value = true
    showIndicator.value = true
    
    try {
      await props.onRefresh()
      emit('refresh')
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      isRefreshing.value = false
    }
  }
  
  // Reset position
  pullDistance.value = 0
  showIndicator.value = false
}

// Cleanup
onUnmounted(() => {
  pullDistance.value = 0
  showIndicator.value = false
  isRefreshing.value = false
})
</script>

<style scoped>
/* Prevent text selection during pull */
.transition-transform {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
