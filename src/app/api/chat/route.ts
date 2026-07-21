import { NextRequest } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { cookies } from "next/headers";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { buildConciergeSystemPrompt } from "@/lib/concierge-persona";
import { isMoodKey, type MoodKey } from "@/lib/mood";
import { fetchTideInfo, fetchWeatherForecast } from "@/lib/weather-tide";
import { generateSecretCoupon } from "@/lib/secret-coupon";
import { logConciergeEvent } from "@/lib/concierge-log";

/**
 * 클라이언트가 텍스트 스트림에서 뽑아내는 아웃오브밴드 마커 —
 * chat-client.tsx의 파서(COUPON_MARKER_*)와 반드시 짝을 맞춰야 한다.
 * NUL 문자("\u0000")는 일반 텍스트 출력에 등장할 일이 없어 구분자로 안전하다.
 */
const COUPON_MARKER_PREFIX = "\u0000APHAE_COUPON:";
const COUPON_MARKER_SUFFIX = "\u0000";

const CUSTOM_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather_forecast",
      description:
        "스테이 압해(전남 신안군 압해읍) 지역의 오늘 날씨 단기예보를 조회한다. 손님이 날씨·비·기온을 물으면 사용하라.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tide_info",
      description:
        "압해도 인근 오늘의 물때(만조·간조 시각)를 조회한다. 갯벌 산책하기 좋은 시간을 물으면 사용하라.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "reveal_secret_coupon",
      description:
        "지역상생 시크릿 쿠폰을 QR로 손님 화면에 보여준다. 손님이 쿠폰을 보여달라고 하거나, 쿠폰 이야기에 관심을 보이며 보고 싶어할 때 사용하라.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "request_bbq_service",
      description:
        "손님이 바베큐를 실제로 신청하고 싶어할 때 사용한다(단순 문의가 아니라 '해줘', '신청할게요' 같은 확정 의사가 있을 때). 희망 시간을 함께 받아야 한다.",
      parameters: {
        type: "object",
        properties: {
          preferred_time: {
            type: "string",
            description: "손님이 원하는 바베큐 시간 — 손님이 말한 그대로(예: '오늘 저녁 7시', '내일 6시쯤')",
          },
          notes: {
            type: "string",
            description: "추가 요청사항(선택) — 예: 인원 변경, 특별 요청 등",
          },
        },
        required: ["preferred_time"],
        additionalProperties: false,
      },
    },
  },
];

interface ToolContext {
  guideCode: string;
  emit: (chunk: string) => void;
}

async function runCustomTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  if (name === "get_weather_forecast") return fetchWeatherForecast();
  if (name === "get_tide_info") return fetchTideInfo();

  if (name === "reveal_secret_coupon") {
    const coupon = await generateSecretCoupon(ctx.guideCode);
    ctx.emit(
      `${COUPON_MARKER_PREFIX}${JSON.stringify({ code: coupon.code, dataUrl: coupon.dataUrl })}${COUPON_MARKER_SUFFIX}`,
    );
    await logConciergeEvent(ctx.guideCode, "coupon_view", { code: coupon.code });
    return `쿠폰이 손님 화면에 QR로 표시됐습니다. 코드: ${coupon.code}. 오늘 하루만 유효하다고 안내하세요.`;
  }

  if (name === "request_bbq_service") {
    const preferredTime = typeof input.preferred_time === "string" ? input.preferred_time : "";
    const notes = typeof input.notes === "string" ? input.notes : undefined;
    if (!preferredTime) return "희망 시간을 확인하지 못했습니다 — 손님께 다시 여쭤봐 주세요.";
    await logConciergeEvent(ctx.guideCode, "bbq", { preferred_time: preferredTime, notes });
    return `바베큐 신청이 접수됐습니다(희망 시간: ${preferredTime}). 호스트가 확인 후 준비합니다 — 확정 여부는 별도로 안내드린다고 손님께 말씀하세요.`;
  }

  return "알 수 없는 도구 호출입니다.";
}

/** 대화가 한없이 길어지는 것을 막는 소박한 방어선 — 채팅 폭주로 인한 API 비용 급증 방지. */
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 2000;
/** base64 문자열 상한 — 대략 원본 이미지 4.5MB 수준. */
const MAX_IMAGE_BASE64_CHARS = 6_000_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** 클라이언트(chat-client.tsx)가 보내는 멀티파트 콘텐츠 블록 — Anthropic 시절 형식을 그대로 유지해 프런트를 건드리지 않는다. */
type ApiContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

interface ApiMessage {
  role: "user" | "assistant";
  content: string | ApiContentBlock[];
}

function sanitizeHistory(raw: unknown): ApiMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const trimmed = raw.slice(-MAX_MESSAGES);
  const messages: ApiMessage[] = [];

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

    const blocks: ApiContentBlock[] = [];
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
        blocks.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
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

