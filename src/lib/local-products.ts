/**
 * 호스트 직판 상품 — 신안 천일염·무화과. 실제 가격·재고·포장 단위는
 * 호스트가 직접 확인해 교체해야 하는 플레이스홀더다(다른 콘텐츠와 동일한
 * 표기 규칙). 결제·배송 자동화는 아직 없어 문의 이메일로 조율하는 흐름으로
 * 안내한다 — 프라이빗 투어와 같은 패턴.
 */
export const LOCAL_PRODUCTS = [
  {
    name: "신안 천일염",
    season: "연중",
    note: "인근 염전에서 직접 받아온 국산 천일염. 간수를 뺀 고운 소금으로, 소포장(선물용)부터 요리용 대용량까지 준비 가능.",
    howToOrder: "체크아웃 전 말씀해 주시면 준비해 드립니다 — 정확한 가격·용량은 문의로 확인 부탁드립니다.",
  },
  {
    name: "무화과",
    season: "제철 8~10월",
    note: "제철에는 인근 농가에서 그날 받은 생무화과를 준비합니다. 제철이 아니면 준비가 어려울 수 있어요.",
    howToOrder: "제철 시즌에는 체크인 시 재고를 확인해 드립니다.",
  },
] as const;

export function renderLocalProductsForPrompt(): string {
  const items = LOCAL_PRODUCTS.map(
    (p) => `- ${p.name} (${p.season}): ${p.note} — ${p.howToOrder}`,
  ).join("\n");
  return ["## 호스트 직판 상품", items].join("\n");
}
