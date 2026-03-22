import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.tsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.tsx";
import StimulusValidationPageV2 from "./pages/StimulusValidationPageV2.tsx";
import { initTheme } from "./theme/v2";

const STARTUP_LOG = "[FORGE_STARTUP]";

console.log(`${STARTUP_LOG} main boot`);
const hasWindow = typeof window !== "undefined";
const hasNavigator = typeof navigator !== "undefined";

async function nukeOldServiceWorkers() {
  if (!hasNavigator || !("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();

  for (const reg of registrations) {
    try {
      console.log("[FORGE_SW] Unregistering:", reg.scope);
      await reg.unregister();
    } catch (err) {
      console.warn("[FORGE_SW] Failed to unregister:", err);
    }
  }
}

// Diagnostic experiment: clear any stale SW state before current startup flow runs.
await nukeOldServiceWorkers();

if (hasWindow) {
  try {
    const nextLoadCount = Number(window.sessionStorage.getItem("forge:startup_load_count") ?? "0") + 1;
    window.sessionStorage.setItem("forge:startup_load_count", String(nextLoadCount));
    console.log(`${STARTUP_LOG} load count`, nextLoadCount);
  } catch (error) {
    console.warn(`${STARTUP_LOG} sessionStorage unavailable`, error);
  }
}

if (hasNavigator && "serviceWorker" in navigator) {
  console.log(`${STARTUP_LOG} sw controller present`, !!navigator.serviceWorker.controller);
  if (navigator.serviceWorker.controller) {
    console.log(`${STARTUP_LOG} sw controller script`, navigator.serviceWorker.controller.scriptURL);
  }
}

// Dev-safety: unregister any old Service Workers (prevents Workbox caching issues)
if (import.meta.env.DEV && hasNavigator && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
  if (hasWindow && "caches" in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

function reportGlobalError(tag: string, payload: unknown) {
  console.error(`[FORGE][APP][${tag}]`, payload);
  if (!import.meta.env.DEV) return;

  const id = "forge-dev-error-banner";
  const old = document.getElementById(id);
  if (old) old.remove();

  const el = document.createElement("div");
  el.id = id;
  el.textContent = "App error - reload";
  Object.assign(el.style, {
    position: "fixed",
    top: "8px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
    background: "rgba(20,0,0,0.92)",
    color: "var(--text)",
    border: "1px solid rgba(var(--accentHot-rgb),0.55)",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "700",
    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
    pointerEvents: "none",
  });
  document.body.appendChild(el);
}

if (hasWindow) {
  window.addEventListener("error", (event) => {
    reportGlobalError("ERROR", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportGlobalError("UNHANDLED_REJECTION", { reason: event.reason });
  });
}

if (hasNavigator && "serviceWorker" in navigator) {
  // Remove legacy hand-written /sw.js registrations that may cache auth callback aggressively.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    console.log(`${STARTUP_LOG} existing sw registrations`, regs.map((reg) => ({
      scope: reg.scope,
      active: reg.active?.scriptURL ?? null,
      waiting: reg.waiting?.scriptURL ?? null,
      installing: reg.installing?.scriptURL ?? null,
    })));
    regs.forEach((reg) => {
      const script =
        reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? "";
      if (script.endsWith("/sw.js") && !script.includes("workbox")) {
        void reg.unregister();
        if (import.meta.env.DEV) {
          console.info("[FORGE][SW][DEV] unregistered legacy sw.js", { script });
        }
      }
    });
  });

  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.warn(`${STARTUP_LOG} onNeedRefresh fired - reload suppressed for diagnosis`);
    },
    onOfflineReady() {
      console.info(`${STARTUP_LOG} onOfflineReady fired`);
    },
    onRegisteredSW(swUrl, registration) {
      console.info(`${STARTUP_LOG} onRegisteredSW`, swUrl, {
        scope: registration?.scope ?? null,
        active: registration?.active?.scriptURL ?? null,
        waiting: registration?.waiting?.scriptURL ?? null,
        installing: registration?.installing?.scriptURL ?? null,
      });
      if (!registration) return;
      registration.addEventListener("updatefound", () => {
        console.info(`${STARTUP_LOG} service worker updatefound`);
      });
    },
    onRegisterError(error) {
      console.error(`${STARTUP_LOG} onRegisterError`, error);
    },
  });
}

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {hasWindow && window.location.pathname === "/auth/callback" ? (
      <AuthCallbackPage />
    ) : hasWindow && window.location.pathname === "/dev/stimulus-v2" ? (
      <StimulusValidationPageV2 />
    ) : (
      <App />
    )}
  </StrictMode>
);
