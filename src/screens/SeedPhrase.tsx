import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateMnemonic, mnemonicToAccount, english } from "viem/accounts";
import { encryptData } from "../utils/crypto";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SeedPhrase() {
  const navigate = useNavigate();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [dark, setDark] = useState(
    typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  useEffect(() => {
    // Проверка наличия необходимых данных
    const pin = localStorage.getItem("goodvibe_pin");
    const name = localStorage.getItem("goodvibe_name");
    if (!pin || !name) {
      navigate("/");
      return;
    }
    // Генерируем seed-фразу только при первом рендере
    const m = generateMnemonic(english);
    setMnemonic(m.split(" "));
    // account генерируется только для отображения seed, не сохраняем ничего в localStorage
  }, []);

  const handleNext = async () => {
    if (step < mnemonic.length - 1) {
      setStep(step + 1);
    } else {
      // Сохраняем данные пользователя и сессию только при завершении показа seed
      const name = localStorage.getItem("goodvibe_name") || "";
      const lang = localStorage.getItem("goodvibe_lang") || "ru";
      const pin = localStorage.getItem("goodvibe_pin") || "";
      const m = mnemonic.join(" ");
      const account = mnemonicToAccount(m);
      const privKey = account.getHdKey().privateKey;
      let hexPrivKey = "";
      if (privKey) {
        hexPrivKey = Array.from(privKey)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
      const userData = {
        name,
        lang,
        seed: m,
        privateKey: hexPrivKey,
        address: account.address,
      };
      if (pin && name) {
        const enc = await encryptData(JSON.stringify(userData), pin);
        localStorage.setItem(`goodvibe_userdata_${account.address}`, enc);
        // Добавляем сессию в список, если её нет
        const sessionsRaw = localStorage.getItem("goodvibe_sessions");
        let sessions: { id: string; name: string; created: string }[] = [];
        try {
          if (sessionsRaw) sessions = JSON.parse(sessionsRaw);
        } catch {}
        // Удаляем дубликаты по id
        const filtered = sessions.filter((s) => s.id !== account.address);
        filtered.push({
          id: account.address,
          name,
          created: new Date().toISOString(),
        });
        localStorage.setItem("goodvibe_sessions", JSON.stringify(filtered));
        // Очищаем временные данные
        localStorage.removeItem("goodvibe_name");
        localStorage.removeItem("goodvibe_pin");
        navigate("/");
      } else {
        toast("Нет данных пользователя или пин-кода");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Seed-фраза</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Тема</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </CardHeader>
        <CardContent>
          {mnemonic.length > 0 ? (
            <>
              <div className="flex justify-center my-8">
                <span className="inline-block px-8 py-4 bg-muted rounded-lg font-bold text-2xl tracking-widest text-primary">
                  {mnemonic[step]}
                </span>
              </div>
              <div className="text-center text-muted-foreground mb-4">
                {step + 1} / {mnemonic.length}
              </div>
              <Button
                onClick={handleNext}
                className="w-full text-base font-semibold mt-4"
              >
                {step < mnemonic.length - 1 ? "Далее" : "Готово"}
              </Button>
              {step > 0 && (
                <Button
                  variant="secondary"
                  className="w-full text-base font-semibold mt-2"
                  onClick={() => setStep(step - 1)}
                >
                  Назад
                </Button>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Генерация seed-фразы...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
