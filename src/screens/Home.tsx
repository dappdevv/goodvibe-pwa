import { useEffect, useState, useRef } from "react";
import { publicClient } from "../blockchain/client";
import { decryptData, encryptData } from "../utils/crypto";
import { useNavigate } from "react-router-dom";
import {
  getUser,
  createInvite,
  createVerification,
  getActiveVerification,
} from "../blockchain/daoUsers";
import { createWalletClientFromPrivateKey } from "../blockchain/client";
import daoUsersAddress from "../blockchain/addresses/DAOUsers.json";
import { mnemonicToAccount } from "viem/accounts";
import { parseEther, isAddress, type Address, keccak256, toHex } from "viem";
import DAOUsersAbi from "../blockchain/abi/DAOUsers.json";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

const IPFS_CAT = import.meta.env.VITE_GOODVIBE_IPFS_ENDPOINT + "cat/";

// Статусы пользователя в DAO
const UserStatus = {
  None: 0,
  Pending: 1,
  Active: 2,
  Inactive: 3,
} as const;

const UserStatusLabels = {
  [UserStatus.None]: "Не зарегистрирован",
  [UserStatus.Pending]: "Ожидает подтверждения",
  [UserStatus.Active]: "Активный",
  [UserStatus.Inactive]: "Неактивный",
} as const;

