import { BRAND } from "@/lib/brand";
import { MAP_LINKS } from "@/lib/map-links";
import { renderPrivateToursForPrompt } from "@/lib/private-tours";
import { renderLocalProductsForPrompt } from "@/lib/local-products";
import { renderFestivalSeasonsForPrompt } from "@/lib/festivals";
import { renderDeviceManualsForPrompt } from "@/lib/device-manuals";

/**
 * 게스트 가이드 콘텐츠 — 메인 사이트(staysoom) src/app/guide/page.tsx에서
 * 그대로 이식(concierge-app-design.md Phase A). 페이지(page.tsx)와 AI 컨시어지
 * 챗(api/chat)이 같은 데이터를 공유한다 — 콘텐츠를 고치면 둘 다 함께 갱신된다.
 * 맛집 상호 등은 플레이스홀더 — 실제 정보로 교체할 것.
 */
interface ManualItemBase {
  title: string;
  body: string;
}

export interface ManualInfoItem extends ManualItemBase {
  kind: "info";
}

export interface ManualBbqItem extends ManualItemBase {
  kind: "bbq";
  /** 30분 단위 예약 가능 시간 — 마지막 슬롯은 "저녁 9시까지" 이용 규칙에 맞춰 20:30. */
  timeSlots: string[];
}

export interface ManualSiteMapItem extends ManualItemBase {
  kind: "site-map";
  highlight: "firepit" | "recycling";
}

export interface ManualLinkItem extends ManualItemBase {
  kind: "link";
  linkHref: string;
  linkLabel: string;
}

export type ManualItem = ManualInfoItem | ManualBbqItem | ManualSiteMapItem | ManualLinkItem;

export const MANUAL_ITEMS: ManualItem[] = [
  {
    kind: "info",
    title: "체크인 · 체크아웃",
    body: `${BRAND.checkInOut}. 셀프 체크인 — 도어록 비밀번호는 체크인 당일 문자로 안내드립니다.`,
  },
  {
    kind: "info",
    title: "와이파이",
    body: "네트워크 이름과 비밀번호는 거실의 웰컴 카드에 적어두었습니다.",
  },
  {
    kind: "bbq",
    title: "바베큐",
    body: "이용 전날까지 말씀해 주시면 원하는 시간에 맞춰 준비해 드립니다. 이용 시간은 저녁 9시까지입니다.",
    timeSlots: ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"],
  },
  {
    kind: "site-map",
    title: "불멍 파이어핏",
    body: "마당의 파이어핏은 자유롭게 이용하실 수 있습니다. 장작은 창고에 준비되어 있습니다.",
    highlight: "firepit",
  },
  {
    kind: "site-map",
    title: "분리수거",
    body: "쓰레기는 마당 한쪽의 분리수거함에 배출해 주세요. 퇴실 시 음식물만 따로 부탁드립니다.",
    highlight: "recycling",
  },
  {
    kind: "info",
    title: "조용한 밤",
    body: "하루 한 팀의 독채이지만, 이웃 마을의 밤을 위해 밤 10시 이후에는 마당 소음을 낮춰주세요.",
  },
  {
    kind: "info",
    title: "안전",
    body: "소화기는 현관과 주방에 있습니다. 급한 일은 언제든 아래 연락처로 주세요 — 가까이에 있습니다.",
  },
  {
    kind: "link",
    title: "전기차 충전",
    body: "마당에 완속 충전용 콘센트가 준비되어 있습니다. 급속충전소는 환경부 무공해차 통합누리집(EV.or.kr)이나 충전 앱에서 실시간 위치·사용 가능 여부를 확인하실 수 있어요 — 정확한 위치는 체크인 시 확인해 안내드립니다.",
    linkHref: "https://ev.or.kr",
    linkLabel: "전기차 충전소 현황 보기 (EV.or.kr)",
  },
];

export const DINING_SPOTS = [
  {
    tag: "아침 · 점심",
    name: "압해읍 백반집",
    note: "주인장이 한 주에 한 번은 가는 집. 반찬이 계절마다 바뀝니다.",
    distance: "차로 7분",
  },
  {
    tag: "저녁",
    name: "선착장 앞 횟집",
    note: "그날 들어온 것만 내어주는 곳. 낙지 요리는 꼭 물어보세요.",
    distance: "차로 10분",
  },
  {
    tag: "간식",
    name: "읍내 방앗간 카페",
    note: "옛 방앗간을 고친 카페. 인절미 토스트와 미숫가루 라떼.",
    distance: "차로 8분",
  },
  {
    tag: "포장",
    name: "시장 통닭집",
    note: "불멍과 가장 잘 어울리는 야식. 포장해 와서 마당에서 드세요.",
    distance: "차로 9분",
  },
];

