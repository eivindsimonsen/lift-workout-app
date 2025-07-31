import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Hide URL bar on iOS Safari
const hideUrlBar = () => {
  // Check if it's iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  
  if (isIOS && isSafari) {
    // Force scroll to hide URL bar
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.scrollTo(0, 1)
        setTimeout(() => {
          window.scrollTo(0, 0)
        }, 100)
      }, 100)
    })
    
    // Hide URL bar on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        window.scrollTo(0, 1)
        setTimeout(() => {
          window.scrollTo(0, 0)
        }, 100)
      }, 100)
    })
    
    // Prevent bounce scrolling
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.body.style.overflow = 'hidden'
  }
}

// Initialize URL bar hiding
hideUrlBar()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app') 