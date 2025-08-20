// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import "./sw.ts";
import { useHybridData } from "@/composables/useHybridData";

async function bootstrap() {
  const app = createApp(App);

  // Register router first so any composables that reference it are safe
  app.use(router);

  // Initialize auth BEFORE mount to avoid refresh→login→index bounce
  try {
    const workoutData = useHybridData();
    await workoutData.initializeAuth();
  } catch (err) {
    console.error("[bootstrap] initializeAuth failed:", err);
    // Continue; router guards still protect routes.
  }

  // Ensure initial route is resolved (prevents flicker)
  await router.isReady();

  app.mount("#app");
}

bootstrap();
