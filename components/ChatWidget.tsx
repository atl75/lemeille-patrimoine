"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useModalA11y } from "@/lib/useModalA11y";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Bonjour, je suis l'assistant de Lemeille Patrimoine. Je peux répondre à vos questions sur nos biens, la gestion de patrimoine ou la défiscalisation (Malraux, Monument Historique...). Comment puis-je vous aider ?",
};

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useModalA11y<HTMLDivElement>(() => setOpen(false), open);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  if (pathname?.startsWith("/admin")) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
      } else {
        setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Impossible de contacter l'assistant. Réessayez dans un instant.");
    }
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant Lemeille Patrimoine"}
        data-testid="button-chat-toggle"
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1F3B2C] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89C6D]"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Assistant Lemeille Patrimoine"
          className="fixed bottom-[168px] right-5 z-50 flex h-[70vh] max-h-[560px] w-[90vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-black/10"
        >
          <div className="bg-[#1F3B2C] px-4 py-3 text-white">
            <div className="luxe text-lg">Assistant Lemeille Patrimoine</div>
            <div className="text-xs text-white/70">Réponse en quelques secondes</div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-[#B89C6D] text-white"
                    : "mr-auto bg-gray-100 text-[#1A1A1A]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                En train d&apos;écrire...
              </div>
            )}
            {error && (
              <div className="mr-auto rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-black/10 p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Écrivez votre message..."
              disabled={loading}
              className="flex-1 rounded-2xl border px-4 py-2 text-sm outline-none focus:border-[#B89C6D]"
              data-testid="input-chat-message"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Envoyer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B89C6D] text-white disabled:opacity-40"
              data-testid="button-chat-send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
