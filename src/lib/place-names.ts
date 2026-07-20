import { ISLAND_BELT } from "@/lib/private-tours";
import { DINING_SPOTS } from "@/lib/guide-content";

export interface PlaceRef {
  name: string;
  query: string;
}

const EXTRA_PLACES: PlaceRef[] = [
  { name: "퍼플섬", query: "퍼플섬" },
  { name: "천사대교", query: "천사대교" },
  { name: "목포 원도심", query: "목포 근대역사거리" },
  { name: "유달산", query: "유달산" },
];

/** T맵 원클릭 전송용 — 챗 답변에 언급된 장소를 감지하는 데 쓰는 참조 목록. */
export const PLACE_REFS: PlaceRef[] = [
  ...ISLAND_BELT.map((island) => ({ name: island.name, query: island.name })),
  ...DINING_SPOTS.map((spot) => ({ name: spot.name, query: spot.name })),
  ...EXTRA_PLACES,
];

export function findMentionedPlace(text: string): PlaceRef | null {
  for (const place of PLACE_REFS) {
    if (text.includes(place.name)) return place;
  }
  return null;
}

export function tmapSearchUrl(query: string): string {
  return `tmap://search?name=${encodeURIComponent(query)}`;
}
