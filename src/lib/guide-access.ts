import { createClient } from "@/utils/supabase/server";

/**
 * 예약 코드로 압해 컨시어지 접근 가능 여부 확인. 메인 사이트(staysoom)가
 * 만든 verify_guide_access RPC를 그대로 재사용한다(같은 Supabase 프로젝트) —
 * confirmed 상태 + 투숙 기간(체크인 전날~체크아웃)을 검사하고 boolean만
 * 반환하므로 게스트 개인정보는 이 앱에도 노출되지 않는다.
 */
export async function verifyGuideAccess(code: string): Promise<boolean> {
  if (!code) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("verify_guide_access", {
      p_code: code,
    });
    if (error) {
      console.error("[concierge] access check failed:", error.message);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

export interface GuideSessionInfo {
  guestName: string | null;
  guestCount: number | null;
  checkIn: string | null;
  checkOut: string | null;
  specialOccasion: string | null;
}

/**
 * 개인화된 첫 인사·세션 TTL 정교화를 위한 확장 조회. 메인 리포의
 * get_guide_session_info RPC(2026-07-21 마이그레이션)를 호출한다 — 이
 * RPC가 아직 적용되지 않은 환경(마이그레이션 미실행)에서는 에러가 나므로
 * null을 반환해 verifyGuideAccess만으로도 동작하도록 우아하게 폴백한다.
 */
export async function fetchGuideSessionInfo(code: string): Promise<GuideSessionInfo | null> {
  if (!code) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_guide_session_info", {
      p_code: code,
    });
    if (error) {
      console.error("[concierge] session info fetch failed (RPC 미적용 가능):", error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    return {
      guestName: row.guest_name ?? null,
      guestCount: row.guest_count ?? null,
      checkIn: row.check_in ?? null,
      checkOut: row.check_out ?? null,
      specialOccasion: row.special_occasion ?? null,
    };
  } catch {
    return null;
  }
}
