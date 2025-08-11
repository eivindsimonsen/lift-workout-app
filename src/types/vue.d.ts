declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Vue Router type augmentation
declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
  }
}

// Ensure vue-router exports are available
declare module "vue-router/dist/vue-router" {
  export * from "vue-router";
}