export const COURSES = [
  {
    label: "1박 2일",
    title: "섬의 하루를 온전히",
    days: [
      {
        day: "첫째 날",
        stops: [
          { time: "15:00", text: "체크인 — 마당에서 웰컴 티 한 잔으로 시작" },
          { time: "17:30", text: "섬 산책 — 해 지는 방향으로 천천히, 노을이 가장 긴 시간" },
          { time: "19:00", text: "마당 바베큐 — 미리 예약하신 시간에 맞춰 준비됩니다" },
          { time: "21:00", text: "불멍 — 파이어핏에 불을 올리고 하루를 정리" },
        ],
      },
      {
        day: "둘째 날",
        stops: [
          { time: "08:00", text: "모닝 커피 — 준비된 원두를 내려 창가에서" },
          { time: "10:00", text: "갯벌 해안 산책 — 유네스코 세계자연유산 신안 갯벌, 물때에 따라 전혀 다른 풍경" },
          { time: "11:00", text: "체크아웃 — 서두르지 않으셔도 됩니다" },
        ],
      },
    ],
  },
  {
    label: "2박 3일",
    title: "천사대교 너머까지",
    days: [
      {
        day: "첫째 날",
        stops: [
          { time: "15:00", text: "체크인 후 집에서 쉬어가기 — 첫날은 아무것도 하지 않는 날" },
          { time: "19:00", text: "바베큐와 불멍 — 1박 코스와 같은 저녁" },
        ],
      },
      {
        day: "둘째 날",
        stops: [
          { time: "10:00", text: "천사대교 드라이브 — 압해도에서 암태도로, 다리 위 바다 풍경" },
          { time: "12:00", text: "퍼플섬(반월·박지도) — 보라색 다리를 걸어서 건너는 섬" },
          { time: "17:00", text: "돌아오는 길 노을 — 천사대교의 해 질 녘이 하이라이트" },
        ],
      },
      {
        day: "셋째 날",
        stops: [
          { time: "09:00", text: "느린 아침 — 마지막 날은 집에서 가장 길게" },
          { time: "11:00", text: "체크아웃 후 목포 원도심 — 근대역사거리와 유달산까지 30분" },
        ],
      },
    ],
  },
];

export const SECRET_COUPON_NOTE =
  "이웃 가게들과 함께 만든 투숙객 전용 혜택입니다. 체크인 시 웰컴 카드와 함께 안내드립니다 — 머무는 동안만 유효합니다.";

export const GUIDE_NAV = [
  { href: "#manual", label: "이용 안내" },
  { href: "#directions", label: "오시는 길" },
  { href: "#dining", label: "로컬 맛집" },
  { href: "#courses", label: "추천 코스" },
  { href: "#tours", label: "프라이빗 투어" },
];

/** 챗 시스템 프롬프트에 그대로 삽입할 수 있는 평문 가이드 요약. */
export function renderGuideContentForPrompt(): string {
  const manual = MANUAL_ITEMS.map((item) => `- ${item.title}: ${item.body}`).join("\n");
  const dining = DINING_SPOTS.map(
    (spot) => `- [${spot.tag}] ${spot.name} (${spot.distance}) — ${spot.note}`,
  ).join("\n");
  const courses = COURSES.map((course) => {
    const days = course.days
      .map(
        (day) =>
          `  ${day.day}: ` +
          day.stops.map((stop) => `${stop.time} ${stop.text}`).join(" / "),
      )
      .join("\n");
    return `- ${course.label} "${course.title}"\n${days}`;
  }).join("\n");
  const directions = `주소: ${BRAND.address}\n지도 링크: ${MAP_LINKS.map((l) => l.name).join(", ")}`;

  return [
    "## 이용 안내",
    manual,
    "",
    "## 오시는 길",
    directions,
    "",
    "## 로컬 맛집",
    dining,
    "",
    "## 추천 코스",
    courses,
    "",
    renderPrivateToursForPrompt(),
    "",
    renderLocalProductsForPrompt(),
    "",
    renderFestivalSeasonsForPrompt(),
    "",
    renderDeviceManualsForPrompt(),
    "",
    "## 시크릿 쿠폰",
    SECRET_COUPON_NOTE,
  ].join("\n");
}
