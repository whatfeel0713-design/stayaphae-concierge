"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchGuideSessionInfo, verifyGuideAccess } from "@/lib/guide-access";
import { GUIDE_SESSION_COOKIE, signGuideSession } from "@/lib/session";

export interface VerifyCodeState {
  error?: string;
}

export async function verifyCodeAction(
  _prev: VerifyCodeState,
  formData: FormData,
): Promise<VerifyCodeState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    return { error: "예약 코드를 입력해 주세요." };
  }

  const ok = await verifyGuideAccess(code);
  if (!ok) {
    return { error: "코드를 확인해 주세요. 예약 확정 안내와 함께 받으신 링크를 다시 사용해 보세요." };
  }

  // get_guide_session_info RPC(개인화 인사용)는 아직 마이그레이션이 안 된
  // 환경에서는 null을 반환한다 — 그래도 위 verifyGuideAccess만으로 세션
  // 발급은 정상 진행된다(우아한 폴백).
  const info = await fetchGuideSessionInfo(code);

  const { token, maxAge } = await signGuideSession({
    code,
    guestName: info?.guestName ?? undefined,
    guestCount: info?.guestCount ?? undefined,
    checkOut: info?.checkOut ?? undefined,
    specialOccasion: info?.specialOccasion ?? undefined,
  });

  const cookieStore = await cookies();
  cookieStore.set(GUIDE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  redirect("/");
}
