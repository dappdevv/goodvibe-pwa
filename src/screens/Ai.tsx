import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mic,
  Send,
  ImageIcon,
  MusicIcon,
  MessageSquare,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Модели (захардкожены для примера, можно подгружать динамически)
const TEXT_MODELS = [
  { name: "openai", label: "OpenAI GPT-4.1-mini" },
  { name: "openai-fast", label: "OpenAI GPT-4.1-nano" },
  { name: "openai-large", label: "OpenAI GPT-4.1" },
  { name: "llama", label: "Llama 3.3 70B" },
  { name: "mistral", label: "Mistral Small 3.1 24B" },
  { name: "phi", label: "Phi-4 Instruct" },
  { name: "searchgpt", label: "SearchGPT" },
  { name: "evil", label: "Evil (uncensored)" },
];
const IMAGE_MODELS = [
  { name: "flux", label: "Flux (default)" },
  { name: "turbo", label: "Turbo" },
  { name: "gptimage", label: "GPTImage" },
];
const AUDIO_MODELS = [
  { name: "openai-audio", label: "OpenAI Audio" },
  { name: "hypnosis-tracy", label: "Hypnosis Tracy" },
];
const AUDIO_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
  "coral",
  "verse",
  "ballad",
  "ash",
  "sage",
  "amuch",
  "dan",
];

const GENERATION_TYPES = [
  { key: "text", label: "Текст", icon: <MessageSquare size={18} /> },
  { key: "image", label: "Изображение", icon: <ImageIcon size={18} /> },
  { key: "audio", label: "Аудио", icon: <MusicIcon size={18} /> },
];

function getChats() {
  try {
    return JSON.parse(localStorage.getItem("ai_chats") || "[]");
  } catch {
    return [];
  }
}
function setChats(chats: any[]) {
  localStorage.setItem("ai_chats", JSON.stringify(chats));
}

