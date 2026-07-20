import "server-only";
import { SignJWT, jwtVerify } from "jose";

export const GUIDE_SESSION_COOKIE = "aphae_guide_session";

/**
 * 게스트 세션 쿠키 TTL. verify_guide_access RPC는 boolean만 반환하고
 * 정확한 체크아웃 날짜를 내려주지 않으므로(메인 사이트 스키마 변경 필요),
 * Phase A에서는 일반적인 투숙 기간을 넉넉히 덮는 고정 TTL을 쓴다.
 * 체크아웃 자정 만료로 정교화하려면 verify_guide_access가 checkout을 함께
 * 반환하도록 메인 리포에 마이그레이션을 추가해야 한다(Phase B/D 후보).
 */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 5; // 5일

function getSecret() {
  const secret = process.env.GUIDE_SESSION_SECRET;
  if (!secret) {
    throw new Error("GUIDE_SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface GuideSessionPayload {
  /** 검증에 사용된 예약 코드. reservationId 대신 코드 자체를 서명해 둔다 —
   *  RPC가 boolean만 반환하는 현재 구조에서는 이 편이 추가 스키마 변경 없이
   *  세션 재검증에 코드를 재사용할 수 있어 단순하다. */
  code: string;
}

export async function signGuideSession(payload: GuideSessionPayload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyGuideSession(
  token: string,
): Promise<GuideSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.code !== "string") return null;
    return { code: payload.code };
  } catch {
    return null;
  }
}

export const GUIDE_SESSION_MAX_AGE = SESSION_TTL_SECONDS;
