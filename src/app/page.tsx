import { cookies } from "next/headers";
import { Reveal } from "@/components/reveal";
import { BRAND } from "@/lib/brand";
import { MAP_LINKS } from "@/lib/map-links";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { CodeGate } from "./code-gate";

/**
 * 게스트 가이드 콘텐츠 — 메인 사이트(staysoom) src/app/guide/page.tsx에서
 * 그대로 이식(concierge-app-design.md Phase A). 맛집 상호 등은 플레이스홀더 —
 * 실제 정보로 교체할 것.
 */
const MANUAL_ITEMS = [
  {
    title: "체크인 · 체크아웃",
    body: `${BRAND.checkInOut}. 셀프 체크인 — 도어록 비밀번호는 체크인 당일 문자로 안내드립니다.`,
  },
  {
    title: "와이파이",
    body: "네트워크 이름과 비밀번호는 거실의 웰컴 카드에 적어두었습니다.",
  },
  {
    title: "바베큐",
    body: "이용 전날까지 말씀해 주시면 원하는 시간에 맞춰 준비해 드립니다. 이용 시간은 저녁 9시까지입니다.",
  },
  {
    title: "불멍 파이어핏",
    body: "마당의 파이어핏은 자유롭게 이용하실 수 있습니다. 장작은 창고에 준비되어 있습니다.",
  },
  {
    title: "분리수거",
    body: "쓰레기는 마당 한쪽의 분리수거함에 배출해 주세요. 퇴실 시 음식물만 따로 부탁드립니다.",
  },
  {
    title: "조용한 밤",
    body: "하루 한 팀의 독채이지만, 이웃 마을의 밤을 위해 밤 10시 이후에는 마당 소음을 낮춰주세요.",
  },
  {
    title: "안전",
    body: "소화기는 현관과 주방에 있습니다. 급한 일은 언제든 아래 연락처로 주세요 — 가까이에 있습니다.",
  },
  {
    title: "전기차 충전",
    body: "마당에 충전용 콘센트가 준비되어 있습니다. 인근 공공 급속충전소 위치는 체크인 시 함께 안내드립니다.",
  },
];

