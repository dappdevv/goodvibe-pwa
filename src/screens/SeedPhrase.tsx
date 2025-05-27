import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateMnemonic, mnemonicToAccount, english } from "viem/accounts";
import { encryptData } from "../utils/crypto";

export default function SeedPhrase() {
  const navigate = useNavigate();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Генерируем seed-фразу только при первом рендере
    const m = generateMnemonic(english);
    setMnemonic(m.split(" "));
    const account = mnemonicToAccount(m);
    // Собираем все данные пользователя
    const name = localStorage.getItem("goodvibe_name") || "";
    const lang = localStorage.getItem("goodvibe_lang") || "ru";
    const pin = localStorage.getItem("goodvibe_pin") || "";
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
    // Шифруем и сохраняем
    if (pin) {
      encryptData(JSON.stringify(userData), pin).then((enc) => {
        localStorage.setItem(`goodvibe_userdata_${account.address}`, enc);
        // Добавляем сессию в список
        const sessionsRaw = localStorage.getItem("goodvibe_sessions");
        let sessions: { id: string; name: string; created: string }[] = [];
        try {
          if (sessionsRaw) sessions = JSON.parse(sessionsRaw);
        } catch {}
        // id — адрес кошелька, name — имя, created — текущая дата
        if (!sessions.find((s) => s.id === account.address)) {
          sessions.push({
            id: account.address,
            name,
            created: new Date().toISOString(),
          });
          localStorage.setItem("goodvibe_sessions", JSON.stringify(sessions));
        }
      });
    }
  }, []);

  const handleNext = () => {
    if (step < mnemonic.length - 1) {
      setStep(step + 1);
    } else {
      navigate("/home");
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
      <h2 style={{ color: "#222" }}>Seed-фраза</h2>
      {mnemonic.length > 0 ? (
        <>
          <p style={{ fontSize: 18, textAlign: "center", margin: "32px 0" }}>
            <span
              style={{
                display: "inline-block",
                padding: "16px 32px",
                background: "#f7f7ff",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: 2,
                color: "#6c47ff",
              }}
            >
              {mnemonic[step]}
            </span>
          </p>
          <p style={{ textAlign: "center", color: "#888" }}>
            {step + 1} / {mnemonic.length}
          </p>
          <button
            onClick={handleNext}
            style={{
              width: "100%",
              padding: 12,
              background: "#e6e6ff",
              color: "#222",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 18,
              marginTop: 24,
            }}
          >
            {step < mnemonic.length - 1 ? "Далее" : "Готово"}
          </button>
        </>
      ) : (
        <p>Генерация seed-фразы...</p>
      )}
    </div>
  );
}
