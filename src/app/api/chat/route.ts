import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { buildConciergeSystemPrompt } from "@/lib/concierge-persona";
import { isMoodKey, type MoodKey } from "@/lib/mood";

/** 대화가 한없이 길어지는 것을 막는 소박한 방어선 — 채팅 폭주로 인한 API 비용 급증 방지. */
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 2000;
/** base64 문자열 상한 — 대략 원본 이미지 4.5MB 수준. */
const MAX_IMAGE_BASE64_CHARS = 6_000_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type ImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

function sanitizeHistory(raw: unknown): Anthropic.MessageParam[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const trimmed = raw.slice(-MAX_MESSAGES);
  const messages: Anthropic.MessageParam[] = [];

  for (let i = 0; i < trimmed.length; i++) {
    const item = trimmed[i];
    const isLast = i === trimmed.length - 1;
    if (typeof item !== "object" || item === null) return null;

    const role = (item as { role?: unknown }).role;
    if (role !== "user" && role !== "assistant") return null;

    const rawContent = (item as { content?: unknown }).content;

    if (typeof rawContent === "string") {
      if (rawContent.trim().length === 0) return null;
      messages.push({ role, content: rawContent.slice(0, MAX_MESSAGE_CHARS) });
      continue;
    }

    // 이미지가 섞인 멀티파트 콘텐츠는 마지막 사용자 메시지에서만 허용한다 —
    // 대화 기록에 base64를 계속 들고 다니지 않기 위해 클라이언트가 이전
    // 턴에서는 이미지를 텍스트로 치환해 보낸다(chat-client.tsx 참고).
    if (!isLast || role !== "user" || !Array.isArray(rawContent)) return null;

    const blocks: Anthropic.ContentBlockParam[] = [];
    let imageCount = 0;

    for (const block of rawContent) {
      if (typeof block !== "object" || block === null) return null;
      const type = (block as { type?: unknown }).type;

      if (type === "text") {
        const text = (block as { text?: unknown }).text;
        if (typeof text !== "string") return null;
        blocks.push({ type: "text", text: text.slice(0, MAX_MESSAGE_CHARS) });
        continue;
      }

      if (type === "image") {
        imageCount += 1;
        if (imageCount > 1) return null;
        const source = (block as { source?: unknown }).source;
        if (typeof source !== "object" || source === null) return null;
        const mediaType = (source as { media_type?: unknown }).media_type;
        const data = (source as { data?: unknown }).data;
        if (typeof mediaType !== "string" || !ALLOWED_IMAGE_TYPES.has(mediaType)) return null;
        if (typeof data !== "string" || data.length === 0 || data.length > MAX_IMAGE_BASE64_CHARS) {
          return null;
        }
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: mediaType as ImageMediaType, data },
        });
        continue;
      }

      return null;
    }

    if (blocks.length === 0) return null;
    messages.push({ role: "user", content: blocks });
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") return null;
  return messages;
}

/**
 * `?code=` 인증과 동일하게, 이 엔드포인트도 게스트 세션 쿠키가 있어야만
 * 응답한다 — 예약 확정 손님만 API 비용이 드는 챗을 호출할 수 있다.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUIDE_SESSION_COOKIE)?.value;
  const session = token ? await verifyGuideSession(token) : null;
  if (!session) {
    return new Response("unauthorized", { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("concierge chat is not configured", { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const messages = sanitizeHistory((body as { messages?: unknown } | null)?.messages);
  if (!messages) {
    return new Response("invalid request", { status: 400 });
  }
  const rawMood = (body as { mood?: unknown } | null)?.mood;
  const mood: MoodKey | null = isMoodKey(rawMood) ? rawMood : null;

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 2048,
          system: buildConciergeSystemPrompt(mood),
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          // 실시간 웹서치 — 신안·목포 축제처럼 매년 날짜가 바뀌는 정보를
          // 지어내지 않고 그때그때 찾아보게 한다. 비용 방어를 위해 한 턴당
          // 최대 3회로 제한.
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
          messages,
        });

        claudeStream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });

        await claudeStream.finalMessage();
      } catch (error) {
        console.error("[chat] stream failed:", error);
        controller.enqueue(
          encoder.encode(
            "\n\n죄송해요, 지금은 답변을 드리기 어려워요. 잠시 후 다시 시도해 주시거나 문의로 남겨주세요.",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
