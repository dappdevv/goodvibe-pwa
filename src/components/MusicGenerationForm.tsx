import React, { useState, useRef } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

/**
 * MusicGenerationForm — форма для генерации музыки через Suno API.
 * Позволяет ввести промпт, выбрать параметры и получить результат (аудио, текст).
 */
type MusicGenResult = {
  trackUrl: string;
  lyrics?: string;
  trackId: string;
};

type MusicGenerationFormProps = {
  apiKey: string;
};

const POLLING_INTERVAL = 2500; // мс

// Максимальная длина prompt для non-custom режима
const PROMPT_LIMIT = 400;

const MusicGenerationForm: React.FC<MusicGenerationFormProps> = ({
  apiKey,
}) => {
  // Состояния формы
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<"V3.5" | "V4">("V4");
  const [withLyrics, setWithLyrics] = useState(true);
  const [duration, setDuration] = useState(60);
  // Состояния результата и загрузки
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<MusicGenResult | undefined>(undefined);
  const pollingRef = useRef<any>(null);
  const [status, setStatus] = useState<string | undefined>(undefined);

  // Состояния для WAV и вокала
  const [wavUrl, setWavUrl] = useState<string | undefined>(undefined);
  const [wavLoading, setWavLoading] = useState(false);
  const [wavError, setWavError] = useState<string | undefined>(undefined);

  const [vocalResult, setVocalResult] = useState<
    | {
        instrumentalUrl: string;
        vocalUrl: string;
        originalUrl: string;
      }
    | undefined
  >(undefined);
  const [vocalLoading, setVocalLoading] = useState(false);
  const [vocalError, setVocalError] = useState<string | undefined>(undefined);

  // Состояния для видео
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | undefined>(undefined);

  // Функция polling статуса задачи
  const pollStatus = async (taskId: string) => {
    try {
      setStatus("Ожидание результата...");
      const response = await fetch(
        `https://apibox.erweima.ai/api/v1/get-task-detail?taskId=${taskId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );
      if (!response.ok) throw new Error("Ошибка получения статуса задачи");
      const data = await response.json();
      console.log("Suno API polling response:", data); // Диагностика
      // Проверяем статус задачи
      const status = data.data?.status || data.status;
      setStatus(status);
      if (status === "completed" || status === "complete") {
        // Получаем ссылки на аудио и текст
        const audio =
          data.data?.data && Array.isArray(data.data.data)
            ? data.data.data[0]
            : data.data;
        setResult({
          trackUrl: audio?.audio_url,
          lyrics: audio?.prompt,
          trackId: audio?.id,
        });
        setLoading(false);
        setStatus(undefined);
        if (pollingRef.current !== null) {
          clearTimeout(pollingRef.current);
        }
      } else if (status === "failed" || status === "error") {
        setError(data.data?.msg || data.msg || "Ошибка генерации музыки");
        setLoading(false);
        setStatus(undefined);
        if (pollingRef.current !== null) {
          clearTimeout(pollingRef.current);
        }
      } else {
        // Продолжаем polling
        pollingRef.current = setTimeout(
          () => pollStatus(taskId),
          POLLING_INTERVAL
        );
      }
    } catch (e: any) {
      setError(e.message || "Ошибка polling статуса");
      setLoading(false);
      setStatus(undefined);
      if (pollingRef.current !== null) {
        clearTimeout(pollingRef.current);
      }
    }
  };

  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.length > PROMPT_LIMIT) {
      setError(`Prompt слишком длинный (максимум ${PROMPT_LIMIT} символов)`);
      return;
    }
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    setStatus(undefined);
    try {
      // Запрос к Suno API (создание задачи)
      const response = await fetch(
        "https://apibox.erweima.ai/api/v1/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt,
            customMode: false, // non-custom режим
            instrumental: false, // с вокалом (по умолчанию)
            callBackUrl: "https://example.com/callback", // обязательно для Suno API
            model: "V4_5", // обязательно для Suno API
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Ошибка генерации музыки");
      }
      const data = await response.json();
      console.log("Suno API response:", data); // Диагностика
      // Исправленное получение taskId
      const taskId =
        data.data?.taskId || data.data?.task_id || data.task_id || data.taskId;
      if (!taskId) {
        setError(data.msg || data.message || JSON.stringify(data));
        throw new Error("Некорректный ответ API: нет taskId");
      }
      setStatus("Ожидание результата...");
      pollingRef.current = setTimeout(
        () => pollStatus(taskId),
        POLLING_INTERVAL
      );
    } catch (e: any) {
      setError(e.message || "Ошибка генерации музыки");
      setLoading(false);
    }
  };

  // Обработчик расширения трека
  const handleExtend = async () => {
    if (!result?.trackId) return;
    setLoading(true);
    setError(undefined);
    setStatus(undefined);
    try {
      // Запрос на расширение трека
      const response = await fetch("https://apibox.erweima.ai/music/extend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          trackId: result.trackId,
          model: "V3_5", // обязательно для Suno API
          callBackUrl: "https://example.com/callback", // обязательно для Suno API
        }),
      });
      if (!response.ok) {
        throw new Error("Ошибка расширения трека");
      }
      const data = await response.json();
      const taskId = data.data?.task_id || data.task_id || data.taskId;
      if (!taskId) throw new Error("Некорректный ответ API: нет taskId");
      setStatus("Расширение трека...");
      pollingRef.current = setTimeout(
        () => pollStatus(taskId),
        POLLING_INTERVAL
      );
    } catch (e: any) {
      setError(e.message || "Ошибка расширения трека");
      setLoading(false);
    }
  };

  // Конвертация в WAV
  const handleConvertWav = async () => {
    if (!result?.trackId) return;
    setWavLoading(true);
    setWavError(undefined);
    setWavUrl(undefined);
    try {
      const response = await fetch("https://apibox.erweima.ai/music/wav", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          trackId: result.trackId,
          model: "V3_5", // обязательно для Suno API
        }),
      });
      if (!response.ok) throw new Error("Ошибка конвертации в WAV");
      const data = await response.json();
      if (!data.wavUrl) throw new Error("Некорректный ответ API: нет wavUrl");
      setWavUrl(data.wavUrl);
    } catch (e: any) {
      setWavError(e.message || "Ошибка конвертации в WAV");
    } finally {
      setWavLoading(false);
    }
  };

  // Удаление вокала
  const handleRemoveVocal = async () => {
    if (!result?.trackId) return;
    setVocalLoading(true);
    setVocalError(undefined);
    setVocalResult(undefined);
    try {
      const response = await fetch(
        "https://apibox.erweima.ai/music/vocal-remove",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            trackId: result.trackId,
            model: "V3_5", // обязательно для Suno API
          }),
        }
      );
      if (!response.ok) throw new Error("Ошибка удаления вокала");
      const data = await response.json();
      if (!data.instrumentalUrl || !data.vocalUrl || !data.originalUrl)
        throw new Error("Некорректный ответ API: нет ссылок на треки");
      setVocalResult({
        instrumentalUrl: data.instrumentalUrl,
        vocalUrl: data.vocalUrl,
        originalUrl: data.originalUrl,
      });
    } catch (e: any) {
      setVocalError(e.message || "Ошибка удаления вокала");
    } finally {
      setVocalLoading(false);
    }
  };

  // Генерация музыкального видео
  const handleGenerateVideo = async () => {
    if (!result?.trackId) return;
    setVideoLoading(true);
    setVideoError(undefined);
    setVideoUrl(undefined);
    try {
      const response = await fetch("https://apibox.erweima.ai/music/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          trackId: result.trackId,
          model: "V3_5", // обязательно для Suno API
        }),
      });
      if (!response.ok) throw new Error("Ошибка генерации видео");
      const data = await response.json();
      if (!data.videoUrl)
        throw new Error("Некорректный ответ API: нет videoUrl");
      setVideoUrl(data.videoUrl);
    } catch (e: any) {
      setVideoError(e.message || "Ошибка генерации видео");
    } finally {
      setVideoLoading(false);
    }
  };

  // Очистка polling при размонтировании
  React.useEffect(() => {
    return () => {
      if (pollingRef.current !== null) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto p-6 mt-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold mb-2">Генерация музыки</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Поле промпта */}
        <Input
          type="text"
          placeholder="Опишите желаемую музыку..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-label="Промпт для генерации музыки"
          required
          tabIndex={0}
        />
        {/* Выбор модели */}
        <div className="flex gap-2 items-center">
          <label className="text-sm">Модель:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as "V3.5" | "V4")}
            className="border rounded px-2 py-1"
            aria-label="Модель генерации"
          >
            <option value="V3.5">V3.5</option>
            <option value="V4">V4</option>
          </select>
        </div>
        {/* С текстом/без текста */}
        <div className="flex gap-2 items-center">
          <label className="text-sm">Сгенерировать текст песни</label>
          <input
            type="checkbox"
            checked={withLyrics}
            onChange={() => setWithLyrics((v) => !v)}
            aria-label="Сгенерировать текст песни"
          />
        </div>
        {/* Длительность */}
        <div className="flex gap-2 items-center">
          <label className="text-sm">Длительность (сек):</label>
          <Input
            type="number"
            min={30}
            max={180}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            aria-label="Длительность трека"
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !prompt || !apiKey}
          aria-label="Сгенерировать музыку"
        >
          {loading ? "Генерация..." : "Сгенерировать"}
        </Button>
      </form>
      {/* Индикатор статуса */}
      {status && loading && (
        <div className="text-sm text-muted-foreground animate-pulse mt-2">
          {status}
        </div>
      )}
      {/* Результат */}
      {result && (
        <div className="mt-4">
          <audio controls src={result.trackUrl} className="w-full mb-2" />
          {result.lyrics && (
            <div className="bg-muted rounded p-2 text-sm whitespace-pre-line mb-2">
              <b>Текст песни:</b>
              <br />
              {result.lyrics}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={result.trackUrl}
              download
              className="text-primary underline text-sm"
              tabIndex={0}
              aria-label="Скачать трек"
            >
              Скачать трек
            </a>
            {/* Кнопка расширения трека */}
            <button
              type="button"
              onClick={handleExtend}
              className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/80 transition disabled:opacity-50"
              disabled={loading}
              aria-label="Расширить трек"
              tabIndex={0}
            >
              Расширить трек
            </button>
            {/* Кнопка конвертации в WAV */}
            <button
              type="button"
              onClick={handleConvertWav}
              className="text-sm px-3 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition disabled:opacity-50"
              disabled={wavLoading}
              aria-label="Конвертировать в WAV"
              tabIndex={0}
            >
              {wavLoading ? "Конвертация..." : "В WAV"}
            </button>
            {/* Кнопка удаления вокала */}
            <button
              type="button"
              onClick={handleRemoveVocal}
              className="text-sm px-3 py-1 rounded bg-muted text-foreground hover:bg-muted/80 transition disabled:opacity-50 border border-border"
              disabled={vocalLoading}
              aria-label="Удалить вокал"
              tabIndex={0}
            >
              {vocalLoading ? "Удаление..." : "Удалить вокал"}
            </button>
            {/* Кнопка генерации видео */}
            <button
              type="button"
              onClick={handleGenerateVideo}
              className="text-sm px-3 py-1 rounded bg-pink-600 text-white hover:bg-pink-700 transition disabled:opacity-50"
              disabled={videoLoading}
              aria-label="Сделать видео"
              tabIndex={0}
            >
              {videoLoading ? "Генерация..." : "Сделать видео"}
            </button>
          </div>
          {/* Ссылка на WAV */}
          {wavUrl && (
            <div className="mt-2">
              <a
                href={wavUrl}
                download
                className="text-green-600 underline text-sm"
                tabIndex={0}
                aria-label="Скачать WAV"
              >
                Скачать WAV
              </a>
            </div>
          )}
          {wavError && (
            <div className="text-red-500 text-xs mt-1">{wavError}</div>
          )}
          {/* Ссылки на инструментал/вокал */}
          {vocalResult && (
            <div className="mt-2 flex flex-col gap-1">
              <a
                href={vocalResult.instrumentalUrl}
                download
                className="text-blue-600 underline text-xs"
                tabIndex={0}
                aria-label="Скачать инструментал"
              >
                Скачать инструментал
              </a>
              <a
                href={vocalResult.vocalUrl}
                download
                className="text-purple-600 underline text-xs"
                tabIndex={0}
                aria-label="Скачать вокал"
              >
                Скачать вокал
              </a>
              <a
                href={vocalResult.originalUrl}
                download
                className="text-gray-600 underline text-xs"
                tabIndex={0}
                aria-label="Скачать оригинал"
              >
                Скачать оригинал
              </a>
            </div>
          )}
          {vocalError && (
            <div className="text-red-500 text-xs mt-1">{vocalError}</div>
          )}
          {/* Ссылка на видео */}
          {videoUrl && (
            <div className="mt-2">
              <a
                href={videoUrl}
                download
                className="text-pink-600 underline text-sm"
                tabIndex={0}
                aria-label="Скачать видео"
              >
                Скачать видео (MP4)
              </a>
            </div>
          )}
          {videoError && (
            <div className="text-red-500 text-xs mt-1">{videoError}</div>
          )}
        </div>
      )}
      {/* Ошибка */}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </Card>
  );
};

export default MusicGenerationForm;