// Тип для структуры верификации из контракта
interface VerificationStruct {
  requester: string;
  verifier: string;
  encryptedFullName: string;
  photoCID: string;
  status: number;
  comment: string;
  created: bigint;
  isInspected: boolean;
  independentInspection: string;
  verificationHash: string;
}

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
  const [daoUser, setDaoUser] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [privKeyCopied, setPrivKeyCopied] = useState(false);
  let privateKey: string | undefined = undefined;
  if (user) privateKey = (user as any).privateKey;
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteAddress, setInviteAddress] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSeed, setImportSeed] = useState<string[]>(Array(12).fill(""));
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationFullName, setVerificationFullName] = useState("");
  const [verificationKey, setVerificationKey] = useState("");
  const [verificationPhoto, setVerificationPhoto] = useState<File | null>(null);
  const [verificationPhotoPreview, setVerificationPhotoPreview] =
    useState<string>("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dark, setDark] = useState(
    typeof window !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
  const [verificationVerifier, setVerificationVerifier] = useState("");
  const [showVerifierModal, setShowVerifierModal] = useState(false);
  const [verifyUserAddress, setVerifyUserAddress] = useState("");
  const [verifyKey, setVerifyKey] = useState("");
  const [verifyPhotoUrl, setVerifyPhotoUrl] = useState("");
  const [verifyPhotoLoading, setVerifyPhotoLoading] = useState(false);
  const [verifyFullNameInput, setVerifyFullNameInput] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyReady, setVerifyReady] = useState(false);
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

  // Новый useEffect для запроса к DAOUsers
  useEffect(() => {
    if (!user) return;
    try {
      if (!user.address.startsWith("0x"))
        throw new Error("Адрес пользователя должен начинаться с 0x");
      (async () => {
        const data = await getUser(user.address as `0x${string}`);
        setDaoUser(data);
      })();
    } catch (e) {
      console.error(
        "[Home] Ошибка получения данных пользователя из контракта:",
        e
      );
      setDaoUser(null);
    }
  }, [user]);

  // useEffect для получения статуса текущей верификации
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const arr = (await getActiveVerification(
          user.address as Address
        )) as any[];
        // Преобразуем массив в объект VerificationStruct
        const res: VerificationStruct = {
          requester: arr[0],
          verifier: arr[1],
          encryptedFullName: arr[2],
          photoCID: arr[3],
          status: Number(arr[4]),
          comment: arr[5],
          created: arr[6],
          isInspected: arr[7],
          independentInspection: arr[8],
          verificationHash: arr[9],
        };
        const statusNum = res.status;
        if (arr && typeof statusNum === "number" && statusNum !== 0) {
          setVerificationStatus({
            status:
              [
                "Нет", // 0
                "Ожидание", // 1
                "Подтверждено", // 2
                "Отклонено", // 3
                "Раскрыто", // 4
                "Приостановлено", // 5
                "Верифицировано", // 6
              ][statusNum] || statusNum,
            raw: res,
          });
        } else {
          setVerificationStatus(null);
        }
      } catch (e) {
        setVerificationStatus(null);
      }
    })();
  }, [user, showVerificationModal]);

  // Управление потоком камеры для селфи
  useEffect(() => {
    if (!showCamera) return;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setVerificationError("Не удалось получить доступ к камере");
        setShowCamera(false);
      }
    })();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCamera]);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

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

  const handleCreateInvite = async () => {
    setInviteError("");
    if (!inviteAddress) return;
    if (!inviteAddress.startsWith("0x")) {
      setInviteError("Адрес должен начинаться с 0x");
      return;
    }
    setInviteLoading(true);
    try {
      const sessionId = localStorage.getItem("goodvibe_session_id");
      const encrypted = sessionId
        ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
        : null;
      const pin = localStorage.getItem("goodvibe_pin");
      if (!encrypted || !pin) throw new Error("Нет доступа к приватному ключу");
      const decrypted = await decryptData(encrypted, pin);
      const userData = JSON.parse(decrypted);
      const walletClient = createWalletClientFromPrivateKey(
        userData.privateKey
      );
      await createInvite(walletClient, inviteAddress as `0x${string}`);
      toast("Приглашение успешно создано!");
      setShowInviteModal(false);
      setInviteAddress("");
    } catch (e: any) {
      console.error(e);
      setInviteError(
        e?.shortMessage ||
          e?.message ||
          JSON.stringify(e) ||
          "Ошибка создания приглашения"
      );
    }
    setInviteLoading(false);
  };

  // Функция для загрузки и расшифровки фото
  const handleVerifierLoad = async () => {
    setVerifyError("");
    setVerifySuccess("");
    setVerifyPhotoUrl("");
    setVerifyReady(false);
    setVerifyPhotoLoading(true);
    try {
      if (!isAddress(verifyUserAddress)) {
        setVerifyError("Некорректный адрес пользователя");
        setVerifyPhotoLoading(false);
        return;
      }
      if (!verifyKey) {
        setVerifyError("Введите ключ верификации");
        setVerifyPhotoLoading(false);
        return;
      }
      // Получаем данные верификации
      const arr = (await getActiveVerification(
        verifyUserAddress as Address
      )) as any[];
      const verification: VerificationStruct = {
        requester: arr[0],
        verifier: arr[1],
        encryptedFullName: arr[2],
        photoCID: arr[3],
        status: Number(arr[4]),
        comment: arr[5],
        created: arr[6],
        isInspected: arr[7],
        independentInspection: arr[8],
        verificationHash: arr[9],
      };
      if (!verification || verification.status === 0) {
        setVerifyError("Нет активной верификации для этого пользователя");
        setVerifyPhotoLoading(false);
        return;
      }
      const photoCID = verification.photoCID;
      // Загружаем фото с IPFS
      let endpoint = IPFS_CAT + photoCID;
      let fetchOptions: RequestInit = { method: "POST" };
      try {
        const url = new URL(endpoint);
        if (url.username && url.password) {
          endpoint = endpoint.replace(`${url.username}:${url.password}@`, "");
          fetchOptions.headers = {
            ...(fetchOptions.headers || {}),
            Authorization: "Basic " + btoa(`${url.username}:${url.password}`),
          };
        }
      } catch {}
      const res = await fetch(endpoint, fetchOptions);
      if (!res.ok) {
        setVerifyError("Ошибка загрузки фото с IPFS");
        setVerifyPhotoLoading(false);
        return;
      }
      const encryptedPhoto = await res.text();
      // Расшифровываем фото
      const decryptedPhotoBase64 = await decryptData(encryptedPhoto, verifyKey);
      // base64 -> blob
      const base64Data = decryptedPhotoBase64.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });
      setVerifyPhotoUrl(URL.createObjectURL(blob));
      setVerifyReady(true);
    } catch (e: any) {
      setVerifyError(e?.message || "Ошибка расшифровки фото");
    }
    setVerifyPhotoLoading(false);
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
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <Card className="w-full max-w-lg sm:max-w-xl md:max-w-2xl mx-auto px-2 sm:px-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Главная</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Тема</span>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2">
            <b>Сессия:</b> {user.name}
          </div>
          <div className="flex flex-col sm:flex-row items-center mb-2 break-all w-full">
            <b>Адрес:</b>
            <span className="font-mono ml-2 break-all w-full max-w-full overflow-x-auto whitespace-pre-wrap">
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
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-sm shadow-lg">
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
          {daoUser && (
            <div className="bg-muted rounded-lg p-3 mb-4">
              <div>
                <b>Имя (из DAO):</b> {daoUser[0]}
              </div>
              <div>
                <b>Адрес:</b> {daoUser[1]}
              </div>
              <div>
                <b>Статус:</b>{" "}
                {UserStatusLabels[
                  daoUser[2] as keyof typeof UserStatusLabels
                ] || daoUser[2]}
              </div>
              <div>
                <b>Активность:</b> {daoUser[3]}
              </div>
              <div>
                <b>Уровень:</b> {daoUser[4]}
              </div>
              <div>
                <b>Пригласивший:</b> {daoUser[5]}
              </div>
            </div>
          )}
          {daoUser && (
            <Button
              variant="secondary"
              className="w-full mb-4"
              onClick={() => setShowInviteModal(true)}
            >
              Пригласить пользователя
            </Button>
          )}
          {daoUser &&
            daoUser[2] === UserStatus.Active &&
            !verificationStatus && (
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => setShowVerificationModal(true)}
              >
                Начать верификацию
              </Button>
            )}
          {verificationStatus && (
            <div className="bg-muted rounded-lg p-3 mb-4">
              <b>Статус верификации:</b> {verificationStatus.status}
              {verificationStatus.raw && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <div>
                    <b>Запрашивающий:</b> {verificationStatus.raw.requester}
                  </div>
                  <div>
                    <b>Верификатор:</b> {verificationStatus.raw.verifier}
                  </div>
                  <div>
                    <b>photoCID:</b> {verificationStatus.raw.photoCID}
                  </div>
                  <div>
                    <b>encryptedFullName:</b>{" "}
                    {verificationStatus.raw.encryptedFullName}
                  </div>
                  <div>
                    <b>Комментарий:</b> {verificationStatus.raw.comment}
                  </div>
                  <div>
                    <b>Дата создания:</b>{" "}
                    {verificationStatus.raw.created
                      ? new Date(
                          Number(verificationStatus.raw.created) * 1000
                        ).toLocaleString()
                      : "-"}
                  </div>
                  <div>
                    <b>Независимая проверка:</b>{" "}
                    {verificationStatus.raw.isInspected ? "Да" : "Нет"}
                  </div>
                  <div>
                    <b>Отчёт независимой проверки:</b>{" "}
                    {verificationStatus.raw.independentInspection || "-"}
                  </div>
                  <div>
                    <b>Хэш верификации:</b>{" "}
                    {verificationStatus.raw.verificationHash}
                  </div>
                </div>
              )}
            </div>
          )}
          {showVerificationModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-8 rounded-lg max-w-md">
                <h3 className="text-lg font-bold mb-4">
                  Верификация пользователя
                </h3>
                <Input
                  type="text"
                  value={verificationFullName}
                  onChange={(e) => setVerificationFullName(e.target.value)}
                  placeholder="Фамилия Имя Отчество"
                  className="mb-2"
                  autoComplete="off"
                />
                <Input
                  type="password"
                  value={verificationKey}
                  onChange={(e) => setVerificationKey(e.target.value)}
                  placeholder="Ключ верификации (пароль)"
                  className="mb-2"
                  autoComplete="off"
                />
                <Input
                  type="text"
                  value={verificationVerifier}
                  onChange={(e) => setVerificationVerifier(e.target.value)}
                  placeholder="Адрес верификатора (0x...)"
                  className="mb-2"
                  autoComplete="off"
                />
                {verificationPhotoPreview && (
                  <img
                    src={verificationPhotoPreview}
                    alt="Селфи"
                    className="w-32 h-32 rounded-full object-cover mb-2"
                  />
                )}
                {!showCamera && (
                  <Button
                    variant="secondary"
                    className="w-full mb-2"
                    onClick={() => setShowCamera(true)}
                  >
                    Сделать селфи
                  </Button>
                )}
                {showCamera && (
                  <div className="mb-2">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      width={240}
                      height={180}
                      className="rounded-lg bg-muted mb-2"
                    />
                    <canvas
                      ref={canvasRef}
                      width={240}
                      height={180}
                      style={{ display: "none" }}
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={async () => {
                          if (!videoRef.current || !canvasRef.current) return;
                          const ctx = canvasRef.current.getContext("2d");
                          if (!ctx) return;
                          ctx.drawImage(videoRef.current, 0, 0, 240, 180);
                          canvasRef.current.toBlob((blob) => {
                            if (blob) {
                              setVerificationPhoto(
                                new File([blob], "selfie.png", {
                                  type: "image/png",
                                })
                              );
                              setVerificationPhotoPreview(
                                URL.createObjectURL(blob)
                              );
                            }
                          }, "image/png");
                          setShowCamera(false);
                          // Остановить камеру
                          if (videoRef.current.srcObject) {
                            const tracks = (
                              videoRef.current.srcObject as MediaStream
                            ).getTracks();
                            tracks.forEach((track) => track.stop());
                          }
                        }}
                      >
                        Сфотографировать
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                          setShowCamera(false);
                          if (videoRef.current && videoRef.current.srcObject) {
                            const tracks = (
                              videoRef.current.srcObject as MediaStream
                            ).getTracks();
                            tracks.forEach((track) => track.stop());
                          }
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
                {verificationError && (
                  <div className="text-red-500 mb-2">{verificationError}</div>
                )}
                <div className="flex gap-4 mt-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowVerificationModal(false);
                      setVerificationFullName("");
                      setVerificationKey("");
                      setVerificationPhoto(null);
                      setVerificationPhotoPreview("");
                      setVerificationError("");
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={async () => {
                      setVerificationError("");
                      setVerificationLoading(true);
                      try {
                        if (!user) throw new Error("Нет пользователя");
                        if (
                          !verificationFullName ||
                          !verificationKey ||
                          !verificationPhoto
                        )
                          throw new Error(
                            "Заполните все поля и сделайте селфи"
                          );
                        // 1. Зашифровать ФИО
                        const encryptedFullName = await encryptData(
                          verificationFullName,
                          verificationKey
                        );
                        // 2. Зашифровать фото (читаем как base64, шифруем как строку)
                        const photoBase64 = await new Promise<string>(
                          (resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () =>
                              resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(verificationPhoto);
                          }
                        );
                        const encryptedPhoto = await encryptData(
                          photoBase64,
                          verificationKey
                        );
                        // 3. Загружаем зашифрованное фото на IPFS
                        const formData = new FormData();
                        const blob = new Blob([encryptedPhoto], {
                          type: "text/plain",
                        });
                        formData.append("path", blob, "photo.enc");
                        let endpoint =
                          import.meta.env.VITE_GOODVIBE_IPFS_ENDPOINT + "add";
                        let fetchOptions: RequestInit = {
                          method: "POST",
                          body: formData,
                        };
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
                                "Basic " +
                                btoa(`${url.username}:${url.password}`),
                            };
                          }
                        } catch {}
                        const res = await fetch(endpoint, fetchOptions);
                        if (!res.ok)
                          throw new Error("Ошибка загрузки фото на IPFS");
                        const data = await res.json();
                        if (!data.Hash) throw new Error("IPFS не вернул CID");
                        const photoCID = data.Hash;
                        // 4. Хэш верификации
                        const verificationHash = keccak256(
                          toHex(verificationFullName)
                        );
                        // 5. Верификатор (валидируем адрес)
                        let verifier: Address;
                        if (
                          verificationVerifier &&
                          verificationVerifier.startsWith("0x") &&
                          verificationVerifier.length === 42
                        ) {
                          verifier = verificationVerifier as Address;
                        } else {
                          verifier = user.address as Address;
                        }
                        // 6. Получаем walletClient
                        const sessionId = localStorage.getItem(
                          "goodvibe_session_id"
                        );
                        const encrypted = sessionId
                          ? localStorage.getItem(
                              `goodvibe_userdata_${sessionId}`
                            )
                          : null;
                        const pin = localStorage.getItem("goodvibe_pin");
                        if (!encrypted || !pin)
                          throw new Error("Нет доступа к приватному ключу");
                        const decrypted = await decryptData(encrypted, pin);
                        const userData = JSON.parse(decrypted);
                        const walletClient = createWalletClientFromPrivateKey(
                          userData.privateKey
                        );
                        // 7. Вызов контракта
                        await createVerification(
                          walletClient,
                          verifier,
                          encryptedFullName,
                          photoCID,
                          verificationHash
                        );
                        setShowVerificationModal(false);
                        setVerificationFullName("");
                        setVerificationKey("");
                        setVerificationPhoto(null);
                        setVerificationPhotoPreview("");
                        setVerificationError("");
                        toast("Верификация отправлена!");
                      } catch (e: any) {
                        setVerificationError(
                          e?.message || "Ошибка отправки верификации"
                        );
                      }
                      setVerificationLoading(false);
                    }}
                    disabled={verificationLoading}
                  >
                    {verificationLoading ? "Отправка..." : "Отправить"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {daoUser && daoUser[2] === UserStatus.None && (
            <Button
              variant="secondary"
              className="w-full mt-4"
              onClick={() => setShowRegisterModal(true)}
            >
              Зарегистрироваться
            </Button>
          )}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2">
              <div className="bg-white p-6 rounded-lg w-full max-w-md mx-auto">
                <h3 className="text-lg font-bold mb-4">Создание приглашения</h3>
                <Input
                  type="text"
                  value={inviteAddress}
                  onChange={(e) => setInviteAddress(e.target.value)}
                  placeholder="Введите адрес (0x...)"
                  className="mb-4"
                />
                {inviteError && (
                  <div className="text-red-500 mb-4">{inviteError}</div>
                )}
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteError("");
                      setInviteAddress("");
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handleCreateInvite}
                    disabled={inviteLoading || !inviteAddress}
                  >
                    {inviteLoading ? "Создание..." : "Создать"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {showRegisterModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2">
              <div className="bg-white p-6 rounded-lg w-full max-w-md mx-auto">
                <h3 className="text-lg font-bold mb-4">
                  Регистрация пользователя
                </h3>
                <Input
                  type="text"
                  value={registerName}
                  onChange={(e) => {
                    const val = e.target.value.replace(
                      /[^a-zA-Zа-яА-Я0-9]/g,
                      ""
                    );
                    setRegisterName(val);
                  }}
                  placeholder="Имя пользователя"
                  minLength={3}
                  maxLength={42}
                  className="mb-2"
                  autoComplete="off"
                />
                {registerError && (
                  <div className="text-red-500 mb-2">{registerError}</div>
                )}
                <div className="flex gap-4">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowRegisterModal(false);
                      setRegisterName("");
                      setRegisterError("");
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={async () => {
                      if (registerName.length < 3) {
                        setRegisterError("Минимум 3 символа");
                        return;
                      }
                      if (registerName.length > 42) {
                        setRegisterError("Максимум 42 символа");
                        return;
                      }
                      if (/[^a-zA-Zа-яА-Я0-9]/.test(registerName)) {
                        setRegisterError(
                          "Только буквы и цифры, без пробелов и спецсимволов"
                        );
                        return;
                      }
                      setRegisterError("");
                      setRegisterLoading(true);
                      try {
                        const sessionId = localStorage.getItem(
                          "goodvibe_session_id"
                        );
                        const encrypted = sessionId
                          ? localStorage.getItem(
                              `goodvibe_userdata_${sessionId}`
                            )
                          : null;
                        const pin = localStorage.getItem("goodvibe_pin");
                        if (!encrypted || !pin)
                          throw new Error("Нет доступа к приватному ключу");
                        const decrypted = await decryptData(encrypted, pin);
                        const userData = JSON.parse(decrypted);
                        const walletClient = createWalletClientFromPrivateKey(
                          userData.privateKey
                        );
                        const hash = await walletClient.writeContract({
                          address: daoUsersAddress.address as Address,
                          abi: DAOUsersAbi,
                          functionName: "registerUser",
                          args: [registerName],
                          chain: walletClient.chain,
                          account: walletClient.account ?? null,
                        });
                        setShowRegisterModal(false);
                        setRegisterName("");
                        setRegisterError("");
                        toast(`Регистрация отправлена!\nHash: ${hash}`);
                        // Обновить данные пользователя после регистрации
                        if (userData.address) {
                          const updated = await getUser(userData.address);
                          setDaoUser(updated);
                        }
                      } catch (e: any) {
                        console.error(e);
                        setRegisterError(
                          e?.shortMessage ||
                            e?.message ||
                            JSON.stringify(e) ||
                            "Ошибка регистрации"
                        );
                      }
                      setRegisterLoading(false);
                    }}
                    disabled={registerLoading}
                  >
                    {registerLoading ? "Регистрация..." : "Зарегистрироваться"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 w-full">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Завершить сеанс
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setShowVerifierModal(true);
              setVerifyUserAddress("");
              setVerifyKey("");
              setVerifyPhotoUrl("");
              setVerifyFullNameInput("");
              setVerifyError("");
              setVerifySuccess("");
              setVerifyReady(false);
            }}
          >
            Верифицировать пользователя
          </Button>
        </CardFooter>
      </Card>
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2">
          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-auto">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2">
          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-auto">
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
      {showVerifierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-2">
          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-auto">
            <h3 className="text-lg font-bold mb-4">Верификация пользователя</h3>
            <Input
              type="text"
              value={verifyUserAddress}
              onChange={(e) => setVerifyUserAddress(e.target.value)}
              placeholder="Адрес пользователя (0x...)"
              className="mb-2"
              autoComplete="off"
            />
            <Input
              type="password"
              value={verifyKey}
              onChange={(e) => setVerifyKey(e.target.value)}
              placeholder="Ключ верификации"
              className="mb-2"
              autoComplete="off"
            />
            <Button
              variant="secondary"
              className="w-full mb-2"
              onClick={handleVerifierLoad}
              disabled={verifyPhotoLoading || !verifyUserAddress || !verifyKey}
            >
              {verifyPhotoLoading ? "Загрузка..." : "Показать фото"}
            </Button>
            {verifyPhotoUrl && (
              <img
                src={verifyPhotoUrl}
                alt="Фото пользователя"
                className="w-32 h-32 rounded-full object-cover mb-2 mx-auto"
              />
            )}
            {verifyReady && (
              <Input
                type="text"
                value={verifyFullNameInput}
                onChange={(e) => setVerifyFullNameInput(e.target.value)}
                placeholder="ФИО пользователя (для подтверждения)"
                className="mb-2"
                autoComplete="off"
              />
            )}
            {verifyError && (
              <div className="text-red-500 mb-2">{verifyError}</div>
            )}
            {verifySuccess && (
              <div className="text-green-600 mb-2">{verifySuccess}</div>
            )}
            <div className="flex gap-4 mt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowVerifierModal(false);
                  setVerifyUserAddress("");
                  setVerifyKey("");
                  setVerifyPhotoUrl("");
                  setVerifyFullNameInput("");
                  setVerifyError("");
                  setVerifySuccess("");
                  setVerifyReady(false);
                }}
              >
                Отмена
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={!verifyReady || !verifyFullNameInput || verifyLoading}
                onClick={async () => {
                  setVerifyError("");
                  setVerifySuccess("");
                  setVerifyLoading(true);
                  try {
                    if (!isAddress(verifyUserAddress)) {
                      throw new Error("Некорректный адрес пользователя");
                    }
                    if (!verifyFullNameInput) {
                      throw new Error("Введите ФИО пользователя");
                    }
                    // Получаем хэш
                    const hash = keccak256(toHex(verifyFullNameInput));
                    // Получаем walletClient
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
                    // Вызов approveVerification
                    await walletClient.writeContract({
                      address: daoUsersAddress.address as Address,
                      abi: DAOUsersAbi,
                      functionName: "approveVerification",
                      args: [verifyUserAddress, hash],
                      chain: walletClient.chain,
                      account: walletClient.account ?? null,
                    });
                    setVerifySuccess("Пользователь успешно подтверждён!");
                    setVerifyFullNameInput("");
                  } catch (e: any) {
                    setVerifyError(
                      e?.shortMessage || e?.message || "Ошибка подтверждения"
                    );
                  }
                  setVerifyLoading(false);
                }}
              >
                {verifyLoading
                  ? "Подтверждение..."
                  : "Подтвердить пользователя"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
