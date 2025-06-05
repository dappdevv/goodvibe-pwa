import React, { useEffect, useRef, useState } from "react";
import goodVibeLogo from "../assets/good-vibe-logo.png";
import { decryptData, encryptData } from "../utils/crypto";
import { Button } from "@/components/ui/button";

const IPFS_CAT = import.meta.env.VITE_IPFS_ENDPOINT + "cat/";

export default function Profile() {
  const [user, setUser] = useState<{
    name: string;
    address: string;
    avatarHash?: string;
  } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(goodVibeLogo);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      } catch {}
    })();
  }, []);

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
        </div>
      )}
    </div>
  );
}
