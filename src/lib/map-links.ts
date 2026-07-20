import { BRAND } from "@/lib/brand";

/** 지도 앱 딥링크 — 메인 사이트 src/lib/map-links.ts와 동일 */
export const MAP_LINKS = [
  {
    name: "네이버 지도",
    href: `https://map.naver.com/p/search/${encodeURIComponent(BRAND.address)}`,
  },
  {
    name: "카카오맵",
    href: `https://map.kakao.com/link/search/${encodeURIComponent(BRAND.address)}`,
  },
  {
    name: "T맵 (모바일)",
    href: `tmap://search?name=${encodeURIComponent(BRAND.address)}`,
  },
] as const;
