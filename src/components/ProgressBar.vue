<template>
  <div class="flex items-center gap-4">
    <div class="w-20 text-sm text-dark-300">{{ label }}</div>
    <div class="flex-1 bg-dark-700 rounded-full h-4 overflow-hidden">
      <div 
        class="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>
    <div class="w-16 text-right text-sm font-medium text-white">
      {{ value }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  percentage: number
}

defineProps<Props>()
</script> 