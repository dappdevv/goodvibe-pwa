import { useEffect, useState } from "react";
import { publicClient } from "../blockchain/client";
import { decryptData, encryptData } from "../utils/crypto";
import { useNavigate } from "react-router-dom";
import { createWalletClientFromPrivateKey } from "../blockchain/client";
import { mnemonicToAccount } from "viem/accounts";
import { parseEther, isAddress } from "viem";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { KeyRound, KeySquare } from "lucide-react";

const IPFS_CAT = import.meta.env.VITE_IPFS_ENDPOINT + "cat/";

export default function Home() {
  const [user, setUser] = useState<{
    name: string;
    address: string;
    avatarHash?: string;
    seed?: string;
  } | null>(null);
  const [balance, setBalance] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const [privKeyCopied, setPrivKeyCopied] = useState(false);
  let privateKey: string | undefined = undefined;
  if (user) privateKey = (user as any).privateKey;
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSeed, setImportSeed] = useState<string[]>(Array(12).fill(""));
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [seedStep, setSeedStep] = useState(0);

  useEffect(() => {
    const sessionId = localStorage.getItem("goodvibe_session_id");
    const encrypted = sessionId
      ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
      : null;
    const pin = localStorage.getItem("goodvibe_pin");
    if (!encrypted || !pin) {
      setError("Нет данных пользователя или пин-кода");
      console.error("Нет данных пользователя или пин-кода");
      return;
    }
    (async () => {
      try {
        const decrypted = await decryptData(encrypted, pin);
        const data = JSON.parse(decrypted);
        setUser(data);
        if (data.avatarHash) {
          try {
            let endpoint = IPFS_CAT + data.avatarHash;
            let fetchOptions: RequestInit = { method: "POST" };
            try {
              const url = new URL(endpoint);
              if (url.username && url.password) {
                endpoint = endpoint.replace(
                  `${url.username}:${url.password}@`,
                  ""
                );
                fetchOptions.headers = {
                  ...(fetchOptions.headers || {}),
                  Authorization:
                    "Basic " + btoa(`${url.username}:${url.password}`),
                };
              }
            } catch (parseErr) {
              console.error("Ошибка парсинга endpoint:", parseErr);
            }
            const res = await fetch(endpoint, fetchOptions);
            if (res.ok) {
              // Удалить: const blob = await res.blob();
            } else {
              console.error("Ошибка получения аватара:", await res.text());
            }
          } catch (err) {
            console.error("Ошибка загрузки аватара с IPFS:", err);
          }
        }
        const bal = await publicClient.getBalance({ address: data.address });
        const formatted =
          (Number(bal) / 1e18).toFixed(4) +
          " " +
          (publicClient.chain.nativeCurrency?.symbol || "GVT");
        setBalance(formatted);
      } catch (e) {
        setError("Ошибка расшифровки или получения баланса");
        console.error("Ошибка расшифровки или получения баланса:", e);
      }
    })();
  }, []);

  const handleCopy = async () => {
    if (user) {
      await navigator.clipboard.writeText(user.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("goodvibe_pin");
    navigate("/");
  };

  if (error) {
    return (
      <div className="text-destructive text-center mt-10 font-semibold">
        {error}
      </div>
    );
  }
  if (!user) {
    return (
      <div className="text-center mt-10 text-muted-foreground">Загрузка...</div>
    );
  }
  return (
    <div className="w-full min-h-screen max-w-screen overflow-x-hidden flex items-center justify-center bg-background px-2 sm:px-4 pt-20">
      {/* Карточка: ограничиваем ширину, убираем лишние paddings */}
      <Card className="w-full max-w-lg mx-auto px-2 sm:px-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2 min-w-0">
          <CardTitle className="text-lg font-bold">Главная</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            <b>Сессия:</b> {user.name}
          </div>
          <div className="flex flex-col sm:flex-row items-center mb-2 break-all w-full">
            <b>Адрес:</b>
            <span className="font-mono ml-2 break-all w-full max-w-full overflow-x-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-muted-foreground/30">
              {user.address}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 shrink-0"
              onClick={handleCopy}
              title="Скопировать адрес"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect
                  x="5"
                  y="5"
                  width="10"
                  height="10"
                  rx="2"
                  stroke="#6c47ff"
                  strokeWidth="2"
                  fill="#f7f7ff"
                />
                <rect
                  x="8"
                  y="2"
                  width="10"
                  height="10"
                  rx="2"
                  stroke="#bbb"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </Button>
            {copied && (
              <span className="text-primary text-xs ml-2">Скопировано!</span>
            )}
          </div>
          <div className="mb-4 flex items-center flex-wrap gap-2">
            <b>Баланс:</b> <span className="ml-2">{balance}</span>
            <Button
              size="sm"
              className="ml-3"
              onClick={() => setShowSendModal(true)}
            >
              Отправить
            </Button>
          </div>
          {user && privateKey && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4 w-full">
              <Button
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={async () => {
                  await navigator.clipboard.writeText(privateKey!);
                  setPrivKeyCopied(true);
                  setTimeout(() => setPrivKeyCopied(false), 1200);
                }}
                aria-label="Скопировать приватный ключ"
              >
                <KeySquare className="w-5 h-5" />
                <span className="hidden xs:inline">Приватный ключ</span>
                <span className="inline xs:hidden">Ключ</span>
                {privKeyCopied && (
                  <span className="text-primary text-xs ml-2">
                    Скопировано!
                  </span>
                )}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-2"
                onClick={() => setShowSeedDialog(true)}
                aria-label="Показать seed фразу"
              >
                <KeyRound className="w-5 h-5" />
                <span className="hidden xs:inline">Seed фраза</span>
                <span className="inline xs:hidden">Seed</span>
              </Button>
            </div>
          )}
          {user && privateKey && (
            <AlertDialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Показать seed фразу?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Seed фраза — это единственный способ восстановить доступ к
                    кошельку. Никому не показывайте эти слова!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (user?.seed) {
                        setSeedWords(user.seed.split(" "));
                        setSeedStep(0);
                        setShowSeedDialog(false);
                        setShowSeedModal(true);
                      }
                    }}
                  >
                    Показать
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {showSeedModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-2 sm:px-0">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 sm:p-6 w-full max-w-xs sm:max-w-sm shadow-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-bold mb-4">Seed фраза</h2>
                <div className="mb-4 text-center text-2xl font-mono select-all">
                  {seedWords[seedStep]}
                </div>
                <div className="flex gap-2 justify-center mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setSeedStep((s) => Math.max(0, s - 1))}
                    disabled={seedStep === 0}
                  >
                    Назад
                  </Button>
                  <Button
                    onClick={() =>
                      setSeedStep((s) => Math.min(seedWords.length - 1, s + 1))
                    }
                    disabled={seedStep === seedWords.length - 1}
                  >
                    Далее
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowSeedModal(false)}
                  >
                    Закрыть
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-4 text-center">
                  Никому не показывайте seed фразу!
                  <br />
                  Она даёт полный доступ к вашему кошельку.
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 w-full">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Завершить сеанс
          </Button>
        </CardFooter>
      </Card>
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2 sm:px-0">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-xs sm:max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Отправить токены</h3>
            <Input
              type="text"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              placeholder="Адрес получателя (0x...)"
              className="mb-2"
            />
            <Input
              type="number"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="Сумма"
              min={0}
              className="mb-2"
            />
            {sendError && <div className="text-red-500 mb-2">{sendError}</div>}
            <div className="flex gap-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowSendModal(false);
                  setSendTo("");
                  setSendAmount("");
                  setSendError("");
                }}
              >
                Отмена
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={async () => {
                  setSendError("");
                  setSendLoading(true);
                  if (!isAddress(sendTo)) {
                    setSendError("Некорректный адрес получателя");
                    setSendLoading(false);
                    return;
                  }
                  let value;
                  try {
                    value = parseEther(sendAmount);
                  } catch {
                    setSendError("Некорректная сумма");
                    setSendLoading(false);
                    return;
                  }
                  if (value <= 0n) {
                    setSendError("Сумма должна быть больше 0");
                    setSendLoading(false);
                    return;
                  }
                  try {
                    const sessionId = localStorage.getItem(
                      "goodvibe_session_id"
                    );
                    const encrypted = sessionId
                      ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
                      : null;
                    const pin = localStorage.getItem("goodvibe_pin");
                    if (!encrypted || !pin)
                      throw new Error("Нет доступа к приватному ключу");
                    const decrypted = await decryptData(encrypted, pin);
                    const userData = JSON.parse(decrypted);
                    const walletClient = createWalletClientFromPrivateKey(
                      userData.privateKey
                    );
                    const hash = await walletClient.sendTransaction({
                      to: sendTo,
                      value,
                    });
                    setShowSendModal(false);
                    setSendTo("");
                    setSendAmount("");
                    setSendError("");
                    toast(`Транзакция отправлена!\nHash: ${hash}`);
                  } catch (e: any) {
                    console.error(e);
                    setSendError(
                      e?.shortMessage ||
                        e?.message ||
                        JSON.stringify(e) ||
                        "Ошибка отправки"
                    );
                  }
                  setSendLoading(false);
                }}
                disabled={sendLoading}
              >
                {sendLoading ? "Отправка..." : "Отправить"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2 sm:px-0">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-xs sm:max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Импорт кошелька</h3>
            <div className="flex flex-wrap gap-2">
              {importSeed.map((word, idx) => (
                <Input
                  key={idx}
                  type="text"
                  value={word}
                  onChange={(e) => {
                    const arr = [...importSeed];
                    arr[idx] = e.target.value.trim().toLowerCase();
                    setImportSeed(arr);
                  }}
                  placeholder={`Слово ${idx + 1}`}
                  autoComplete="off"
                />
              ))}
            </div>
            {importError && (
              <div className="text-red-500 mb-2">{importError}</div>
            )}
            <div className="flex gap-4 mt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError("");
                  setImportSeed(Array(12).fill(""));
                }}
              >
                Отмена
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={async () => {
                  setImportError("");
                  setImportLoading(true);
                  const phrase = importSeed.join(" ").trim();
                  if (importSeed.some((w) => !w)) {
                    setImportError("Введите все 12 слов");
                    setImportLoading(false);
                    return;
                  }
                  try {
                    const account = mnemonicToAccount(phrase);
                    const privKey = account.getHdKey().privateKey;
                    let hexPrivKey = "";
                    if (privKey) {
                      hexPrivKey = Array.from(privKey)
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");
                    }
                    const sessionId = localStorage.getItem(
                      "goodvibe_session_id"
                    );
                    const pin = localStorage.getItem("goodvibe_pin");
                    const lang = localStorage.getItem("goodvibe_lang") || "ru";
                    if (!sessionId || !pin) {
                      setImportError(
                        "Ошибка: нет активной сессии или пин-кода"
                      );
                      setImportLoading(false);
                      return;
                    }
                    const userData = {
                      name: user?.name || "",
                      lang,
                      seed: phrase,
                      privateKey: hexPrivKey,
                      address: account.address,
                    };
                    const enc = await encryptData(
                      JSON.stringify(userData),
                      pin
                    );
                    localStorage.setItem(`goodvibe_userdata_${sessionId}`, enc);
                    setUser(userData);
                    setShowImportModal(false);
                    setImportSeed(Array(12).fill(""));
                  } catch (e) {
                    setImportError("Ошибка импорта seed-фразы");
                  }
                  setImportLoading(false);
                }}
                disabled={importLoading}
              >
                {importLoading ? "Импорт..." : "Импортировать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
