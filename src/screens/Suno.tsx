import React, { useEffect, useState } from "react";
import AccountPanel from "../components/AccountPanel";
import MusicGenerationForm from "../components/MusicGenerationForm";
// import MusicGenerationForm from "../components/MusicGenerationForm"; // будет добавлен позже

/**
 * SunoScreen — основной экран для работы с Suno API.
 * Здесь размещаются управление API-ключом, балансом и формы генерации музыки и других функций.
 */
const SUNO_API_KEY_STORAGE = "suno_api_key";

// Получаем ключ из переменной окружения VITE_SUNO_API_KEY
const ENV_SUNO_API_KEY = import.meta.env.VITE_SUNO_API_KEY as
  | string
  | undefined;

const SunoScreen: React.FC = () => {
  // Состояние для API-ключа
  const [apiKey, setApiKey] = useState<string>("");
  // Состояние для баланса
  const [balance, setBalance] = useState<number | undefined>(undefined);
  // Состояние загрузки
  const [loading, setLoading] = useState(false);
  // Состояние ошибки
  const [error, setError] = useState<string | undefined>(undefined);

  // Загрузка ключа из localStorage или из ENV при монтировании
  useEffect(() => {
    const storedKey = localStorage.getItem(SUNO_API_KEY_STORAGE);
    if (storedKey && storedKey.length > 0) {
      setApiKey(storedKey);
    } else if (ENV_SUNO_API_KEY) {
      setApiKey(ENV_SUNO_API_KEY);
    }
  }, []);

  // Сохранение ключа в localStorage
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem(SUNO_API_KEY_STORAGE, key);
    setBalance(undefined); // сбрасываем баланс при смене ключа
  };

  // Заглушка для обновления баланса (реализовать реальный запрос позже)
  const handleRefreshBalance = async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(undefined);
    try {
      // TODO: сделать реальный запрос к Suno API для получения баланса
      // Пример:
      // const res = await fetch(...)
      // setBalance(res.balance)
      setTimeout(() => {
        setBalance(123); // временно
        setLoading(false);
      }, 1000);
    } catch (e) {
      setError("Ошибка при получении баланса");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-2">
      <h1 className="text-2xl font-bold mb-6">Suno API</h1>
      {/* Панель управления API-ключом и балансом */}
      <AccountPanel
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        balance={balance}
        onRefreshBalance={handleRefreshBalance}
        loading={loading}
        error={error}
      />
      {/* Здесь будет форма генерации музыки и другие функции Suno API */}
      <MusicGenerationForm apiKey={apiKey} />
    </div>
  );
};

export default SunoScreen;
