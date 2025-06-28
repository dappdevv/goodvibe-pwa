import React, { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

/**
 * AccountPanel — компонент для управления API-ключом Suno API и отображения баланса.
 * Позволяет ввести, сохранить, удалить ключ и обновить баланс.
 * Все данные хранятся только в localStorage/sessionStorage.
 */
type AccountPanelProps = {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  balance?: number;
  onRefreshBalance: () => void;
  loading: boolean;
  error?: string;
};

const AccountPanel: React.FC<AccountPanelProps> = ({
  apiKey,
  onApiKeyChange,
  balance,
  onRefreshBalance,
  loading,
  error,
}) => {
  // Локальное состояние для ввода ключа
  const [inputValue, setInputValue] = useState(apiKey);

  // Обработчик изменения поля ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Обработчик сохранения ключа
  const handleSave = () => {
    onApiKeyChange(inputValue.trim());
  };

  // Обработчик удаления ключа
  const handleDelete = () => {
    setInputValue("");
    onApiKeyChange("");
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 mt-6 flex flex-col gap-4">
      <h2 className="text-xl font-semibold mb-2">Suno API Key</h2>
      {/* Поле для ввода API-ключа */}
      <Input
        type="password"
        placeholder="Введите ваш Suno API Key"
        value={inputValue}
        onChange={handleInputChange}
        aria-label="Suno API Key"
        className="mb-2"
        tabIndex={0}
      />
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={loading || !inputValue}
          aria-label="Сохранить ключ"
        >
          Сохранить
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          disabled={loading || !apiKey}
          aria-label="Удалить ключ"
        >
          Удалить
        </Button>
        <Button
          onClick={onRefreshBalance}
          variant="secondary"
          disabled={loading || !apiKey}
          aria-label="Обновить баланс"
        >
          Обновить баланс
        </Button>
      </div>
      {/* Отображение баланса */}
      <div className="text-base mt-2">
        Баланс:{" "}
        {loading ? "Загрузка..." : balance !== undefined ? balance : "—"}
      </div>
      {/* Блок ошибок */}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </Card>
  );
};

export default AccountPanel;
