import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Toaster } from "@/components/ui/sonner";
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

registerSW({
  onNeedRefresh() {
    // Автоматически обновлять страницу при наличии новой версии
    window.location.reload();
  },
  onOfflineReady() {
    // Показываем уведомление через Toaster
    toast("Приложение готово к работе оффлайн!");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>
);
