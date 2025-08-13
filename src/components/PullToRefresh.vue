<template>
  <div 
    ref="pullContainer"
    class="pull-to-refresh-container"
    :class="{ 'pulling': isPulling, 'refreshing': isRefreshing }"
  >
    <!-- Pull to refresh indicator -->
    <div 
      v-if="isPulling || isRefreshing"
      class="pull-indicator"
      :style="{ transform: `translateY(${pullDistance}px)` }"
    >
      <div class="indicator-content">
        <div v-if="!isRefreshing" class="flex items-center gap-2">
          <svg class="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span class="text-dark-300 text-sm">Dra ned for å oppdatere</span>
        </div>
        <div v-else class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
          <span class="text-primary-500 text-sm">Oppdaterer...</span>
        </div>
      </div>
    </div>

    <!-- Content wrapper -->
    <div 
      ref="contentWrapper"
      class="content-wrapper"
      :style="{ transform: `translateY(${isRefreshing ? 60 : Math.min(pullDistance, 60)}px)` }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  onRefresh?: () => Promise<void>
  threshold?: number
  maxPullDistance?: number
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 240, // Doubled from 120
  maxPullDistance: 320 // Doubled from 160
})

const emit = defineEmits<{
  refresh: []
}>()

// Refs
const pullContainer = ref<HTMLElement>()
const contentWrapper = ref<HTMLElement>()

// State
const isPulling = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const startY = ref(0)
const currentY = ref(0)

// Touch event handlers
const handleTouchStart = (e: TouchEvent) => {
  if (isRefreshing.value) return
  
  // Check scroll position immediately when touch starts
  const scrollTop = window.pageYOffset || 
                   document.documentElement.scrollTop || 
                   document.body.scrollTop || 0
  
  // Only allow pull-to-refresh if we're at the very top
  if (scrollTop > 5) {
    return // Don't even start tracking this touch
  }
  
  const touch = e.touches[0]
  startY.value = touch.clientY
  currentY.value = touch.clientY
}

const handleTouchMove = (e: TouchEvent) => {
  if (isRefreshing.value) return
  
  const touch = e.touches[0]
  currentY.value = touch.clientY
  
  // Get scroll position from multiple sources to be more reliable
  const scrollTop = window.pageYOffset || 
                   document.documentElement.scrollTop || 
                   document.body.scrollTop || 0
  
  // Only allow pull-to-refresh when EXACTLY at the top of the page
  // Add a small tolerance (5px) to account for rounding errors
  if (scrollTop <= 5 && currentY.value > startY.value) {
    e.preventDefault()
    
    const distance = Math.min(currentY.value - startY.value, props.maxPullDistance)
    pullDistance.value = distance
    
    // Only show pulling state after a small threshold to prevent accidental triggers
    if (distance > 20) {
      isPulling.value = true
    } else {
      isPulling.value = false
    }
  } else {
    // Reset if not at top
    isPulling.value = false
    pullDistance.value = 0
  }
}

const handleTouchEnd = async () => {
  if (isRefreshing.value || !isPulling.value) return
  
  if (pullDistance.value >= props.threshold) {
    // Trigger refresh
    isRefreshing.value = true
    isPulling.value = false
    
    try {
      if (props.onRefresh) {
        await props.onRefresh()
      } else {
        emit('refresh')
      }
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      // Reset state
      setTimeout(() => {
        isRefreshing.value = false
        pullDistance.value = 0
      }, 300)
    }
  } else {
    // Reset without refresh
    isPulling.value = false
    pullDistance.value = 0
  }
}

// Lifecycle
onMounted(() => {
  if (pullContainer.value) {
    pullContainer.value.addEventListener('touchstart', handleTouchStart, { passive: false })
    pullContainer.value.addEventListener('touchmove', handleTouchMove, { passive: false })
    pullContainer.value.addEventListener('touchend', handleTouchEnd, { passive: false })
  }
})

onUnmounted(() => {
  if (pullContainer.value) {
    pullContainer.value.removeEventListener('touchstart', handleTouchStart)
    pullContainer.value.removeEventListener('touchmove', handleTouchMove)
    pullContainer.value.removeEventListener('touchend', handleTouchEnd)
  }
})
</script>

<style scoped>
.pull-to-refresh-container {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
}

.pull-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 10;
  pointer-events: none;
}

.indicator-content {
  background: rgba(31, 41, 55, 0.9);
  backdrop-filter: blur(8px);
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid rgba(75, 85, 99, 0.3);
}

.content-wrapper {
  transition: transform 0.2s ease-out;
  min-height: 100vh;
}

.content-wrapper.refreshing {
  transition: transform 0.3s ease-out;
}

/* Smooth animation for pull distance */
.pulling .content-wrapper {
  transition: transform 0.1s ease-out;
}
</style>
