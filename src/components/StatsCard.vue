<template>
  <div class="card">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-dark-300 text-sm">{{ label }}</p>
        <p class="text-2xl font-bold text-white">{{ value }}</p>
        <p v-if="subtitle" class="text-xs text-dark-400 mt-1">{{ subtitle }}</p>
      </div>
      <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
        <slot name="icon">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  subtitle?: string
}

defineProps<Props>()
</script> 