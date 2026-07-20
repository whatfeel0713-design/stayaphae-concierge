"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyGuideAccess } from "@/lib/guide-access";
import { GUIDE_SESSION_COOKIE, GUIDE_SESSION_MAX_AGE, signGuideSession } from "@/lib/session";

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

  const token = await signGuideSession({ code });
  const cookieStore = await cookies();
  cookieStore.set(GUIDE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUIDE_SESSION_MAX_AGE,
  });

  redirect("/");
}
