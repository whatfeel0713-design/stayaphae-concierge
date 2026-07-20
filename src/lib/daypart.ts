const KST_OFFSET_MINUTES = 9 * 60;

export type Daypart = "dawn" | "morning" | "midday" | "afternoon" | "sunset" | "evening" | "night";

export function nowInKst(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + KST_OFFSET_MINUTES * 60_000);
}

export function getKstDaypart(date: Date = nowInKst()): Daypart {
  const hour = date.getHours();
  if (hour < 6) return "dawn";
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 17) return "afternoon";
  if (hour < 19) return "sunset";
  if (hour < 22) return "evening";
  return "night";
}

export const DAYPART_LABEL_KO: Record<Daypart, string> = {
  dawn: "깊은 밤",
  morning: "아침",
  midday: "낮",
  afternoon: "오후",
  sunset: "노을이 드는 시간",
  evening: "저녁",
  night: "밤",
};
