import { useEffect, useState } from "react";
import { publicClient } from "../blockchain/client";
import { decryptData } from "../utils/crypto";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [user, setUser] = useState<{ name: string; address: string } | null>(
    null
  );
  const [balance, setBalance] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Получаем зашифрованные данные из localStorage
    const encrypted = localStorage.getItem("goodvibe_userdata");
    const pin = localStorage.getItem("goodvibe_pin");
    if (!encrypted || !pin) {
      setError("Нет данных пользователя или пин-кода");
      return;
    }
    (async () => {
      try {
        const decrypted = await decryptData(encrypted, pin);
        const data = JSON.parse(decrypted);
        setUser({ name: data.name, address: data.address });
        // Получаем баланс
        const bal = await publicClient.getBalance({ address: data.address });
        const formatted =
          (Number(bal) / 1e18).toFixed(4) +
          " " +
          (publicClient.chain.nativeCurrency?.symbol || "GVT");
        setBalance(formatted);
      } catch (e) {
        setError("Ошибка расшифровки или получения баланса");
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
    // Можно также очищать goodvibe_userdata, goodvibe_session_id и др. если нужно
    navigate("/");
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
