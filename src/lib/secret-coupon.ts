import "server-only";
import QRCode from "qrcode";
import { nowInKst } from "@/lib/daypart";

/**
 * 시크릿 쿠폰 실물화 — concierge_logs(Phase B)가 아직 없어 발급 이력은
 * 남기지 않는다. 대신 "머무는 날짜 + 예약 코드"로 매일 바뀌는 결정론적
 * 코드를 만들어, 같은 손님이 여러 번 물어도 같은 날에는 같은 코드가
 * 나오게 한다(로컬 가게가 하루에 여러 번 같은 손님을 받아도 코드가 안
 * 흔들리도록). 실제 매장 검증·정산은 아직 자동화돼 있지 않다 — 지금은
 * "보여줄 만한 실물"을 만드는 단계.
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).toUpperCase().slice(0, 6);
}

export interface SecretCoupon {
  code: string;
  dataUrl: string;
}

export async function generateSecretCoupon(guideCode: string): Promise<SecretCoupon> {
  const kst = nowInKst();
  const dateKey = `${kst.getFullYear()}${String(kst.getMonth() + 1).padStart(2, "0")}${String(
    kst.getDate(),
  ).padStart(2, "0")}`;
  const code = `APHAE-${dateKey}-${simpleHash(`${guideCode}:${dateKey}`)}`;
  const dataUrl = await QRCode.toDataURL(code, { width: 220, margin: 1 });
  return { code, dataUrl };
}
