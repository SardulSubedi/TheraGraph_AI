"use client";

import { useEffect, useRef, useState } from "react";
import { chatWithPatient } from "@/app/lib/api";
import type { ChatMessage } from "@/app/lib/types";
import { Card } from "@/app/components/ui/Card";

interface PatientChatProps {
  patientId: string;
  patientName: string;
  indication?: string;
}

const SUGGESTIONS = [
  "Summarize this patient's pharmacogenomic risks",
  "Why is this regimen safe for them?",
  "What should I monitor after starting therapy?",
];

export function PatientChat({
  patientId,
  patientName,
  indication,
}: PatientChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const history = messages;
    const next: ChatMessage[] = [
      ...history,
      { role: "user", content: question },
    ];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await chatWithPatient(
        patientId,
        question,
        history,
        indication,
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the memory graph. Make sure the backend is running and this patient has ingested records.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex h-full min-h-[380px] flex-col">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
          <span className="h-2 w-2 rounded-full bg-accent" />
        </span>
        <div>
          <p className="text-sm font-semibold text-text">
            Discuss with TheraGraph AI
          </p>
          <p className="text-xs text-text-secondary">
            Grounded in {patientName}&apos;s memory graph
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-2">
            <p className="text-xs text-text-secondary">
              Ask about this patient&apos;s genetics, the synthesis, or safety.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-border bg-bg px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-text"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent text-white"
                    : "border border-border bg-bg text-text"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl border border-border bg-bg px-3.5 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-secondary" />
            </div>
          </div>
        )}
      </div>

      <form
        className="mt-3 flex items-center gap-2 border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this patient…"
          disabled={busy}
          className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </Card>
  );
}