const DINING_SPOTS = [
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

const COURSES = [
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
          { time: "10:00", text: "갯벌 해안 산책 — 물때에 따라 전혀 다른 풍경" },
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

const GUIDE_NAV = [
  { href: "#manual", label: "이용 안내" },
  { href: "#directions", label: "오시는 길" },
  { href: "#dining", label: "로컬 맛집" },
  { href: "#courses", label: "추천 코스" },
];

export default async function Home({
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

  return (
    <div className="flex flex-col">
      {/* ---------- Hero ---------- */}
      <section className="bg-ink pb-16 pt-24 text-cream md:pb-24 md:pt-32">
        <div className="mx-auto w-full max-w-4xl px-6 text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.5em] text-cream/70">
            Aphae Concierge
          </p>
          <h1 className="mt-6 font-serif text-3xl font-light leading-snug tracking-tight sm:text-4xl md:text-5xl">
            머무는 동안,
            <br />
            필요한 모든 것
          </h1>
          <p className="mx-auto mt-7 max-w-md text-sm font-light leading-8 text-cream/75 md:text-base">
            체크인부터 로컬 맛집, 섬을 도는 코스까지 —
            <br className="hidden sm:block" />
            {BRAND.name}의 안내를 한곳에 모았습니다.
          </p>
          <nav className="mt-10 flex flex-wrap justify-center gap-3">
            {GUIDE_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-cream/25 px-5 py-2 text-xs font-medium tracking-wide text-cream/85 transition-all duration-300 hover:border-cream hover:bg-cream/10"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* ---------- Manual ---------- */}
      <section id="manual" className="scroll-mt-20 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
          <Reveal>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
              Manual
            </p>
            <h2 className="mt-5 font-serif text-3xl font-light tracking-tight text-ink md:text-4xl">
              이용 안내
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
            {MANUAL_ITEMS.map((item, i) => (
              <Reveal key={item.title} delay={(i % 3) as 0 | 1 | 2}>
                <div className="border-t border-ink/15 pt-6">
                  <h3 className="text-base font-medium tracking-wide text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Directions ---------- */}
      <section id="directions" className="scroll-mt-20 border-y border-line bg-cream-deep py-24 md:py-32">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 md:flex-row md:items-start md:justify-between md:px-10">
          <Reveal className="max-w-md">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
              Directions
            </p>
            <h2 className="mt-5 font-serif text-3xl font-light leading-snug tracking-tight text-ink md:text-4xl">
              오시는 길
            </h2>
            <p className="mt-6 text-sm leading-7 text-stone">
              목포에서 압해대교를 건너면 섬의 시간이 시작됩니다.
              내비게이션에 아래 주소를 입력하시거나, 버튼 한 번으로 길 안내를 여세요.
            </p>
          </Reveal>
          <Reveal delay={1} className="flex max-w-sm flex-col gap-6">
            <div>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-stone">
                Address
              </p>
              <p className="mt-2 text-sm leading-7 text-ink-soft">{BRAND.address}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {MAP_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-ink/30 px-6 py-2.5 text-sm font-medium tracking-wide text-ink transition-all duration-300 hover:border-ink hover:bg-ink hover:text-cream"
                >
                  {link.name} →
                </a>
              ))}
            </div>
            <p className="text-xs leading-6 text-stone">
              T맵 링크는 앱이 설치된 모바일에서 열립니다.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- Dining ---------- */}
      <section id="dining" className="scroll-mt-20 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
          <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
                Local Dining
              </p>
              <h2 className="mt-5 font-serif text-3xl font-light tracking-tight text-ink md:text-4xl">
                주인장 로컬 맛집
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-stone">
              관광지 말고, 주인장이 진짜 다니는 곳들.
              머무는 동안만 알려드리는 목록입니다.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2">
            {DINING_SPOTS.map((spot, i) => (
              <Reveal key={spot.name} delay={(i % 2) as 0 | 1}>
                <div className="flex h-full flex-col rounded-sm border border-line bg-cream p-8">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-bronze">
                      {spot.tag}
                    </span>
                    <span className="text-xs tracking-wide text-stone">{spot.distance}</span>
                  </div>
                  <h3 className="mt-4 font-serif text-xl text-ink">{spot.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone">{spot.note}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Courses ---------- */}
      <section id="courses" className="scroll-mt-20 border-t border-line bg-cream-deep py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
          <Reveal>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
              Courses
            </p>
            <h2 className="mt-5 font-serif text-3xl font-light tracking-tight text-ink md:text-4xl">
              머무는 길이에 맞춘 코스
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10">
            {COURSES.map((course, i) => (
              <Reveal key={course.label} delay={(i % 2) as 0 | 1}>
                <div className="rounded-sm border border-line bg-cream p-8 md:p-10">
                  <p className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-bronze">
                    {course.label}
                  </p>
                  <h3 className="mt-3 font-serif text-2xl font-light text-ink">
                    {course.title}
                  </h3>
                  <div className="mt-8 flex flex-col gap-8">
                    {course.days.map((day) => (
                      <div key={day.day}>
                        <p className="text-xs font-medium tracking-[0.2em] text-stone">
                          {day.day}
                        </p>
                        <ul className="mt-4 flex flex-col gap-3 border-l border-ink/15 pl-5">
                          {day.stops.map((stop) => (
                            <li key={`${day.day}-${stop.time}`} className="text-sm leading-7">
                              <span className="mr-3 font-medium tabular-nums text-ink">
                                {stop.time}
                              </span>
                              <span className="text-stone">{stop.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Secret coupon note ---------- */}
      <section className="py-20 md:py-28">
        <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
            Secret
          </p>
          <h2 className="mt-5 font-serif text-2xl font-light leading-snug tracking-tight text-ink md:text-3xl">
            지역상생 시크릿 쿠폰
          </h2>
          <p className="mt-6 max-w-md text-sm leading-8 text-stone">
            이웃 가게들과 함께 만든 투숙객 전용 혜택입니다.
            체크인 시 웰컴 카드와 함께 안내드립니다 — 머무는 동안만 유효합니다.
          </p>
        </Reveal>
      </section>

      {/* ---------- Contact band ---------- */}
      <section className="border-t border-line bg-cream-deep py-20 md:py-24">
        <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-6 text-center">
          <p className="font-serif text-2xl font-light leading-snug tracking-tight text-ink md:text-3xl">
            궁금한 것이 남아 있다면,
            <br />
            언제든 편하게 물어보세요
          </p>
          <a
            href={`mailto:${BRAND.email}`}
            className="rounded-full bg-ink px-9 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:bg-ink-soft hover:shadow-lg hover:shadow-ink/20"
          >
            문의하기
          </a>
        </Reveal>
      </section>
    </div>
  );
}
