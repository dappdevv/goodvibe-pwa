import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

export default function Welcome() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [lang, setLang] = useState("ru");
  const [sessions, setSessions] = useState<
    { id: string; name: string; created: string }[]
  >([]);
  const navigate = useNavigate();

  useEffect(() => {
    setSessions(getSessions());
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
      <h2 style={{ textAlign: "center", color: "#222" }}>
        {lang === "ru"
          ? "Добро пожаловать в GOOD VIBE DAO"
          : "Welcome to GOOD VIBE DAO"}
      </h2>
      {sessions.length > 0 && (
        <div style={{ margin: "24px 0" }}>
          <h3 style={{ color: "#444", fontSize: 18, marginBottom: 8 }}>
            {lang === "ru" ? "Сохранённые сессии" : "Saved sessions"}
          </h3>
          <ul style={{ padding: 0, listStyle: "none" }}>
            {sessions.map((s) => (
              <li
                key={s.id}
                style={{
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#f7f7ff",
                  borderRadius: 8,
                  padding: "8px 12px",
                }}
              >
                <span>
                  <b>{s.name}</b>
                  <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>
                    {new Date(s.created).toLocaleString(lang)}
                  </span>
                </span>
                <button
                  type="button"
                  style={{
                    background: "#e6e6ff",
                    color: "#222",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 16px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSessionLogin(s)}
                >
                  {lang === "ru" ? "Войти" : "Login"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ margin: "16px 0" }}>
          <label>{lang === "ru" ? "Имя" : "Name"}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ margin: "16px 0" }}>
          <label>
            {lang === "ru" ? "Пин-код (6+ цифр)" : "PIN code (6+ digits)"}
          </label>
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
        <div style={{ margin: "16px 0" }}>
          <label>{lang === "ru" ? "Язык" : "Language"}</label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
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
          {lang === "ru" ? "Далее" : "Next"}
        </button>
      </form>
    </div>
  );
}
