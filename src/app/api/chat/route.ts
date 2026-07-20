import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { buildConciergeSystemPrompt } from "@/lib/concierge-persona";

/** 대화가 한없이 길어지는 것을 막는 소박한 방어선 — 채팅 폭주로 인한 API 비용 급증 방지. */
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 2000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function sanitizeHistory(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const trimmed = raw.slice(-MAX_MESSAGES);
  const messages: ChatMessage[] = [];

  for (const item of trimmed) {
    if (typeof item !== "object" || item === null) return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim().length === 0) return null;
    messages.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
  }

  if (messages[messages.length - 1].role !== "user") return null;
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

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 2048,
          system: buildConciergeSystemPrompt(),
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
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
