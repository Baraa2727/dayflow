// public/register-sw.js — TripFlow SW-Registrierung
(function () {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      // Optional: bei Updates sofort aktivieren
      if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            newSW.postMessage("SKIP_WAITING");
          }
        });
      });
      console.log("[TripFlow] Service Worker registriert");
    } catch (err) {
      console.warn("[TripFlow] SW Registrierung fehlgeschlagen:", err);
    }
  });
})();
