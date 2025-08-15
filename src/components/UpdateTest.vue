<template>
  <div v-if="isDevelopment" class="fixed top-4 right-4 z-50">
    <button 
      @click="triggerUpdate"
      class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      Test Oppdatering
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const isDevelopment = computed(() => {
  return import.meta.env.DEV
})

const triggerUpdate = () => {
  console.log('🧪 Triggering test update...')
  // Dispatch custom event to trigger update notification
  window.dispatchEvent(new CustomEvent('sw-update-available'))
  window.dispatchEvent(new CustomEvent('vite-plugin-pwa:update-found'))
  window.dispatchEvent(new CustomEvent('vite-plugin-pwa:update-ready'))
}
</script>
