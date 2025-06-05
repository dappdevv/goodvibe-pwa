import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/sonner";
import { registerSW } from "virtual:pwa-register";

registerSW({
  onNeedRefresh() {
    // Автоматически обновлять страницу при наличии новой версии
    window.location.reload();
  },
  onOfflineReady() {
    // Можно показать уведомление, что приложение доступно оффлайн
    // alert('Приложение готово к работе оффлайн!');
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>
);

// Регистрация service worker для PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
