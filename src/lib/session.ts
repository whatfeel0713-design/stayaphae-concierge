import "server-only";
import { SignJWT, jwtVerify } from "jose";

export const GUIDE_SESSION_COOKIE = "aphae_guide_session";

/** get_guide_session_info RPC가 없거나 실패했을 때 쓰는 대체 TTL. */
const FALLBACK_TTL_SECONDS = 60 * 60 * 24 * 5; // 5일
/** 체크아웃 당일 자정(KST) 이후로 하루 여유를 더 준다 — 자정 직후 접속 끊김 방지. */
const CHECKOUT_GRACE_SECONDS = 60 * 60 * 24;

function getSecret() {
  const secret = process.env.GUIDE_SESSION_SECRET;
  if (!secret) {
    throw new Error("GUIDE_SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface GuideSessionPayload {
  /** 검증에 사용된 예약 코드 — 세션 재검증·컨시어지 로그 확장에 재사용. */
  code: string;
  guestName?: string;
  guestCount?: number;
  /** ISO 날짜 문자열(YYYY-MM-DD). */
  checkOut?: string;
  specialOccasion?: string;
}

/** checkOut(YYYY-MM-DD, KST 기준 날짜)이 있으면 그날 자정 + 여유시간까지 남은 초를 계산한다. */
function computeTtlSeconds(checkOut?: string): number {
  if (!checkOut) return FALLBACK_TTL_SECONDS;
  const checkoutMidnightUtc = new Date(`${checkOut}T00:00:00+09:00`);
  const expiresAt = checkoutMidnightUtc.getTime() + CHECKOUT_GRACE_SECONDS * 1000;
  const secondsLeft = Math.floor((expiresAt - Date.now()) / 1000);
  // 이미 지난 체크아웃이거나 계산이 이상하면 대체 TTL로 안전하게 폴백.
  return secondsLeft > 0 ? secondsLeft : FALLBACK_TTL_SECONDS;
}

export async function signGuideSession(payload: GuideSessionPayload) {
  const ttl = computeTtlSeconds(payload.checkOut);
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(getSecret());
  return { token, maxAge: ttl };
}

export async function verifyGuideSession(
  token: string,
): Promise<GuideSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.code !== "string") return null;
    return {
      code: payload.code,
      guestName: typeof payload.guestName === "string" ? payload.guestName : undefined,
      guestCount: typeof payload.guestCount === "number" ? payload.guestCount : undefined,
      checkOut: typeof payload.checkOut === "string" ? payload.checkOut : undefined,
      specialOccasion:
        typeof payload.specialOccasion === "string" ? payload.specialOccasion : undefined,
    };
  } catch {
    return null;
  }
}

export const GUIDE_SESSION_FALLBACK_MAX_AGE = FALLBACK_TTL_SECONDS;
