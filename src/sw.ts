// Service Worker Registration for Vite PWA Plugin
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Let Vite PWA plugin handle the registration
    // This file is just for additional update handling

    // Check for existing service worker registration
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        console.log("🔧 SW: Service worker registered:", registration);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker is installed and waiting
                console.log("🔧 SW: New service worker installed, waiting to activate");

                // Dispatch custom event to notify the app
                window.dispatchEvent(new CustomEvent("sw-update-available"));

                // Also dispatch Vite PWA events for compatibility
                window.dispatchEvent(new CustomEvent("vite-plugin-pwa:update-found"));
                window.dispatchEvent(new CustomEvent("vite-plugin-pwa:update-ready"));
              }
            });
          }
        });

        // Handle service worker updates
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            console.log("🔧 SW: Controller changed, reloading page");
            window.location.reload();
          }
        });

        // Handle skip waiting message
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "SKIP_WAITING") {
            console.log("🔧 SW: Received SKIP_WAITING message");
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          }
        });

        // Listen for skip waiting from the service worker itself
        if (registration.waiting) {
          registration.waiting.addEventListener("message", (event) => {
            if (event.data && event.data.type === "SKIP_WAITING") {
              console.log("🔧 SW: Service worker received SKIP_WAITING, activating...");
              registration.waiting?.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }

        // Check for updates periodically
        setInterval(() => {
          if (registration) {
            console.log("🔧 SW: Checking for updates...");
            registration.update();
          }
        }, 60000); // Check every minute
      }
    });
  });
}
