<template>
  <div class="min-h-screen bg-dark-900">
    <header class="bg-dark-800 border-b border-dark-700">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-white">
            <span class="text-primary-500">NextRep</span>
            <span class="text-dark-300 text-lg font-normal"> by Eivind</span>
          </h1>
          
          <!-- Desktop Navigation -->
          <nav class="hidden md:flex space-x-6">
            <router-link 
              to="/" 
              class="text-dark-300 hover:text-white transition-colors"
              active-class="text-primary-500"
            >
              Dashboard
            </router-link>
            <router-link 
              to="/history" 
              class="text-dark-300 hover:text-white transition-colors"
              active-class="text-primary-500"
            >
              Historikk
            </router-link>
            <router-link 
              to="/stats" 
              class="text-dark-300 hover:text-white transition-colors"
              active-class="text-primary-500"
            >
              Statistikk
            </router-link>
          </nav>

          <!-- Mobile Hamburger Menu -->
          <div class="md:hidden">
            <button 
              @click="toggleMobileMenu"
              class="text-white hover:text-primary-500 transition-colors p-2"
              aria-label="Toggle menu"
            >
              <svg 
                class="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  v-if="!isMobileMenuOpen"
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2" 
                  d="M4 6h16M4 12h16M4 18h16"
                />
                <path 
                  v-else
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2" 
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Menu Dropdown -->
        <div 
          v-show="isMobileMenuOpen"
          class="md:hidden mt-4 pb-4 border-t border-dark-700"
        >
          <nav class="flex flex-col space-y-3 pt-4">
            <router-link 
              to="/" 
              @click="closeMobileMenu"
              class="text-dark-300 hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-dark-700"
              active-class="text-primary-500 bg-dark-700"
            >
              <div class="flex items-center space-x-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                </svg>
                <span>Dashboard</span>
              </div>
            </router-link>
            <router-link 
              to="/history" 
              @click="closeMobileMenu"
              class="text-dark-300 hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-dark-700"
              active-class="text-primary-500 bg-dark-700"
            >
              <div class="flex items-center space-x-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Historikk</span>
              </div>
            </router-link>
            <router-link 
              to="/stats" 
              @click="closeMobileMenu"
              class="text-dark-300 hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-dark-700"
              active-class="text-primary-500 bg-dark-700"
            >
              <div class="flex items-center space-x-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Statistikk</span>
              </div>
            </router-link>
          </nav>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isMobileMenuOpen = ref(false)

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}
</script> 