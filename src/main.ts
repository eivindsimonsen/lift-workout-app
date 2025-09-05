// src/main.ts
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import "./sw.ts";
import { useHybridData } from "@/composables/useHybridData";
import { initSupabase } from "@/composables/useSupabase";

async function bootstrap() {
  // Initialize Supabase once, picking persistence based on last choice
  const persistPref = localStorage.getItem("rememberMe") === "false" ? "session" : "local";
  initSupabase(persistPref);

  const app = createApp(App);
  app.use(router);

  // Mount first so the in-app loader is visible during initialization
  const workoutData = useHybridData();
  try {
    // Fire-and-forget auth init; App.vue shows loader until store signals ready
    void workoutData.initializeAuth();
  } catch (err) {
    console.error("[bootstrap] initializeAuth failed:", err);
  }

  await router.isReady();
  app.mount("#app");
}

bootstrap();
