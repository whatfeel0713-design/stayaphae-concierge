"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_TURNS = 30;

export function ChatClient({ suggestedPrompts }: { suggestedPrompts: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (messages.length >= MAX_TURNS * 2) {
      setError("대화가 길어졌어요 — 새로고침 후 다시 시작해 주세요.");
      return;
    }

    setError(null);
    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`chat request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assembled = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assembled += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assembled };
          return copy;
        });
      }

      if (!assembled.trim()) {
        throw new Error("empty response");
      }
    } catch {
      setError("죄송해요, 지금은 답변을 드리기 어려워요. 잠시 후 다시 시도해 주세요.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- Header ---------- */}
      <section className="border-b border-line bg-ink px-6 pb-8 pt-28 text-cream md:pt-32">
        <div className="mx-auto flex w-full max-w-3xl items-end justify-between">
          <div>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.5em] text-cream/70">
              Aphae Concierge
            </p>
            <h1 className="mt-4 font-serif text-2xl font-light leading-snug tracking-tight md:text-3xl">
              무엇이든 물어보세요
            </h1>
          </div>
          <Link
            href="/"
            className="hidden shrink-0 rounded-full border border-cream/25 px-4 py-2 text-xs font-medium tracking-wide text-cream/85 transition-all duration-300 hover:border-cream hover:bg-cream/10 sm:block"
          >
            안내로 돌아가기
          </Link>
        </div>
      </section>

      {/* ---------- Conversation ---------- */}
      <section className="flex flex-1 flex-col bg-cream">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
              <p className="max-w-sm text-sm leading-7 text-stone">
                이용 안내부터 로컬 맛집, 오늘 추천 코스까지 — 이 집을 잘 아는 사람에게
                묻듯 편하게 물어보세요.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-ink/20 px-5 py-2.5 text-sm text-ink-soft transition-all duration-300 hover:border-ink hover:bg-ink hover:text-cream"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-7">
              {messages.map((message, i) => (
                <div
                  key={i}
                  className={
                    message.role === "user"
                      ? "self-end rounded-2xl rounded-br-sm bg-ink px-5 py-3 text-sm leading-7 text-cream max-w-[85%] whitespace-pre-wrap"
                      : "self-start max-w-[85%] whitespace-pre-wrap text-sm leading-7 text-ink-soft"
                  }
                >
                  {message.content || (
                    <span className="inline-flex gap-1 py-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone [animation-delay:0.15s]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone [animation-delay:0.3s]" />
                    </span>
                  )}
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          )}

          {error && <p className="mt-4 text-sm leading-6 text-bronze">{error}</p>}
        </div>
      </section>

      {/* ---------- Input ---------- */}
      <section className="sticky bottom-0 border-t border-line bg-cream/95 backdrop-blur">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-3xl items-end gap-3 px-6 py-5"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            rows={1}
            placeholder="궁금한 것을 물어보세요..."
            className="field-underline max-h-32 flex-1 resize-none"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isStreaming ? "..." : "보내기"}
          </button>
        </form>
      </section>
    </div>
  );
}
