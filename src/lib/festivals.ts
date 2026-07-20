/**
 * 신안·목포 일대 축제 — 정확한 날짜는 해마다 바뀌고 검색 시점의 최신 공지를
 * 확인해야 정확하다(딥리서치 결과, 연도별 일정이 실제로 매번 다름). 그래서
 * 여기서는 "언제쯤 열리는 축제인지"의 계절감만 고정 정보로 두고, 정확한
 * 올해 일정은 챗의 web_search 도구가 그때그때 찾도록 설계한다
 * (concierge-persona.ts + api/chat/route.ts의 tools 참고).
 */
export const FESTIVAL_SEASONS = [
  {
    season: "봄 (4~5월)",
    events: "신안 임자도 튤립축제, 신안 옥도 작약꽃 축제, 퍼플섬 라벤더 축제",
  },
  {
    season: "여름 (7~8월)",
    events: "목포 해상 W쇼(야간 미디어 파사드), 각 해수욕장 물놀이 축제",
  },
  {
    season: "가을 (9~10월)",
    events: "목포항구축제, 목포세계마당페스티벌, 유달산 일대 가을 행사",
  },
  {
    season: "겨울 (12~2월)",
    events: "증도 소금축제 등 지역 소규모 행사(연도별 편차가 큼)",
  },
] as const;

export function renderFestivalSeasonsForPrompt(): string {
  const items = FESTIVAL_SEASONS.map((f) => `- ${f.season}: ${f.events}`).join("\n");
  return [
    "## 신안·목포 일대 축제 — 계절 개요 (정확한 날짜는 매년 바뀜)",
    items,
    "",
    "손님이 '지금 무슨 축제 해요?' 같은 시기성 질문을 하면, 위 계절 개요로 감을 잡되 " +
      "web_search 도구로 올해 정확한 날짜·장소를 검색해서 답하라. 검색 결과가 없거나 " +
      "확실치 않으면 지어내지 말고 '정확한 날짜는 확인이 필요하다'고 솔직히 말할 것.",
  ].join("\n");
}
