<template>
  <teleport to="body">
    <div v-if="isVisible" class="fixed inset-0 z-50">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60" @click="onClose" />

      <!-- Modal -->
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-lg bg-dark-800 border border-dark-700 rounded-xl shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-dark-700">
            <h3 class="text-white font-semibold">{{ title }}</h3>
            <button type="button" class="text-dark-400 hover:text-white" @click="onClose" aria-label="Lukk">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-5 py-4 space-y-4">
            <slot />
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-5 py-4 border-t border-dark-700">
            <button type="button" class="text-sm text-dark-400 hover:text-white" @click="onClearAll">
              Nullstill
            </button>
            <div class="flex gap-2">
              <button type="button" class="btn-secondary" @click="onClose">Avbryt</button>
              <button type="button" class="btn-primary" @click="onApply">{{ applyTextComputed }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
  
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, type Ref } from 'vue'

const props = withDefaults(defineProps<{
  isVisible: boolean
  title?: string
  applyText?: string
}>(), {
  title: 'Filter',
  applyText: 'Bruk filtre'
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply'): void
  (e: 'clear-all'): void
}>()

const isOpen: Ref<boolean> = ref(false)
const applyTextComputed = computed(() => props.applyText || 'Bruk filtre')

const onClose = () => emit('close')
const onApply = () => emit('apply')
const onClearAll = () => emit('clear-all')

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isVisible) {
    onClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

</script>


