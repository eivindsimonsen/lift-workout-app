<template>
  <div class="text-center py-12">
    <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
      <slot name="icon">
        <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </slot>
    </div>
    <p class="text-dark-300 mb-4">{{ message }}</p>
    <slot name="action">
      <router-link v-if="actionLink" :to="actionLink" class="btn-primary">
        {{ actionText }}
      </router-link>
    </slot>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string
  actionText?: string
  actionLink?: string
}

defineProps<Props>()
</script> 