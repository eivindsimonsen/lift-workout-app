<template>
  <nav class="flex items-center gap-2 text-sm text-dark-400 mb-4" aria-label="Breadcrumb">
    <div 
      v-for="(crumb, index) in breadcrumbs" 
      :key="index"
      class="flex items-center gap-2"
    >
      <!-- Breadcrumb item -->
      <router-link 
        v-if="crumb.path && index < breadcrumbs.length - 1"
        :to="crumb.path"
        class="hover:text-primary-400 transition-colors"
      >
        {{ crumb.name }}
      </router-link>
      <span v-else class="text-white">
        {{ crumb.name }}
      </span>
      
      <!-- Separator -->
      <svg 
        v-if="index < breadcrumbs.length - 1"
        class="w-4 h-4 text-dark-500" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </nav>
</template>

<script setup lang="ts">
interface Breadcrumb {
  name: string
  path?: string
}

defineProps<{
  breadcrumbs: Breadcrumb[]
}>()
</script>