export default function Ai() {
  const [chats, setChatsState] = useState<any[]>(getChats());
  const [currentChat, setCurrentChat] = useState(0);
  const [messages, setMessages] = useState<any[]>(chats[0]?.messages || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("text");
  const [textModel, setTextModel] = useState(TEXT_MODELS[0].name);
  const [imageModel, setImageModel] = useState(IMAGE_MODELS[0].name);
  const [audioModel, setAudioModel] = useState(AUDIO_MODELS[0].name);
  const [audioVoice, setAudioVoice] = useState(AUDIO_VOICES[0]);
  const [listening, setListening] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Синхронизация чатов и сообщений
  useEffect(() => {
    if (chats.length === 0) {
      const newChat = { id: Date.now(), name: `Чат #1`, messages: [] };
      setChatsState([newChat]);
      setChats([newChat]);
      setCurrentChat(0);
      setMessages([]);
    } else {
      setMessages(chats[currentChat]?.messages || []);
    }
  }, [currentChat]);
  useEffect(() => {
    // Сохраняем чаты при изменении сообщений
    if (chats.length > 0) {
      const updated = chats.map((c, i) =>
        i === currentChat ? { ...c, messages } : c
      );
      setChatsState(updated);
      setChats(updated);
    }
  }, [messages]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Голосовой ввод
  const handleVoice = () => {
    if (
      !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      toast("Голосовой ввод не поддерживается в этом браузере");
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "ru-RU";
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let final = "";
        for (let i = 0; i < event.results.length; ++i) {
          final += event.results[i][0].transcript;
        }
        setInput(final);
      };
      recognitionRef.current.onend = () => setListening(false);
      recognitionRef.current.onerror = () => setListening(false);
    }
    if (!listening) {
      setListening(true);
      recognitionRef.current.start();
    } else {
      setListening(false);
      recognitionRef.current.stop();
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const userMsg = { role: "user", content: input, type };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    try {
      if (type === "text") {
        const url = `https://text.pollinations.ai/${encodeURIComponent(
          input
        )}?model=${textModel}`;
        const res = await fetch(url);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || res.statusText);
        }
        const text = await res.text();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: text, type },
        ]);
      } else if (type === "image") {
        const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
          input
        )}?model=${imageModel}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: imgUrl, type },
        ]);
      } else if (type === "audio") {
        const url = `https://text.pollinations.ai/${encodeURIComponent(
          input
        )}?model=${audioModel}&voice=${audioVoice}`;
        const res = await fetch(url);
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || res.statusText);
        }
        if (res.headers.get("Content-Type")?.includes("audio/mpeg")) {
          const audioBlob = await res.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: audioUrl, type },
          ]);
        } else {
          const errorText = await res.text();
          throw new Error("API не вернул аудиофайл: " + errorText);
        }
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `[Ошибка запроса: ${e.message}]`, type },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      name: `Чат #${chats.length + 1}`,
      messages: [],
    };
    const updated = [...chats, newChat];
    setChatsState(updated);
    setChats(updated);
    setCurrentChat(updated.length - 1);
    setMessages([]);
  };

  const handleSelectChat = (idx: number) => {
    setCurrentChat(idx);
    setMessages(chats[idx]?.messages || []);
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-background py-4">
      <Card className="w-full max-w-2xl mx-auto flex flex-col h-[80vh] px-2 sm:px-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">
            ИИ ассистент Pollinations
          </CardTitle>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handleNewChat}
              title="Новый чат"
            >
              <Plus />
            </Button>
            <Select
              value={String(currentChat)}
              onValueChange={(v) => handleSelectChat(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue>{chats[currentChat]?.name || "Чат"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {chats.map((c, i) => (
                  <SelectItem key={c.id} value={String(i)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={loading}
            >
              Очистить чат
            </Button>
          </div>
        </CardHeader>
        <CardContent
          className="flex-1 overflow-y-auto"
          ref={chatRef}
          style={{ scrollBehavior: "smooth" }}
        >
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-10">
              Начните диалог с ассистентом…
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`my-2 flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.type === "text" && <span>{msg.content}</span>}
                {msg.type === "image" && (
                  <img
                    src={msg.content}
                    alt="img"
                    className="rounded-lg max-w-full mt-2"
                  />
                )}
                {msg.type === "audio" && msg.content && (
                  <div className="flex flex-col gap-1 mt-2">
                    <audio src={msg.content} controls className="w-full" />
                    <a
                      href={msg.content}
                      download={`pollinations-audio-${msg.role}-${msg.type}-${idx}.mp3`}
                      className="text-xs text-primary underline mt-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Скачать аудио
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="my-2 flex justify-start">
              <div className="rounded-lg px-3 py-2 bg-muted animate-pulse">
                Генерация...
              </div>
            </div>
          )}
        </CardContent>
        <form
          className="flex flex-col gap-2 p-4 border-t bg-background"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="flex gap-2 mb-1 items-center">
            {GENERATION_TYPES.map((g) => (
              <Button
                key={g.key}
                type="button"
                variant={type === g.key ? "default" : "outline"}
                size="icon"
                onClick={() => setType(g.key)}
                title={g.label}
                className={type === g.key ? "ring-2 ring-primary" : ""}
              >
                {g.icon}
              </Button>
            ))}
            {type === "text" && (
              <Select value={textModel} onValueChange={setTextModel}>
                <SelectTrigger className="w-40">
                  <SelectValue>
                    {TEXT_MODELS.find((m) => m.name === textModel)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TEXT_MODELS.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {type === "image" && (
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger className="w-32">
                  <SelectValue>
                    {IMAGE_MODELS.find((m) => m.name === imageModel)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {type === "audio" && (
              <>
                <Select value={audioModel} onValueChange={setAudioModel}>
                  <SelectTrigger className="w-32">
                    <SelectValue>
                      {AUDIO_MODELS.find((m) => m.name === audioModel)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIO_MODELS.map((m) => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={audioVoice} onValueChange={setAudioVoice}>
                  <SelectTrigger className="w-28">
                    <SelectValue>{audioVoice}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIO_VOICES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Input
              className="flex-1"
              placeholder="Введите сообщение или промпт..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
            />
            <Button
              type="button"
              variant={listening ? "secondary" : "outline"}
              size="icon"
              onClick={handleVoice}
              disabled={loading}
            >
              <Mic className={listening ? "animate-pulse text-primary" : ""} />
            </Button>
            <Button
              type="submit"
              variant="default"
              size="icon"
              disabled={loading || !input.trim()}
            >
              <Send />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
