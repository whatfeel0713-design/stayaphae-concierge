import "server-only";
import { createClient } from "@/utils/supabase/server";

export type ConciergeRequestType = "bbq" | "chat" | "tmap_send" | "coupon_view";

/**
 * 메인 리포(staysoom)의 create_concierge_log RPC(Phase B,
 * 20260722090000_concierge_logs.sql)를 호출해 신청·이용 이력을 남긴다.
 * 실패해도(마이그레이션 미적용 등) 게스트 경험을 막지 않도록 로그만 남기고
 * 조용히 넘어간다 — 다른 알림/로깅 헬퍼와 동일한 방어적 패턴.
 */
export async function logConciergeEvent(
  guideCode: string,
  requestType: ConciergeRequestType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_concierge_log", {
      p_code: guideCode,
      p_request_type: requestType,
      p_payload: payload,
    });
    if (error) {
      console.error("[concierge-log] failed (마이그레이션 미적용 가능):", error.message);
    }
  } catch (error) {
    console.error("[concierge-log] unexpected error:", error);
  }
}
