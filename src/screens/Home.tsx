import { useEffect, useState, useRef } from "react";
import { publicClient } from "../blockchain/client";
import { decryptData, encryptData } from "../utils/crypto";
import { useNavigate } from "react-router-dom";
import goodVibeLogo from "../assets/good-vibe-logo.png";

const IPFS_ADD = import.meta.env.VITE_GOODVIBE_IPFS_ENDPOINT + "add";
const IPFS_CAT = import.meta.env.VITE_GOODVIBE_IPFS_ENDPOINT + "cat/";

export default function Home() {
  const [user, setUser] = useState<{
    name: string;
    address: string;
    avatarHash?: string;
  } | null>(null);
  const [balance, setBalance] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(goodVibeLogo);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const encrypted = localStorage.getItem("goodvibe_userdata");
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
          setLoadingAvatar(true);
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
              const blob = await res.blob();
              setAvatarUrl(URL.createObjectURL(blob));
            } else {
              console.error("Ошибка получения аватара:", await res.text());
            }
          } catch (err) {
            console.error("Ошибка загрузки аватара с IPFS:", err);
          }
          setLoadingAvatar(false);
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
      let endpoint = import.meta.env.VITE_GOODVIBE_IPFS_ENDPOINT + "add";
      let fetchOptions: RequestInit = { method: "POST", body: formData };
      try {
        const url = new URL(endpoint);
        if (url.username && url.password) {
          endpoint = endpoint.replace(`${url.username}:${url.password}@`, "");
          fetchOptions.headers = {
            ...fetchOptions.headers,
            Authorization: "Basic " + btoa(`${url.username}:${url.password}`),
          };
        }
      } catch (parseErr) {
        console.error("Ошибка парсинга endpoint:", parseErr);
      }
      const res = await fetch(endpoint, fetchOptions);
      if (!res.ok) {
        const text = await res.text();
        console.error("Ошибка ответа IPFS:", res.status, text);
        alert("Ошибка загрузки аватара: " + text);
        setLoadingAvatar(false);
        return;
      }
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Ошибка парсинга JSON ответа IPFS:", jsonErr);
        alert("Ошибка загрузки аватара: некорректный ответ IPFS");
        setLoadingAvatar(false);
        return;
      }
      if (data.Hash) {
        const encrypted = localStorage.getItem("goodvibe_userdata");
        const pin = localStorage.getItem("goodvibe_pin");
        if (encrypted && pin) {
          const decrypted = await decryptData(encrypted, pin);
          const userData = JSON.parse(decrypted);
          userData.avatarHash = data.Hash;
          const newEnc = await encryptData(JSON.stringify(userData), pin);
          localStorage.setItem("goodvibe_userdata", newEnc);
          setUser({ ...userData });
          setAvatarUrl(URL.createObjectURL(file));
        }
      } else {
        console.error("IPFS ответ не содержит Hash:", data);
        alert("Ошибка загрузки аватара: IPFS не вернул hash");
      }
    } catch (err) {
      console.error("Ошибка загрузки аватара:", err);
      alert(
        "Ошибка загрузки аватара: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
    setLoadingAvatar(false);
  };

  if (error) {
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: 40 }}>
        {error}
      </div>
    );
  }
  if (!user) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>Загрузка...</div>
    );
  }
  return (
    <div
      style={{
        maxWidth: 400,
        margin: "60px auto",
        padding: 24,
        borderRadius: 12,
        boxShadow: "0 2px 12px #eee",
        background: "#fff",
      }}
    >
      <h2 style={{ color: "#222" }}>Главная</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 96,
            height: 96,
            marginBottom: 8,
          }}
        >
          <img
            src={avatarUrl}
            alt="avatar"
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #e6e6ff",
            }}
          />
          {loadingAvatar && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 96,
                height: 96,
                background: "rgba(255,255,255,0.7)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "#6c47ff",
              }}
            >
              Загрузка...
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
        <button
          onClick={handleAvatarClick}
          style={{
            background: "#e6e6ff",
            color: "#222",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            padding: "6px 18px",
            cursor: "pointer",
          }}
        >
          Загрузить аватарку
        </button>
      </div>
      <p>
        <b>Сессия:</b> {user.name}
      </p>
      <p style={{ display: "flex", alignItems: "center" }}>
        <b>Адрес:</b>
        <span style={{ fontFamily: "monospace", marginLeft: 8 }}>
          {user.address}
        </span>
        <button
          onClick={handleCopy}
          title="Скопировать адрес"
          style={{
            marginLeft: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
        </button>
        {copied && (
          <span style={{ color: "#6c47ff", fontSize: 12, marginLeft: 6 }}>
            Скопировано!
          </span>
        )}
      </p>
      <p>
        <b>Баланс:</b> {balance}
      </p>
      <button
        onClick={handleLogout}
        style={{
          width: "100%",
          marginTop: 32,
          padding: 12,
          background: "#eee",
          color: "#222",
          border: "none",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Завершить сеанс
      </button>
    </div>
  );
}
