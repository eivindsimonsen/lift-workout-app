<template>
  <teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[100]">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60" @click="onClose" />

      <!-- Panel -->
      <div class="absolute inset-y-0 right-0 flex h-full">
        <section
          class="h-full w-[85vw] max-w-md bg-dark-800 border-l border-dark-700 shadow-2xl flex flex-col"
          :style="safeAreaStyle"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b border-dark-700 sticky top-0 z-40 bg-dark-800">
            <h3 class="text-white font-semibold text-base">{{ title }}</h3>
            <button type="button" class="text-dark-400 hover:text-white" @click="onClose" aria-label="Lukk">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-4 py-3 relative">
            <slot />
          </div>

          <!-- Footer (optional slot) -->
          <div v-if="$slots.footer" class="px-4 py-3 border-t border-dark-700">
            <slot name="footer" />
          </div>
        </section>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch, computed, type Ref, ref } from 'vue'

const props = withDefaults(defineProps<{
  isOpen: boolean
  title?: string
}>(), {
  title: 'Panel'
})

const emit = defineEmits<{ (e: 'close'): void }>()

const isClient: Ref<boolean> = ref(false)

const onClose = () => emit('close')

const lockBodyScroll = () => {
  if (!isClient.value) return
  const originalOverflow = document.body.style.overflow
  document.body.dataset.prevOverflow = originalOverflow
  document.body.style.overflow = 'hidden'
}

const unlockBodyScroll = () => {
  if (!isClient.value) return
  const prev = document.body.dataset.prevOverflow || ''
  document.body.style.overflow = prev
  delete document.body.dataset.prevOverflow
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) onClose()
}

onMounted(() => {
  isClient.value = true
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  unlockBodyScroll()
})

watch(() => props.isOpen, (open) => {
  if (open) lockBodyScroll()
  else unlockBodyScroll()
})

const safeAreaStyle = computed(() => ({
  paddingBottom: 'env(safe-area-inset-bottom)'
}))
</script>


