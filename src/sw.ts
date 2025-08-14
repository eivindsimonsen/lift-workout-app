// Service Worker Registration for Vite PWA Plugin
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Let Vite PWA plugin handle the registration
    // This file is just for additional update handling

    // Check for existing service worker registration
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        console.log("SW registered: ", registration);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker is installed and waiting
                console.log("New service worker installed, waiting to activate");

                // Dispatch custom event to notify the app
                window.dispatchEvent(new CustomEvent("sw-update-available"));
              }
            });
          }
        });

        // Handle service worker updates
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        // Handle skip waiting message
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data && event.data.type === "SKIP_WAITING") {
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          }
        });
      }
    });
  });
}
