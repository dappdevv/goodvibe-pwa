import React, { useState, useEffect } from "react";

// Компонент приветственной страницы
const WelcomePage: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
  // Состояние чекбокса
  const [dontShow, setDontShow] = useState(false);
  // Состояние для beforeinstallprompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  // Состояние для блокировки кнопки установки
  const [installing, setInstalling] = useState(false);

  // Эффект для отслеживания события beforeinstallprompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Обработчик изменения чекбокса
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDontShow(e.target.checked);
  };

  // Обработчик кнопки 'Продолжить'
  const handleContinue = () => {
    // Если пользователь не хочет больше видеть приветствие — сохраняем в localStorage
    if (dontShow) {
      localStorage.setItem("hideWelcome", "true");
    }
    onContinue();
  };

  // Обработчик кнопки 'Установить приложение'
  const handleInstall = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstalling(false);
    setInstallPrompt(null); // Скрываем кнопку после попытки установки
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70"
      style={{
        backgroundImage: "url(/icons/остров-сердце-облако.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-modal="true"
      role="dialog"
      tabIndex={0}
    >
      {/* Затемнение для читаемости текста */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true"></div>
      <div className="relative z-10 flex flex-col gap-y-2 items-center max-w-md p-8 rounded-xl bg-none text-white shadow-xl">
        {/* Презентационный текст */}
        <h1 className="mt-16 text-9xl md:text-3xl font-bold text-center mb-4 pattaya-regular">
          Good Vibe
        </h1>
        <p className="text-2xl text-center mt-10 mb-60 pb-60 text-sky-100 pattaya-regular">
          Good Vibe - это когда атмосфера хорошая, вода прозрачная, друзья
          весёлые, родители здоровые, дети счастливые, а ты любишь жизнь.
        </p>

        {/* Кнопка 'Продолжить' */}
        <button
          onClick={handleContinue}
          className="mt-6 px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Продолжить"
        >
          Продолжить
        </button>
        {/* Кнопка 'Установить приложение' */}
        {installPrompt && (
          <button
            onClick={handleInstall}
            className="mt-2 px-6 py-2 rounded-lg bg-gray-800 text-white font-semibold shadow-xl focus:outline-none disabled:opacity-50"
            aria-label="Установить приложение"
            disabled={installing}
          >
            {installing ? "Установка..." : "Установить приложение"}
          </button>
        )}
        {/* Чекбокс 'Больше не показывать' */}
        <label className="flex items-center mb-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={handleCheckboxChange}
            className="mr-2 accent-blue-500"
            aria-label="Больше не показывать"
          />
          <span className="text-gray-700">Больше не показывать</span>
        </label>
      </div>
    </div>
  );
};

export default WelcomePage;
