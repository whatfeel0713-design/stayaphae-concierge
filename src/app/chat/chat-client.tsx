"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MOOD_OPTIONS, type MoodKey } from "@/lib/mood";
import { findMentionedPlace, tmapSearchUrl } from "@/lib/place-names";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  coupon?: { code: string; dataUrl: string };
}

type ApiContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

interface ApiMessage {
  role: "user" | "assistant";
  content: string | ApiContentBlock[];
}

const MAX_TURNS = 30;
const MOOD_STORAGE_KEY = "aphae_guide_mood";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** api/chat/route.ts의 COUPON_MARKER_*와 반드시 짝을 맞춰야 하는 아웃오브밴드 마커. */
const COUPON_MARKER_PREFIX = "\u0000APHAE_COUPON:";
const COUPON_MARKER_SUFFIX = "\u0000";

function extractCoupon(text: string): {
  visibleText: string;
  coupon: { code: string; dataUrl: string } | null;
} {
  const startIdx = text.indexOf(COUPON_MARKER_PREFIX);
  if (startIdx === -1) return { visibleText: text, coupon: null };

  const payloadStart = startIdx + COUPON_MARKER_PREFIX.length;
  const endIdx = text.indexOf(COUPON_MARKER_SUFFIX, payloadStart);
  if (endIdx === -1) {
    // 마커가 아직 끝나지 않았다(스트리밍 중) — 마커 이전까지만 보여준다.
    return { visibleText: text.slice(0, startIdx), coupon: null };
  }

  const payload = text.slice(payloadStart, endIdx);
  const visibleText = (text.slice(0, startIdx) + text.slice(endIdx + COUPON_MARKER_SUFFIX.length)).trim();
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed?.code === "string" && typeof parsed?.dataUrl === "string") {
      return { visibleText, coupon: { code: parsed.code, dataUrl: parsed.dataUrl } };
    }
  } catch {
    // 파싱 실패 — 마커만 제거하고 텍스트는 그대로 보여준다.
  }
  return { visibleText, coupon: null };
}

function readStoredMood(): MoodKey | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(MOOD_STORAGE_KEY);
  return stored === "rest" || stored === "active" || stored === "romantic" ? stored : null;
}

