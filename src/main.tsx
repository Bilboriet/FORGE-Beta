import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.tsx";
import AuthCallbackPage from "./pages/AuthCallbackPage.tsx";
import StimulusValidationPageV2 from "./pages/StimulusValidationPageV2.tsx";
import { initTheme } from "./theme/v2";

console.log("FORGE MAIN LOADED");
const hasWindow = typeof window !== "undefined";
const hasNavigator = typeof navigator !== "undefined";

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
      console.warn("[FORGE][SW] New version available, reloading...");
      window.location.reload();
    },
    onOfflineReady() {
      console.info("[FORGE][SW] Offline ready");
    },
    onRegisteredSW(swUrl, registration) {
      console.info("[FORGE][SW] registered", swUrl);
      if (!registration) return;
      registration.addEventListener("updatefound", () => {
        console.info("[FORGE][SW] update found");
      });
    },
    onRegisterError(error) {
      console.error("[FORGE][SW] register error", error);
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