/** 우리 내부 메시지 형식 → OpenAI Chat Completions 메시지 형식. */
function toOpenAiMessages(messages: ApiMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message): ChatCompletionMessageParam => {
    if (typeof message.content === "string") {
      return { role: message.role, content: message.content };
    }
    return {
      role: "user",
      content: message.content.map((block) =>
        block.type === "text"
          ? { type: "text" as const, text: block.text }
          : {
              type: "image_url" as const,
              image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` },
            },
      ),
    };
  });
}

/** 로깅용 — 멀티파트 콘텐츠에서 텍스트만 뽑아 짧게 요약한다(이미지는 표시만). */
const CHAT_LOG_EXCERPT_CHARS = 500;

function extractTextSummary(content: string | ApiContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .map((block) => (block.type === "text" ? block.text : "[사진 첨부]"))
    .filter(Boolean)
    .join(" ");
}

interface AccumulatingToolCall {
  id: string;
  name: string;
  arguments: string;
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

  const apiKey = process.env.OPENAI_API_KEY;
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
  const guestContext = {
    guestName: session.guestName,
    guestCount: session.guestCount,
    specialOccasion: session.specialOccasion,
  };

  const client = new OpenAI({ apiKey });
  const encoder = new TextEncoder();

  const MAX_TOOL_ITERATIONS = 6;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      let assistantTextAccum = "";
      try {
        let workingMessages: ChatCompletionMessageParam[] = [
          { role: "system", content: buildConciergeSystemPrompt(mood, guestContext) },
          ...toOpenAiMessages(messages),
        ];

        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
          const completionStream = await client.chat.completions.create({
            model: "gpt-4o",
            max_tokens: 2048,
            stream: true,
            tools: CUSTOM_TOOLS,
            messages: workingMessages,
          });

          let iterationText = "";
          const toolCallsByIndex = new Map<number, AccumulatingToolCall>();
          let finishReason: string | null = null;

          for await (const chunk of completionStream) {
            const choice = chunk.choices[0];
            if (!choice) continue;

            const delta = choice.delta;
            if (delta?.content) {
              iterationText += delta.content;
              assistantTextAccum += delta.content;
              emit(delta.content);
            }

            if (delta?.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const existing = toolCallsByIndex.get(toolCallDelta.index);
                if (!existing) {
                  toolCallsByIndex.set(toolCallDelta.index, {
                    id: toolCallDelta.id ?? "",
                    name: toolCallDelta.function?.name ?? "",
                    arguments: toolCallDelta.function?.arguments ?? "",
                  });
                } else {
                  if (toolCallDelta.id) existing.id = toolCallDelta.id;
                  if (toolCallDelta.function?.name) existing.name += toolCallDelta.function.name;
                  if (toolCallDelta.function?.arguments) existing.arguments += toolCallDelta.function.arguments;
                }
              }
            }

            if (choice.finish_reason) finishReason = choice.finish_reason;
          }

          if (finishReason !== "tool_calls" || toolCallsByIndex.size === 0) break;

          const toolCalls = Array.from(toolCallsByIndex.values());

          workingMessages = [
            ...workingMessages,
            {
              role: "assistant",
              content: iterationText || null,
              tool_calls: toolCalls.map((call) => ({
                id: call.id,
                type: "function" as const,
                function: { name: call.name, arguments: call.arguments },
              })),
            },
          ];

          for (const call of toolCalls) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = call.arguments ? JSON.parse(call.arguments) : {};
            } catch {
              parsedInput = {};
            }
            const result = await runCustomTool(call.name, parsedInput, {
              guideCode: session.code,
              emit,
            });
            workingMessages.push({ role: "tool", tool_call_id: call.id, content: result });
          }
        }

        // 대화 요약 로깅 — Phase B concierge_logs. 실패해도 이미 스트리밍은
        // 끝난 뒤라 게스트 경험에는 영향 없다(logConciergeEvent가 조용히 처리).
        const lastUserMessage = messages[messages.length - 1];
        const userExcerpt = extractTextSummary(lastUserMessage.content).slice(
          0,
          CHAT_LOG_EXCERPT_CHARS,
        );
        const assistantExcerpt = assistantTextAccum.slice(0, CHAT_LOG_EXCERPT_CHARS);
        if (userExcerpt || assistantExcerpt) {
          await logConciergeEvent(session.code, "chat", {
            user: userExcerpt,
            assistant: assistantExcerpt,
          });
        }
      } catch (error) {
        console.error("[chat] stream failed:", error);
        emit("\n\n죄송해요, 지금은 답변을 드리기 어려워요. 잠시 후 다시 시도해 주시거나 문의로 남겨주세요.");
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
