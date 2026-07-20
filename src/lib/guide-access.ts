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
