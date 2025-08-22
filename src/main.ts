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

  try {
    const workoutData = useHybridData();
    await workoutData.initializeAuth();
  } catch (err) {
    console.error("[bootstrap] initializeAuth failed:", err);
  }

  await router.isReady();
  app.mount("#app");
}

bootstrap();
