/**
 * Service Worker Registration
 * Registers service worker for offline asset caching
 */

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Service worker registered
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

