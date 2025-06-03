import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { decryptData } from "../utils/crypto";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SessionPin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [dark, setDark] = useState(
    typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
  const navigate = useNavigate();

  // dark mode toggle
  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 6) {
      setError("Пин-код должен содержать минимум 6 цифр");
      return;
    }
    // Проверяем пин-код: пробуем расшифровать данные
    const sessionId = localStorage.getItem("goodvibe_session_id");
    const encrypted = sessionId
      ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
      : null;
    if (!encrypted) {
      setError("Нет данных сессии");
      return;
    }
    try {
      await decryptData(encrypted, pin);
      localStorage.setItem("goodvibe_pin", pin);
      navigate("/home");
    } catch {
      setError("Неверный пин-код");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <Card className="w-full max-w-full sm:max-w-md mx-auto px-2 sm:px-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Введите пин-код</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Тема</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pin">Пин-код (6+ цифр)</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                minLength={6}
                maxLength={12}
                required
                autoComplete="off"
                placeholder="Введите пин-код"
              />
            </div>
            {error && (
              <div className="text-destructive text-sm font-medium">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full text-base font-semibold">
              Войти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
