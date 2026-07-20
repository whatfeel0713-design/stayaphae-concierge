export type MoodKey = "rest" | "active" | "romantic";

export const MOOD_OPTIONS: { key: MoodKey; label: string; hint: string }[] = [
  { key: "rest", label: "완전히 아무것도 안 하기", hint: "느긋한 휴식 위주로 제안" },
  { key: "active", label: "섬을 돌아보기", hint: "드라이브·투어·산책 위주로 제안" },
  { key: "romantic", label: "둘만의 저녁", hint: "노을·바베큐·불멍 같은 저녁 위주로 제안" },
];

export function isMoodKey(value: unknown): value is MoodKey {
  return value === "rest" || value === "active" || value === "romantic";
}

export const MOOD_PROMPT_HINT: Record<MoodKey, string> = {
  rest:
    "이 손님은 '완전히 아무것도 안 하기'를 선택했다. 활동을 나열하기보다 느긋하게 쉴 수 있는 " +
    "제안(늦은 아침, 마당에서 책 읽기, 불멍)을 우선하고, 투어처럼 일정이 빡빡한 제안은 " +
    "손님이 먼저 묻지 않으면 꺼내지 마라.",
  active:
    "이 손님은 '섬을 돌아보기'를 선택했다. 드라이브 코스, 프라이빗 투어, 산책·나들이 제안을 " +
    "적극적으로 먼저 꺼내도 된다.",
  romantic:
    "이 손님은 '둘만의 저녁'을 선택했다. 노을, 바베큐, 불멍처럼 저녁 시간의 분위기 있는 제안을 " +
    "우선하고, 로맨틱한 톤을 살짝 더해도 된다(과하지 않게).",
};
