import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
  }
}

// Ensure all vue-router exports are available
declare module "vue-router/dist/vue-router" {
  export * from "vue-router";
}

// Explicitly declare the composition API functions
declare module "vue-router" {
  export function useRoute(): import("vue-router").RouteLocationNormalizedLoaded;
  export function useRouter(): import("vue-router").Router;
}

// Explicitly declare router creation functions
declare module "vue-router" {
  export function createRouter(options: any): any;
  export function createWebHistory(base?: string): any;
}
