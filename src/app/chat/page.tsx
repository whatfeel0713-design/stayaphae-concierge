import type { Metadata } from "next";
import { cookies } from "next/headers";
import { BRAND } from "@/lib/brand";
import { getKstDaypart } from "@/lib/daypart";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { CodeGate } from "../code-gate";
import { ChatClient } from "./chat-client";

export const metadata: Metadata = {
  title: `AI 컨시어지 | ${BRAND.name}`,
  robots: { index: false, follow: false },
};

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  dawn: ["지금 나가도 괜찮을까요?", "내일 아침 산책 코스 알려줘", "조용히 쉴 수 있는 팁 있어?"],
  morning: ["오늘 아침 산책 코스 추천해줘", "근처에서 아침 먹을 곳 있어?", "체크아웃 전에 뭐 하면 좋을까?"],
  midday: ["점심 먹을 만한 로컬 맛집 알려줘", "오늘 날씨엔 뭐 하면 좋을까?", "갯벌 산책하기 좋은 때야?"],
  afternoon: ["천사대교 드라이브 코스 알려줘", "퍼플섬 어떻게 가?", "저녁 전에 뭐 하면 좋을까?"],
  sunset: ["노을이 가장 좋은 시간 알려줘", "노을 보기 좋은 스팟 어디야?", "지금 나가면 노을 볼 수 있어?"],
  evening: ["바베큐 준비 어떻게 해?", "불멍 어떻게 시작해?", "저녁에 갈만한 맛집 있어?"],
  night: ["불멍 파이어핏 어떻게 써?", "와이파이 비밀번호 어디 있어?", "밤에 조심할 거 있어?"],
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(GUIDE_SESSION_COOKIE)?.value;
  const session = token ? await verifyGuideSession(token) : null;

  if (!session) {
    return <CodeGate initialCode={code} />;
  }

  const daypart = getKstDaypart();
  const prompts = SUGGESTED_PROMPTS[daypart] ?? SUGGESTED_PROMPTS.midday;

  return <ChatClient suggestedPrompts={prompts} />;
}
