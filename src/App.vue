<template>
  <div class="min-h-screen bg-dark-900">
    <header class="bg-dark-800 border-b border-dark-700">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">
              <span class="text-primary-500">NextRep</span>
            </h1>
            <p class="text-sm text-dark-300">Full kontroll over treningsøktene dine</p>
          </div>
          
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
            <router-link 
              to="/login" 
              class="text-dark-300 hover:text-white transition-colors"
              active-class="text-primary-500"
            >
              Login
            </router-link>
          </nav>
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8 pb-24 md:pb-8">
      <router-view />
    </main>

    <!-- Mobile Bottom Navigation -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50">
      <div class="flex justify-around">
        <router-link 
          to="/" 
          class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
          :class="{ 'text-primary-500': $route.path === '/' }"
        >
          <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
          </svg>
          <span class="text-xs">Hjem</span>
        </router-link>
        
        <router-link 
          to="/history" 
          class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
          :class="{ 'text-primary-500': $route.path === '/history' }"
        >
          <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs">Historikk</span>
        </router-link>
        
        <router-link 
          to="/stats" 
          class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
          :class="{ 'text-primary-500': $route.path === '/stats' }"
        >
          <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span class="text-xs">Statistikk</span>
        </router-link>
        
        <router-link 
          to="/login" 
          class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
          :class="{ 'text-primary-500': $route.path === '/login' }"
        >
          <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span class="text-xs">Login</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
// Main app component with navigation
</script> 