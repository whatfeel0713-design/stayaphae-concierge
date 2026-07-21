import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { logConciergeEvent } from "@/lib/concierge-log";

const MAX_PLACE_CHARS = 100;

/**
 * T맵 딥링크 클릭 로깅(Phase B concierge_logs, request_type='tmap_send').
 * 클라이언트가 `<a>` 클릭 시 fire-and-forget으로 호출한다 — 실패해도 딥링크
 * 자체 이동은 막지 않는다(chat-client.tsx 참고).
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUIDE_SESSION_COOKIE)?.value;
  const session = token ? await verifyGuideSession(token) : null;
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const place = (body as { place?: unknown } | null)?.place;
  if (typeof place !== "string" || place.trim().length === 0) {
    return new Response(null, { status: 400 });
  }

  await logConciergeEvent(session.code, "tmap_send", { place: place.slice(0, MAX_PLACE_CHARS) });

  return new Response(null, { status: 204 });
}
