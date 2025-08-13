<template>
  <div 
    v-if="showStatus"
    class="fixed top-4 right-4 z-50 transition-all duration-300"
    :class="{ 'translate-x-0': showStatus, 'translate-x-full': !showStatus }"
  >
    <!-- Online Status -->
    <div 
      v-if="isOnline"
      class="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span class="text-sm font-medium">Online</span>
    </div>
    
    <!-- Offline Status -->
    <div 
      v-else
      class="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span class="text-sm font-medium">Offline</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOnline = ref(navigator.onLine)
const showStatus = ref(false)

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
  
  // Show status briefly when it changes
  showStatus.value = true
  setTimeout(() => {
    showStatus.value = false
  }, 3000)
}

onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  
  // Show initial status briefly
  if (!navigator.onLine) {
    showStatus.value = true
    setTimeout(() => {
      showStatus.value = false
    }, 3000)
  }
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>
