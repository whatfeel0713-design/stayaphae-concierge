import "server-only";
import { nowInKst } from "@/lib/daypart";

/**
 * 실시간 날씨(기상청 단기예보)·물때(국립해양조사원 조위) 연동.
 *
 * ⚠️ 신뢰도 메모: 기상청 단기예보 API(getVilageFcst)는 오래되고 안정적인
 * 공공 API라 구조에 확신이 있다. 반면 국립해양조사원 조위 API는 이번
 * 세션에서 웹 검색이 일시적으로 막혀 최신 스펙을 재확인하지 못했다 —
 * 기억에 의존한 구현이므로, 실제 서비스키를 발급받으면 반드시 응답 형태를
 * 확인하고(콘솔 로그로 raw JSON을 한 번 찍어보는 걸 권장) 필요하면
 * parseTideSeries()를 공식 문서에 맞춰 조정할 것.
 *
 * 두 도구 모두 필요한 환경 변수가 없거나 호출이 실패하면 지어내지 않고
 * "확인이 어렵다"는 문장을 그대로 반환한다 — 컨시어지 페르소나의 원칙과
 * 동일하다.
 */

const KMA_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatYyyymmdd(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

/** 단기예보는 매 3시간(02/05/08/11/14/17/20/23시)에 발표되고, 발표 후 ~10분 뒤 API에 반영된다. */
function computeLatestBaseTime(now: Date): { date: string; time: string } {
  const adjusted = new Date(now.getTime() - 15 * 60_000);
  const candidates = KMA_BASE_HOURS.filter((h) => h <= adjusted.getHours());
  if (candidates.length > 0) {
    return { date: formatYyyymmdd(adjusted), time: `${pad2(candidates[candidates.length - 1])}00` };
  }
  const prevDay = new Date(adjusted.getTime() - 24 * 60 * 60_000);
  return { date: formatYyyymmdd(prevDay), time: "2300" };
}

const SKY_LABEL: Record<string, string> = { "1": "맑음", "3": "구름 많음", "4": "흐림" };
const PTY_LABEL: Record<string, string> = { "0": "", "1": "비", "2": "비/눈", "3": "눈", "4": "소나기" };

interface KmaItem {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

export async function fetchWeatherForecast(): Promise<string> {
  const serviceKey = process.env.KMA_SERVICE_KEY;
  const nx = process.env.KMA_NX;
  const ny = process.env.KMA_NY;
  if (!serviceKey || !nx || !ny) {
    return "날씨 연동이 아직 설정되지 않았어요 — 호스트에게 확인이 필요합니다.";
  }

  try {
    const kst = nowInKst();
    const { date, time } = computeLatestBaseTime(kst);
    const url = new URL("http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst");
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("numOfRows", "300");
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("dataType", "JSON");
    url.searchParams.set("base_date", date);
    url.searchParams.set("base_time", time);
    url.searchParams.set("nx", nx);
    url.searchParams.set("ny", ny);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`weather api status ${res.status}`);
    const json = await res.json();
    const items: KmaItem[] = json?.response?.body?.items?.item ?? [];
    if (items.length === 0) throw new Error("empty forecast payload");

    const nowKey = `${formatYyyymmdd(kst)}${pad2(kst.getHours())}00`;
    const slots = Array.from(new Set(items.map((i) => `${i.fcstDate}${i.fcstTime}`))).sort();
    const targetSlot = slots.find((slot) => slot >= nowKey) ?? slots[0];
    const targetItems = items.filter((i) => `${i.fcstDate}${i.fcstTime}` === targetSlot);

    const get = (category: string) => targetItems.find((i) => i.category === category)?.fcstValue;
    const tmp = get("TMP");
    const sky = get("SKY");
    const pty = get("PTY");
    const pop = get("POP");
    const pcp = get("PCP");

    const skyLabel = pty && pty !== "0" ? PTY_LABEL[pty] : (sky ? SKY_LABEL[sky] : null) ?? "정보 없음";
    const hour = targetSlot.slice(8, 10);
    const parts = [`${hour}시 기준`];
    if (tmp) parts.push(`기온 ${tmp}℃`);
    parts.push(`하늘 ${skyLabel}`);
    if (pop) parts.push(`강수확률 ${pop}%`);
    if (pcp && pcp !== "강수없음") parts.push(`강수량 ${pcp}`);

    return parts.join(", ") + ".";
  } catch (error) {
    console.error("[weather] fetch failed:", error);
    return "지금은 날씨 정보를 가져오지 못했어요 — 잠시 후 다시 시도해 주세요.";
  }
}

interface TidePoint {
  time: string;
  level: number;
}

/** 10분 간격 조위 시계열에서 극값(만조/간조)을 찾는다. */
function findTideExtremes(series: TidePoint[]): { time: string; type: "만조" | "간조" }[] {
  const extremes: { time: string; type: "만조" | "간조" }[] = [];
  for (let i = 1; i < series.length - 1; i++) {
    const prev = series[i - 1].level;
    const curr = series[i].level;
    const next = series[i + 1].level;
    if (curr >= prev && curr >= next && curr > prev) {
      extremes.push({ time: series[i].time, type: "만조" });
    } else if (curr <= prev && curr <= next && curr < prev) {
      extremes.push({ time: series[i].time, type: "간조" });
    }
  }
  return extremes;
}

export async function fetchTideInfo(): Promise<string> {
  const serviceKey = process.env.KHOA_SERVICE_KEY;
  const obsCode = process.env.KHOA_OBS_CODE;
  if (!serviceKey || !obsCode) {
    return "물때 연동이 아직 설정되지 않았어요 — 호스트에게 확인이 필요합니다.";
  }

  try {
    const kst = nowInKst();
    const dateStr = formatYyyymmdd(kst);
    const url = new URL("http://www.khoa.go.kr/api/oceangrid/tideObsPreTab/search.do");
    url.searchParams.set("ServiceKey", serviceKey);
    url.searchParams.set("ObsCode", obsCode);
    url.searchParams.set("Date", dateStr);
    url.searchParams.set("ResultType", "json");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`tide api status ${res.status}`);
    const json = await res.json();
    const rows: { record_time?: string; tph_level?: string }[] = json?.result?.data ?? [];
    const series: TidePoint[] = rows
      .filter((r) => r.record_time && r.tph_level)
      .map((r) => ({ time: r.record_time!.slice(11, 16), level: Number(r.tph_level) }))
      .filter((p) => Number.isFinite(p.level));

    if (series.length < 3) throw new Error("empty tide series");

    const extremes = findTideExtremes(series);
    if (extremes.length === 0) throw new Error("no tide extremes found");

    const summary = extremes.map((e) => `${e.time} ${e.type}`).join(", ");
    return `오늘 물때: ${summary}. 갯벌 산책은 간조 전후 1~2시간이 좋습니다.`;
  } catch (error) {
    console.error("[tide] fetch failed:", error);
    return "지금은 물때 정보를 가져오지 못했어요 — 잠시 후 다시 시도해 주세요.";
  }
}