/** T맵 딥링크 클릭 로깅(Phase B) — fire-and-forget, 실패해도 딥링크 이동은 그대로 진행. */
function logTmapSend(place: string) {
  fetch("/api/log-tmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ place }),
  }).catch(() => {
    // 로깅 실패는 무시 — 딥링크 이동을 막지 않는다.
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ChatClient({
  suggestedPrompts,
  quietHours,
}: {
  suggestedPrompts: string[];
  quietHours: boolean;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodKey | null>(() => readStoredMood());
  const [showMoodPicker, setShowMoodPicker] = useState(() => readStoredMood() === null);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [showQuietBanner, setShowQuietBanner] = useState(quietHours);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function chooseMood(key: MoodKey) {
    setMood(key);
    window.localStorage.setItem(MOOD_STORAGE_KEY, key);
    setShowMoodPicker(false);
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 첨부할 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("사진이 너무 커요 — 4MB 이하로 시도해 주세요.");
      return;
    }
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    const image = pendingImage;
    if ((!trimmed && !image) || isStreaming) return;
    if (messages.length >= MAX_TURNS * 2) {
      setError("대화가 길어졌어요 — 새로고침 후 다시 시작해 주세요.");
      return;
    }

    setError(null);
    setPendingImage(null);
    setInput("");

    const displayUser: DisplayMessage = {
      role: "user",
      content: trimmed || "(사진을 보냈어요)",
      imagePreview: image?.previewUrl,
    };
    const nextDisplay = [...messages, displayUser];
    setMessages([...nextDisplay, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      const history: ApiMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

      let lastMessage: ApiMessage;
      if (image) {
        const dataUrl = await readFileAsDataUrl(image.file);
        const [, mediaType, base64Data] = dataUrl.match(/^data:(.+?);base64,(.*)$/) ?? [];
        const blocks: ApiContentBlock[] = [];
        if (trimmed) blocks.push({ type: "text", text: trimmed });
        if (mediaType && base64Data) {
          blocks.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } });
        }
        lastMessage = { role: "user", content: blocks };
      } else {
        lastMessage = { role: "user", content: trimmed };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, lastMessage], mood }),
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
        const { visibleText, coupon } = extractCoupon(assembled);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: visibleText,
            ...(coupon ? { coupon } : {}),
          };
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
          {showQuietBanner && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-sm border border-line bg-cream-deep px-5 py-3 text-xs leading-6 text-stone">
              <span>지금은 조용한 시간이에요 — 이웃 마을을 위해 마당 소음을 낮춰주시면 좋아요.</span>
              <button
                type="button"
                onClick={() => setShowQuietBanner(false)}
                className="shrink-0 text-stone/70 hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          )}

          {mood && !showMoodPicker && messages.length === 0 && (
            <button
              type="button"
              onClick={() => setShowMoodPicker(true)}
              className="mb-6 w-fit self-center rounded-full border border-ink/15 px-4 py-1.5 text-xs text-stone transition-colors hover:border-ink/30"
            >
              오늘의 무드: {MOOD_OPTIONS.find((m) => m.key === mood)?.label} · 바꾸기
            </button>
          )}

          {showMoodPicker ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
              <div>
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
                  Today&apos;s Mood
                </p>
                <p className="mt-4 max-w-sm text-sm leading-7 text-stone">
                  오늘은 어떤 하루를 보내고 싶으세요? 고르시면 그에 맞춰 제안해 드릴게요.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => chooseMood(option.key)}
                    className="flex flex-col gap-1 rounded-sm border border-ink/20 px-6 py-4 text-left transition-all duration-300 hover:border-ink hover:bg-ink hover:text-cream"
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
              <p className="max-w-sm text-sm leading-7 text-stone">
                이용 안내부터 로컬 맛집, 오늘 추천 코스까지 — 이 집을 잘 아는 사람에게
                묻듯 편하게 물어보세요. 궁금한 사물을 사진으로 찍어 보내거나, 마음에 드는
                풍경 사진을 보내 캡션을 부탁해도 좋아요.
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
              {messages.map((message, i) => {
                const place = message.role === "assistant" ? findMentionedPlace(message.content) : null;
                return (
                  <div
                    key={i}
                    className={
                      message.role === "user"
                        ? "self-end max-w-[85%]"
                        : "self-start max-w-[85%]"
                    }
                  >
                    {message.imagePreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={message.imagePreview}
                        alt="첨부한 사진"
                        className="mb-2 max-h-48 rounded-lg border border-line object-cover"
                      />
                    )}
                    <div
                      className={
                        message.role === "user"
                          ? "whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-5 py-3 text-sm leading-7 text-cream"
                          : "whitespace-pre-wrap text-sm leading-7 text-ink-soft"
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
                    {place && (
                      <a
                        href={tmapSearchUrl(place.query)}
                        onClick={() => logTmapSend(place.name)}
                        className="mt-2 inline-block rounded-full border border-ink/20 px-4 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink"
                      >
                        T맵으로 {place.name} 길찾기 →
                      </a>
                    )}
                    {message.coupon && (
                      <div className="mt-3 flex flex-col items-start gap-3 rounded-sm border border-bronze/30 bg-cream-deep p-5">
                        <p className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-bronze">
                          Secret Coupon
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={message.coupon.dataUrl}
                          alt="시크릿 쿠폰 QR"
                          className="h-36 w-36 rounded-md bg-cream p-2"
                        />
                        <p className="font-mono text-sm tracking-wide text-ink">{message.coupon.code}</p>
                        <p className="text-xs leading-6 text-stone">오늘 하루만 유효합니다.</p>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}

          {error && <p className="mt-4 text-sm leading-6 text-bronze">{error}</p>}
        </div>
      </section>

      {/* ---------- Input ---------- */}
      <section className="sticky bottom-0 border-t border-line bg-cream/95 backdrop-blur">
        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-5">
          {pendingImage && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingImage.previewUrl}
                alt="첨부 예정 사진"
                className="h-14 w-14 rounded-md border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="text-xs text-stone underline underline-offset-2"
              >
                사진 제거
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex shrink-0 items-center justify-center rounded-full border border-ink/20 p-3 text-ink-soft transition-colors hover:border-ink"
              aria-label="사진 첨부"
              title="사진으로 물어보기"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.379a1.5 1.5 0 0 0 1.06-.44l.922-.92A1.5 1.5 0 0 1 9.92 5h4.16a1.5 1.5 0 0 1 1.06.44l.922.92a1.5 1.5 0 0 0 1.06.44H19.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
                />
                <circle cx="12" cy="13" r="3.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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
              disabled={isStreaming || (!input.trim() && !pendingImage)}
              className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isStreaming ? "..." : "보내기"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
