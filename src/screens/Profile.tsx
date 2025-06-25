import React, { useEffect, useRef, useState } from "react";
import goodVibeLogo from "../assets/good-vibe-logo.png";
import { decryptData, encryptData } from "../utils/crypto";
import { Button } from "@/components/ui/button";
import GoodVibeAbi from "../blockchain/abi/GoodVibe.json";
import GoodVibeAddress from "../blockchain/addresses/GoodVibe.json";
import { publicClient } from "../blockchain/client";
import { type Address } from "viem";
import { createWalletClientFromPrivateKey } from "../blockchain/client";
import { keccak256, toHex } from "viem";

const IPFS_CAT = import.meta.env.VITE_IPFS_ENDPOINT + "cat/";

// Маппинг статусов пользователя (индекс типа string для TS)
const UserStatusLabels: { [key: string]: string } = {
  "0": "Не зарегистрирован",
  "1": "Ожидает подтверждения",
  "2": "Активный",
  "3": "Неактивный",
  "4": "Приостановлен",
  "5": "Заблокирован",
};

// Лимит приглашений
const MAX_ACTIVE_INVITES = 6;

export default function Profile() {
  const [user, setUser] = useState<{
    name: string;
    address: string;
    avatarHash?: string;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(goodVibeLogo);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Данные из GoodVibe
  const [daoProfile, setDaoProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<string[]>([]);

  // Добавляю хуки состояния для приглашения
  const [inviteAddress, setInviteAddress] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Получение количества активных приглашений
  const [activeInvitesCount, setActiveInvitesCount] = useState<number>(0);

  // Хуки состояния для регистрации
  const [registerName, setRegisterName] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  // Хуки состояния для верификации
  const [verificationFullName, setVerificationFullName] = useState("");
  const [verificationKey, setVerificationKey] = useState("");
  const [verificationVerifier, setVerificationVerifier] = useState("");
  const [verificationPhoto, setVerificationPhoto] = useState<File | null>(null);
  const [verificationPhotoPreview, setVerificationPhotoPreview] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState("");

  // Проверка наличия активной верификации (можно добавить отдельный useEffect, если нужно)
  const [hasActiveVerification, setHasActiveVerification] = useState(false);

  // Хук состояния для истории верификаций
  const [verifications, setVerifications] = useState<any[]>([]);
  const [activeVerification, setActiveVerification] = useState<any | null>(
    null
  );

  // Хуки для селфи-модалки
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const sessionId = localStorage.getItem("goodvibe_session_id");
    const encrypted = sessionId
      ? localStorage.getItem(`goodvibe_userdata_${sessionId}`)
      : null;
    const pin = localStorage.getItem("goodvibe_pin");
    if (!encrypted || !pin) return;
    (async () => {
      try {
        const decrypted = await decryptData(encrypted, pin);
        const data = JSON.parse(decrypted);
        setUser(data);
        if (data.avatarHash) {
          setLoadingAvatar(true);
          try {
            let endpoint = IPFS_CAT + data.avatarHash;
            let fetchOptions: RequestInit = { method: "POST" };
            if (import.meta.env.VITE_IPFS_ENDPOINT_AUTHORIZATION) {
              fetchOptions.headers = {
                ...(fetchOptions.headers || {}),
                Authorization: import.meta.env.VITE_IPFS_ENDPOINT_AUTHORIZATION,
              };
            }
            const res = await fetch(endpoint, fetchOptions);
            if (res.ok) {
              const blob = await res.blob();
              setAvatarUrl(URL.createObjectURL(blob));
            }
          } catch {}
          setLoadingAvatar(false);
        }

        // Получаем профиль пользователя из GoodVibe
        if (data.address) {
          try {
            const profile = await publicClient.readContract({
              address: GoodVibeAddress.address as Address,
              abi: GoodVibeAbi,
              functionName: "users",
              args: [data.address as Address],
            });
            setDaoProfile(profile);
            // Получаем рефералов первого уровня
            const refs = await publicClient.readContract({
              address: GoodVibeAddress.address as Address,
              abi: GoodVibeAbi,
              functionName: "getFirstLevelReferrals",
              args: [data.address as Address],
            });
            setReferrals(refs as string[]);
          } catch {}
        }
      } catch {}
    })();
  }, []);

  // Получение количества активных приглашений
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const count = await publicClient.readContract({
          address: GoodVibeAddress.address as Address,
          abi: GoodVibeAbi,
          functionName: "getActiveInvitesCount",
          args: [user.address as Address],
        });
        setActiveInvitesCount(Number(count));
      } catch {}
    })();
  }, [user, inviteSuccess]);

  // useEffect для автообновления профиля после успешной регистрации
  useEffect(() => {
    if (!registerSuccess || !user) return;
    const timeout = setTimeout(async () => {
      try {
        const profile = await publicClient.readContract({
          address: GoodVibeAddress.address as Address,
          abi: GoodVibeAbi,
          functionName: "users",
          args: [user.address as Address],
        });
        setDaoProfile(profile);
        // Обновляем рефералов
        const refs = await publicClient.readContract({
          address: GoodVibeAddress.address as Address,
          abi: GoodVibeAbi,
          functionName: "getFirstLevelReferrals",
          args: [user.address as Address],
        });
        setReferrals(refs as string[]);
      } catch {}
    }, 10000);
    return () => clearTimeout(timeout);
  }, [registerSuccess, user]);

  // Проверка наличия активной верификации
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const arr = (await publicClient.readContract({
          address: GoodVibeAddress.address as Address,
          abi: GoodVibeAbi,
          functionName: "getUserVerifications",
          args: [user.address as Address],
        })) as any[];
        // Если есть хотя бы одна верификация со статусом Pending (1), считаем активной
        setHasActiveVerification(
          Array.isArray(arr) && arr.some((v: any) => Number(v.status) === 1)
        );
      } catch {
        setHasActiveVerification(false);
      }
    })();
  }, [user, verificationSuccess]);

  // Получение истории верификаций
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const arr = (await publicClient.readContract({
          address: GoodVibeAddress.address as Address,
          abi: GoodVibeAbi,
          functionName: "getUserVerifications",
          args: [user.address as Address],
        })) as any[];
        setVerifications(arr);
        // Определяем активную (Pending)
        const active = Array.isArray(arr)
          ? arr.find((v: any) => Number(v.status) === 1)
          : null;
        setActiveVerification(active || null);
      } catch {
        setVerifications([]);
        setActiveVerification(null);
      }
    })();
  }, [user, verificationSuccess]);

  // Управление потоком камеры
  useEffect(() => {
    if (!showCamera) return;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        // Запрашиваем камеру с попыткой включить torch (вспышку)
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: "user",
            width: { ideal: 240 },
            height: { ideal: 180 },
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Включаем torch, если поддерживается
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.getCapabilities) {
          const caps = videoTrack.getCapabilities() as any; // TS: расширяем тип для torch
          if ((caps as any).torch) {
            // @ts-expect-error: torch не в типе, но поддерживается в некоторых браузерах
            await videoTrack.applyConstraints({ advanced: [{ torch: true }] });
          }
        }
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
  }, [showCamera]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLoadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("path", file);
      let endpoint = import.meta.env.VITE_IPFS_ENDPOINT + "add";
      let fetchOptions: RequestInit = { method: "POST", body: formData };
      if (import.meta.env.VITE_IPFS_ENDPOINT_AUTHORIZATION) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: import.meta.env.VITE_IPFS_ENDPOINT_AUTHORIZATION,
        };
      }
      const res = await fetch(endpoint, fetchOptions);
      if (!res.ok) {
        setLoadingAvatar(false);
        return;
      }
      let data;
      try {
        data = await res.json();
      } catch {
        setLoadingAvatar(false);
        return;
      }
      if (data.Hash) {
        const sessionId = localStorage.getItem("goodvibe_session_id");
        if (sessionId) {
          const encrypted = localStorage.getItem(
            `goodvibe_userdata_${sessionId}`
          );
          const pin = localStorage.getItem("goodvibe_pin");
          if (encrypted && pin) {
            const decrypted = await decryptData(encrypted, pin);
            const userData = JSON.parse(decrypted);
            userData.avatarHash = data.Hash;
            const newEnc = await encryptData(JSON.stringify(userData), pin);
            localStorage.setItem(`goodvibe_userdata_${sessionId}`, newEnc);
            setUser({ ...userData });
            setAvatarUrl(URL.createObjectURL(file));
          }
        }
      }
    } catch {}
    setLoadingAvatar(false);
  };

  // Обработчик создания приглашения
  const handleCreateInvite = async () => {
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      if (
        !inviteAddress ||
        !inviteAddress.startsWith("0x") ||
        inviteAddress.length !== 42
      ) {
        setInviteError("Введите корректный адрес (0x...)");
        setInviteLoading(false);
        return;
      }
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
      await walletClient.writeContract({
        address: GoodVibeAddress.address as Address,
        abi: GoodVibeAbi,
        functionName: "createInvite",
        args: [inviteAddress],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setInviteSuccess("Приглашение успешно создано!");
      setInviteAddress("");
    } catch (e: any) {
      setInviteError(
        e?.shortMessage || e?.message || "Ошибка создания приглашения"
      );
    }
    setInviteLoading(false);
  };

  // Обработчик регистрации
  const handleRegister = async () => {
    setRegisterLoading(true);
    setRegisterError("");
    setRegisterSuccess("");
    try {
      if (
        !registerName ||
        registerName.length < 3 ||
        registerName.length > 42
      ) {
        setRegisterError("Имя должно быть от 3 до 42 символов");
        setRegisterLoading(false);
        return;
      }
      if (/[^a-zA-Zа-яА-Я0-9]/.test(registerName)) {
        setRegisterError("Только буквы и цифры, без пробелов и спецсимволов");
        setRegisterLoading(false);
        return;
      }
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
      await walletClient.writeContract({
        address: GoodVibeAddress.address as Address,
        abi: GoodVibeAbi,
        functionName: "registerUser",
        args: [registerName],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setRegisterSuccess(
        "Регистрация отправлена! Обновите страницу через 10-20 секунд."
      );
      setRegisterName("");
    } catch (e: any) {
      setRegisterError(e?.shortMessage || e?.message || "Ошибка регистрации");
    }
    setRegisterLoading(false);
  };

  // Обработчик прохождения верификации
  const handleVerification = async () => {
    setVerificationLoading(true);
    setVerificationError("");
    setVerificationSuccess("");
    try {
      if (!user) {
        setVerificationError("Нет данных пользователя");
        setVerificationLoading(false);
        return;
      }
      if (!verificationFullName || !verificationKey || !verificationPhoto) {
        setVerificationError("Заполните все поля и загрузите селфи");
        setVerificationLoading(false);
        return;
      }
      // Зашифровать ФИО
      const encryptedFullName = await encryptData(
        verificationFullName,
        verificationKey
      );
      // Зашифровать фото (base64)
      const photoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(verificationPhoto);
      });
      const encryptedPhoto = await encryptData(photoBase64, verificationKey);
      // Загрузить зашифрованное фото на IPFS
      const formData = new FormData();
      const blob = new Blob([encryptedPhoto], { type: "text/plain" });
      formData.append("path", blob, "photo.enc");
      let endpoint = import.meta.env.VITE_IPFS_ENDPOINT + "add";
      let fetchOptions: RequestInit = { method: "POST", body: formData };
      if (import.meta.env.VITE_IPFS_ENDPOINT_AUTHORIZATION) {
        fetchOptions.headers = {
          ...(fetchOptions.headers || {}),
          Authorization: import.meta.env.VITE_IPFS_ENDPOINT_AUTHORIZATION,
        };
      }
      const res = await fetch(endpoint, fetchOptions);
      if (!res.ok) throw new Error("Ошибка загрузки фото на IPFS");
      const data = await res.json();
      if (!data.Hash) throw new Error("IPFS не вернул CID");
      const photoCID = data.Hash;
      // Хэш верификации
      const verificationHash = keccak256(toHex(verificationFullName));
      // Верификатор (по умолчанию свой адрес)
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
      // Получаем walletClient
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
      // Вызов контракта
      await walletClient.writeContract({
        address: GoodVibeAddress.address as Address,
        abi: GoodVibeAbi,
        functionName: "createVerification",
        args: [verifier, encryptedFullName, photoCID, verificationHash],
        chain: walletClient.chain,
        account: walletClient.account ?? null,
      });
      setVerificationSuccess("Верификация отправлена!");
      setVerificationFullName("");
      setVerificationKey("");
      setVerificationPhoto(null);
      setVerificationPhotoPreview("");
      setVerificationVerifier("");
    } catch (e: any) {
      setVerificationError(e?.message || "Ошибка отправки верификации");
    }
    setVerificationLoading(false);
  };

  // Маппинг статусов верификации
  const VerificationStatusLabels: Record<string, string> = {
    "0": "Нет",
    "1": "Ожидание",
    "2": "Подтверждена",
    "3": "Отклонена",
    "4": "Раскрыта",
    "5": "Приостановлена",
    "6": "Верифицирована",
  };

  return (
    <div className="container mx-auto py-8 px-2 sm:px-4">
      <h1 className="text-2xl font-bold mb-4">Профиль</h1>
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 mb-2">
          <img
            src={avatarUrl}
            alt="avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-primary"
          />
          {loadingAvatar && (
            <div className="absolute inset-0 bg-white/70 dark:bg-black/40 rounded-full flex items-center justify-center text-primary text-lg">
              Загрузка...
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <Button size="sm" variant="secondary" onClick={handleAvatarClick}>
          Загрузить аватарку
        </Button>
      </div>
      {user && (
        <div className="mb-2">
          <b>Имя:</b> {user.name}
          <br />
          <b>Адрес:</b> <span className="font-mono">{user.address}</span>
          {daoProfile && (
            <>
              <br />
              <b>Статус:</b> {UserStatusLabels[String(Number(daoProfile[2]))]}
              <br />
              <b>Активность:</b> {daoProfile[3]}
              <br />
              <b>Уровень:</b> {daoProfile[4]}
              <br />
              <b>Рейтинг:</b> {daoProfile[7]}
              <br />
              <b>Верификаций:</b> {daoProfile[8]}
              <br />
              <b>Пригласивший:</b> {daoProfile[5]}
              <br />
              <b>Рефералы 1 уровня:</b>
              <ul className="list-disc ml-6">
                {referrals.length === 0 && <li>Нет</li>}
                {referrals.map((addr) => (
                  <li key={addr} className="break-all">
                    {addr}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {daoProfile && Number(daoProfile[2]) === 2 && (
        <div className="w-full max-w-md mx-auto mt-6 mb-6 p-4 bg-muted rounded-lg border">
          <h2 className="text-lg font-bold mb-2">Создать приглашение</h2>
          {inviteError && (
            <div className="text-red-500 mb-2">{inviteError}</div>
          )}
          {inviteSuccess && (
            <div className="text-green-600 mb-2">{inviteSuccess}</div>
          )}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="input input-bordered"
              placeholder="Адрес пользователя (0x...)"
              value={inviteAddress}
              onChange={(e) => setInviteAddress(e.target.value)}
              aria-label="Адрес пользователя"
              tabIndex={0}
            />
            <div className="mb-2 text-sm text-muted-foreground">
              Активных приглашений: {activeInvitesCount} из {MAX_ACTIVE_INVITES}
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleCreateInvite}
              disabled={
                inviteLoading ||
                !inviteAddress ||
                activeInvitesCount >= MAX_ACTIVE_INVITES
              }
              aria-label="Создать приглашение"
              tabIndex={0}
            >
              {inviteLoading ? "Создание..." : "Пригласить"}
            </Button>
          </div>
        </div>
      )}
      {daoProfile && Number(daoProfile[2]) === 0 && (
        <div className="w-full max-w-md mx-auto mt-6 mb-6 p-4 bg-muted rounded-lg border">
          <h2 className="text-lg font-bold mb-2">
            Регистрация в DAO Good Vibe
          </h2>
          {registerError && (
            <div className="text-red-500 mb-2">{registerError}</div>
          )}
          {registerSuccess && (
            <div className="text-green-600 mb-2">{registerSuccess}</div>
          )}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="input input-bordered"
              placeholder="Имя пользователя"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              aria-label="Имя пользователя"
              tabIndex={0}
              minLength={3}
              maxLength={42}
            />
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleRegister}
              disabled={registerLoading || !registerName}
              aria-label="Зарегистрироваться"
              tabIndex={0}
            >
              {registerLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </div>
        </div>
      )}
      {daoProfile && Number(daoProfile[2]) === 2 && !hasActiveVerification && (
        <div className="w-full max-w-md mx-auto mt-6 mb-6 p-4 bg-muted rounded-lg border">
          <h2 className="text-lg font-bold mb-2">Пройти верификацию</h2>
          {verificationError && (
            <div className="text-red-500 mb-2">{verificationError}</div>
          )}
          {verificationSuccess && (
            <div className="text-green-600 mb-2">{verificationSuccess}</div>
          )}
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="input input-bordered"
              placeholder="Фамилия Имя Отчество"
              value={verificationFullName}
              onChange={(e) => setVerificationFullName(e.target.value)}
              aria-label="ФИО"
              tabIndex={0}
            />
            <input
              type="password"
              className="input input-bordered"
              placeholder="Ключ верификации (пароль)"
              value={verificationKey}
              onChange={(e) => setVerificationKey(e.target.value)}
              aria-label="Ключ верификации"
              tabIndex={0}
            />
            <input
              type="text"
              className="input input-bordered"
              placeholder="Адрес верификатора (0x...)"
              value={verificationVerifier}
              onChange={(e) => setVerificationVerifier(e.target.value)}
              aria-label="Адрес верификатора"
              tabIndex={0}
            />
            {verificationPhotoPreview && (
              <img
                src={verificationPhotoPreview}
                alt="Селфи"
                className="w-32 h-32 rounded-full object-cover mb-2"
              />
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowCamera(true)}
              aria-label="Сделать селфи"
              tabIndex={0}
            >
              Сделать селфи
            </Button>
          </div>
        </div>
      )}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 px-2 sm:px-0">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 w-full max-w-xs sm:max-w-sm shadow-lg flex flex-col items-center">
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
            <div className="flex gap-2 mt-2 w-full">
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
                        new File([blob], "selfie.png", { type: "image/png" })
                      );
                      setVerificationPhotoPreview(URL.createObjectURL(blob));
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
        </div>
      )}
      {activeVerification && (
        <div className="w-full max-w-md mx-auto mt-6 mb-6 p-4 bg-muted rounded-lg border">
          <h2 className="text-lg font-bold mb-2">Статус верификации</h2>
          <div className="mb-2">
            <b>Статус:</b>{" "}
            {VerificationStatusLabels[
              String(Number(activeVerification.status))
            ] || activeVerification.status}
          </div>
          <div className="mb-2">
            <b>Верификатор:</b> {activeVerification.verifier}
          </div>
          <div className="mb-2">
            <b>Комментарий:</b> {activeVerification.comment || "-"}
          </div>
          <div className="mb-2">
            <b>Дата создания:</b>{" "}
            {activeVerification.created
              ? new Date(
                  Number(activeVerification.created) * 1000
                ).toLocaleString()
              : "-"}
          </div>
        </div>
      )}
      {verifications.length > 0 && (
        <div className="w-full max-w-md mx-auto mt-6 mb-6 p-4 bg-muted rounded-lg border">
          <h2 className="text-lg font-bold mb-2">История верификаций</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1">Дата</th>
                  <th className="px-2 py-1">Статус</th>
                  <th className="px-2 py-1">Верификатор</th>
                  <th className="px-2 py-1">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      {v.created
                        ? new Date(Number(v.created) * 1000).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-2 py-1">
                      {VerificationStatusLabels[String(Number(v.status))] ||
                        v.status}
                    </td>
                    <td className="px-2 py-1">{v.verifier}</td>
                    <td className="px-2 py-1">{v.comment || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
