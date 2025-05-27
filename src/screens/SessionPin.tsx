import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { decryptData } from "../utils/crypto";

export default function SessionPin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      <h2 style={{ textAlign: "center", color: "#222" }}>Введите пин-код</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ margin: "16px 0" }}>
          <label>Пин-код (6+ цифр)</label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            minLength={6}
            maxLength={12}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            background: "#e6e6ff",
            color: "#222",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          Войти
        </button>
      </form>
    </div>
  );
}
