import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { mnemonicToAccount } from "viem/accounts";
import { encryptData } from "../utils/crypto";

const languages = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

// Получить список сессий из localStorage
function getSessions() {
  const raw = localStorage.getItem("goodvibe_sessions");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as { id: string; name: string; created: string }[];
  } catch {
    return [];
  }
}

export default function Login() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [lang, setLang] = useState("ru");
  const [sessions, setSessions] = useState<
    { id: string; name: string; created: string }[]
  >([]);
  const [dark, setDark] = useState(
    typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<null | {
    id: string;
    name: string;
    created: string;
  }>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [importSeed, setImportSeed] = useState<string[]>(Array(12).fill(""));
  const [importName, setImportName] = useState("");
  const [importPin, setImportPin] = useState("");
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  useEffect(() => {
    function handler(e: any) {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && pin.length >= 6) {
      localStorage.setItem("goodvibe_pin", pin);
      localStorage.setItem("goodvibe_name", name);
      localStorage.setItem("goodvibe_lang", lang);
      navigate("/seed");
    }
  };

  const handleSessionLogin = (session: { id: string; name: string }) => {
    localStorage.setItem("goodvibe_session_id", session.id);
    navigate("/session-pin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">
            Добро пожаловать в GOOD VIBE DAO
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Тема</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </CardHeader>
        <CardContent>
          {showInstall && (
            <Button
              className="w-full mb-4"
              variant="secondary"
              onClick={async () => {
                if (installPrompt) {
                  installPrompt.prompt();
                  await installPrompt.userChoice;
                  setShowInstall(false);
                }
              }}
            >
              Установить приложение
            </Button>
          )}
          {sessions.length > 0 && (
            <div className="mb-6">
              <div className="font-semibold text-base mb-2 text-muted-foreground">
                Сохранённые сессии
              </div>
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between bg-muted rounded-md px-3 py-2"
                  >
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(s.created).toLocaleString(lang)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSessionLogin(s)}
                      >
                        Войти
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await navigator.clipboard.writeText(s.id);
                          toast("Адрес кошелька скопирован", {
                            description: s.id,
                          });
                        }}
                      >
                        Адрес
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSessionToDelete(s);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-4"
                variant="secondary"
                onClick={() => {
                  setImportModal(true);
                  setImportStep(0);
                  setImportSeed(Array(12).fill(""));
                  setImportName("");
                  setImportPin("");
                  setImportError("");
                }}
              >
                Импорт кошелька
              </Button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
                placeholder="Введите имя"
              />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="lang">Язык</Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="w-full" id="lang">
                  <SelectValue placeholder="Выберите язык" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full text-base font-semibold">
              Далее
            </Button>
          </form>
        </CardContent>
      </Card>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сессию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие удалит выбранную сессию и связанные с ней данные. Вы
              уверены?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!sessionToDelete) return;
                const sessionsRaw = localStorage.getItem("goodvibe_sessions");
                let sessionsArr: {
                  id: string;
                  name: string;
                  created: string;
                }[] = [];
                try {
                  if (sessionsRaw) sessionsArr = JSON.parse(sessionsRaw);
                } catch {}
                const filtered = sessionsArr.filter(
                  (sess) => sess.id !== sessionToDelete.id
                );
                localStorage.setItem(
                  "goodvibe_sessions",
                  JSON.stringify(filtered)
                );
                localStorage.removeItem(
                  `goodvibe_userdata_${sessionToDelete.id}`
                );
                setSessions(filtered);
                setSessionToDelete(null);
                setDeleteDialogOpen(false);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {importModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-sm shadow-lg">
            <h2 className="text-lg font-bold mb-4">Импорт кошелька</h2>
            {importStep < 12 ? (
              <>
                <div className="mb-2 text-sm text-muted-foreground">
                  Введите слово {importStep + 1} из 12
                </div>
                <Input
                  autoFocus
                  className="mb-4"
                  value={importSeed[importStep]}
                  onChange={(e) => {
                    const arr = [...importSeed];
                    arr[importStep] = e.target.value.trim().toLowerCase();
                    setImportSeed(arr);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && importSeed[importStep]) {
                      setImportStep(importStep + 1);
                    }
                  }}
                  placeholder={`Слово ${importStep + 1}`}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (importStep > 0) setImportStep(importStep - 1);
                    }}
                    disabled={importStep === 0}
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={() => {
                      if (importSeed[importStep]) setImportStep(importStep + 1);
                    }}
                    disabled={!importSeed[importStep]}
                  >
                    Далее
                  </Button>
                </div>
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setImportError("");
                  setImportLoading(true);
                  try {
                    if (importSeed.some((w) => !w)) {
                      setImportError("Введите все 12 слов");
                      setImportLoading(false);
                      return;
                    }
                    if (!importName.trim()) {
                      setImportError("Введите название сессии");
                      setImportLoading(false);
                      return;
                    }
                    if (importPin.length < 6) {
                      setImportError("Пин-код минимум 6 цифр");
                      setImportLoading(false);
                      return;
                    }
                    const phrase = importSeed.join(" ").trim();
                    const account = mnemonicToAccount(phrase);
                    const privKey = account.getHdKey().privateKey;
                    let hexPrivKey = "";
                    if (privKey) {
                      hexPrivKey = Array.from(privKey)
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");
                    }
                    const userData = {
                      name: importName,
                      lang,
                      seed: phrase,
                      privateKey: hexPrivKey,
                      address: account.address,
                    };
                    const enc = await encryptData(
                      JSON.stringify(userData),
                      importPin
                    );
                    localStorage.setItem(
                      `goodvibe_userdata_${account.address}`,
                      enc
                    );
                    // Добавляем сессию в список
                    const sessionsRaw =
                      localStorage.getItem("goodvibe_sessions");
                    let sessionsArr: {
                      id: string;
                      name: string;
                      created: string;
                    }[] = [];
                    try {
                      if (sessionsRaw) sessionsArr = JSON.parse(sessionsRaw);
                    } catch {}
                    // Удаляем дубликаты по id
                    const filtered = sessionsArr.filter(
                      (s) => s.id !== account.address
                    );
                    filtered.push({
                      id: account.address,
                      name: importName,
                      created: new Date().toISOString(),
                    });
                    localStorage.setItem(
                      "goodvibe_sessions",
                      JSON.stringify(filtered)
                    );
                    setImportModal(false);
                    setImportLoading(false);
                    localStorage.setItem(
                      "goodvibe_session_id",
                      account.address
                    );
                    localStorage.setItem("goodvibe_pin", importPin);
                    navigate("/session-pin");
                  } catch (e) {
                    setImportError("Ошибка импорта seed-фразы");
                    setImportLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <Input
                  placeholder="Название сессии"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Пин-код (6+ цифр)"
                  type="password"
                  value={importPin}
                  onChange={(e) =>
                    setImportPin(e.target.value.replace(/\D/g, ""))
                  }
                  minLength={6}
                  maxLength={12}
                  required
                />
                {importError && (
                  <div className="text-red-500 text-sm">{importError}</div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setImportModal(false)}
                    disabled={importLoading}
                  >
                    Отмена
                  </Button>
                  <Button type="submit" disabled={importLoading}>
                    {importLoading ? "Импорт..." : "Импортировать"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
