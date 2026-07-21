/**
 * 기기 사용법 — 호스트가 나중에 정리해서 알려주면 여기(`steps` 배열)만
 * 채우면 된다. `ready: false`인 항목은 아직 실제 내용이 없다는 뜻이고,
 * 컨시어지는 이런 항목을 물으면 지어내지 않고 "아직 등록 중"이라고
 * 솔직히 답하도록 페르소나에 지시해 뒀다(concierge-persona.ts 참고).
 *
 * 채우는 법: 아래 배열에서 해당 항목의 `ready`를 true로, `steps`에 순서대로
 * 한 문장씩 넣으면 챗과 이 데이터를 쓰는 곳(현재는 챗 시스템 프롬프트만)에
 * 자동 반영된다. 정적 페이지(`page.tsx`)에는 아직 노출하지 않는다 —
 * "준비 중" 카드로 가득한 섹션은 방문객에게 좋은 인상을 주지 않으므로,
 * 실제 내용이 채워진 뒤 페이지 섹션 추가를 고려할 것.
 */
export interface DeviceManual {
  device: string;
  ready: boolean;
  /** ready가 true일 때만 의미 있음 — 순서대로 안내할 문장들. */
  steps: string[];
  /** 선택: 위 단계로 다루기 애매한 팁 한 줄. */
  tip?: string;
}

export const DEVICE_MANUALS: DeviceManual[] = [
  { device: "핸드드립 커피", ready: false, steps: [] },
  { device: "에어컨", ready: false, steps: [] },
  { device: "커피머신", ready: false, steps: [] },
  { device: "와이파이 연결", ready: false, steps: [] },
  { device: "다도(차) 이용", ready: false, steps: [] },
  { device: "블루투스 스피커", ready: false, steps: [] },
  { device: "씨네빔 큐브 빔프로젝터", ready: false, steps: [] },
  { device: "넷플릭스 연결", ready: false, steps: [] },
];

export function renderDeviceManualsForPrompt(): string {
  const lines = DEVICE_MANUALS.map((m) => {
    if (m.ready && m.steps.length > 0) {
      const stepsText = m.steps.map((s, i) => `${i + 1}) ${s}`).join(" ");
      return `- ${m.device}: ${stepsText}${m.tip ? ` (팁: ${m.tip})` : ""}`;
    }
    return `- ${m.device}: [아직 등록되지 않음 — 물으면 지어내지 말고 "정확한 사용법은 정리 중이니 웰컴 카드나 문의로 확인해 달라"고 안내]`;
  });

  return ["## 기기 사용법", ...lines].join("\n");
}
