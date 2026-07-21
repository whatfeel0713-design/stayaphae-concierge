import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { buildConciergeSystemPrompt } from "@/lib/concierge-persona";
import { isMoodKey, type MoodKey } from "@/lib/mood";
import { fetchTideInfo, fetchWeatherForecast } from "@/lib/weather-tide";
import { generateSecretCoupon } from "@/lib/secret-coupon";

/**
 * 클라이언트가 텍스트 스트림에서 뽑아내는 아웃오브밴드 마커 —
 * chat-client.tsx의 파서(COUPON_MARKER_*)와 반드시 짝을 맞춰야 한다.
 * NUL 문자("\u0000")는 Claude의 일반 텍스트 출력에 등장할 일이 없어
 * 구분자로 안전하다.
 */
const COUPON_MARKER_PREFIX = "\u0000APHAE_COUPON:";
const COUPON_MARKER_SUFFIX = "\u0000";

const CUSTOM_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_weather_forecast",
    description:
      "스테이 압해(전남 신안군 압해읍) 지역의 오늘 날씨 단기예보를 조회한다. 손님이 날씨·비·기온을 물으면 사용하라.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_tide_info",
    description:
      "압해도 인근 오늘의 물때(만조·간조 시각)를 조회한다. 갯벌 산책하기 좋은 시간을 물으면 사용하라.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "reveal_secret_coupon",
    description:
      "지역상생 시크릿 쿠폰을 QR로 손님 화면에 보여준다. 손님이 쿠폰을 보여달라고 하거나, 쿠폰 이야기에 관심을 보이며 보고 싶어할 때 사용하라.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const CUSTOM_TOOL_NAMES = new Set(CUSTOM_TOOLS.map((t) => t.name));

interface ToolContext {
  guideCode: string;
  emit: (chunk: string) => void;
}

async function runCustomTool(name: string, ctx: ToolContext): Promise<string> {
  if (name === "get_weather_forecast") return fetchWeatherForecast();
  if (name === "get_tide_info") return fetchTideInfo();
  if (name === "reveal_secret_coupon") {
    const coupon = await generateSecretCoupon(ctx.guideCode);
    ctx.emit(
      `${COUPON_MARKER_PREFIX}${JSON.stringify({ code: coupon.code, dataUrl: coupon.dataUrl })}${COUPON_MARKER_SUFFIX}`,
    );
    return `쿠폰이 손님 화면에 QR로 표시됐습니다. 코드: ${coupon.code}. 오늘 하루만 유효하다고 안내하세요.`;
  }
  return "알 수 없는 도구 호출입니다.";
}

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
  const guestContext = {
    guestName: session.guestName,
    guestCount: session.guestCount,
    specialOccasion: session.specialOccasion,
  };

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const MAX_TOOL_ITERATIONS = 6;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      try {
        let workingMessages: Anthropic.MessageParam[] = messages;

        for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
          const claudeStream = client.messages.stream({
            model: "claude-opus-4-8",
            max_tokens: 2048,
            system: buildConciergeSystemPrompt(mood, guestContext),
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            tools: [
              // 실시간 웹서치 — 신안·목포 축제처럼 매년 날짜가 바뀌는 정보를
              // 지어내지 않고 그때그때 찾아보게 한다(서버 도구, 비용 방어로
              // 턴당 최대 3회 제한).
              { type: "web_search_20260209", name: "web_search", max_uses: 3 },
              // 실시간 날씨·물때·시크릿 쿠폰 — 우리가 직접 실행하는 커스텀 도구(아래 루프에서 처리).
              ...CUSTOM_TOOLS,
            ],
            messages: workingMessages,
          });

          claudeStream.on("text", (delta) => {
            emit(delta);
          });

          const finalMessage = await claudeStream.finalMessage();

          if (finalMessage.stop_reason === "pause_turn") {
            // 서버 도구(web_search) 반복 한도에 걸린 경우 — 새 사용자 메시지
            // 없이 그대로 이어서 재요청하면 서버가 자동으로 이어간다.
            workingMessages = [...workingMessages, { role: "assistant", content: finalMessage.content }];
            continue;
          }

          if (finalMessage.stop_reason !== "tool_use") {
            break;
          }

          const customToolUses = finalMessage.content.filter(
            (block): block is Anthropic.ToolUseBlock =>
              block.type === "tool_use" && CUSTOM_TOOL_NAMES.has(block.name),
          );

          if (customToolUses.length === 0) break;

          workingMessages = [...workingMessages, { role: "assistant", content: finalMessage.content }];

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const toolUse of customToolUses) {
            const result = await runCustomTool(toolUse.name, { guideCode: session.code, emit });
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
          }
          workingMessages = [...workingMessages, { role: "user", content: toolResults }];
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
