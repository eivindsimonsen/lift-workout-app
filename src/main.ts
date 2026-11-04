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

  const workoutData = useHybridData();
  try {
    // Fire-and-forget: data and the exercise library keep loading after mount;
    // pages show placeholders until their data is there.
    void workoutData.initializeAuth();
  } catch (err) {
    console.error("[bootstrap] initializeAuth failed:", err);
  }

  await router.isReady();
  // Mount once the session is known, so a protected page is never drawn signed out first.
  await workoutData.whenAuthResolved();
  app.mount("#app");
}

bootstrap();
