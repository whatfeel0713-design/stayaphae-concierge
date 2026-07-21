import Link from "next/link";
import { cookies } from "next/headers";
import { Reveal } from "@/components/reveal";
import { BRAND } from "@/lib/brand";
import { MAP_LINKS } from "@/lib/map-links";
import {
  COURSES,
  DINING_SPOTS,
  GUIDE_NAV,
  MANUAL_ITEMS,
  SECRET_COUPON_NOTE,
} from "@/lib/guide-content";
import { PRIVATE_TOURS } from "@/lib/private-tours";
import { getKstDaypart } from "@/lib/daypart";
import { GUIDE_SESSION_COOKIE, verifyGuideSession } from "@/lib/session";
import { CodeGate } from "./code-gate";

const NAV_WITH_CHAT = [...GUIDE_NAV, { href: "/chat", label: "AI 컨시어지" }];

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

  const daypart = getKstDaypart();
  const quietHours = daypart === "night" || daypart === "dawn";

  return (
    <div className="flex flex-col">
      {quietHours && (
        <div className="bg-ink-soft px-6 py-2.5 text-center text-xs leading-6 text-cream/80">
          지금은 조용한 시간이에요 — 이웃 마을을 위해 마당 소음을 낮춰주시면 좋아요.
        </div>
      )}
      {/* ---------- Hero ---------- */}
      <section className="bg-ink pb-16 pt-24 text-cream md:pb-24 md:pt-32">
        <div className="mx-auto w-full max-w-4xl px-6 text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.5em] text-cream/70">
            Aphae Concierge
          </p>
          <h1 className="mt-6 font-serif text-3xl font-light leading-snug tracking-tight sm:text-4xl md:text-5xl">
            {session.guestName ? `${session.guestName}님, 어서오세요` : "머무는 동안,"}
            <br />
            {session.guestName ? "필요한 모든 것을 도와드릴게요" : "필요한 모든 것"}
          </h1>
          <p className="mx-auto mt-7 max-w-md text-sm font-light leading-8 text-cream/75 md:text-base">
            체크인부터 로컬 맛집, 섬을 도는 코스까지 —
            <br className="hidden sm:block" />
            {BRAND.name}의 안내를 한곳에 모았습니다.
          </p>
          <nav className="mt-10 flex flex-wrap justify-center gap-3">
            {NAV_WITH_CHAT.map((item) => (
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

      {/* ---------- AI Concierge teaser ---------- */}
      <section className="border-b border-line bg-cream-deep py-16 md:py-20">
        <Reveal className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
            Ask Anything
          </p>
          <h2 className="max-w-lg font-serif text-2xl font-light leading-snug tracking-tight text-ink md:text-3xl">
            &ldquo;오늘 노을은 몇 시가 좋아요?&rdquo;
            <br className="hidden sm:block" />
            머무는 동안, 무엇이든 물어보세요
          </h2>
          <p className="max-w-md text-sm leading-7 text-stone">
            이용 안내부터 로컬 맛집, 오늘의 코스 추천까지 — {BRAND.name}의 AI
            컨시어지가 이 안내 전체를 알고 있습니다. 검색하지 말고, 그냥 물어보세요.
          </p>
          <Link
            href="/chat"
            className="mt-2 rounded-full bg-ink px-9 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:bg-ink-soft hover:shadow-lg hover:shadow-ink/20"
          >
            AI 컨시어지에게 물어보기 →
          </Link>
        </Reveal>
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

      {/* ---------- Private tours ---------- */}
      <section id="tours" className="scroll-mt-20 py-24 md:py-32">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
          <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
                Private Tours
              </p>
              <h2 className="mt-5 font-serif text-3xl font-light tracking-tight text-ink md:text-4xl">
                다리로 이어진 섬들, 프라이빗 투어
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-stone">
              압해도는 천사대교로 암태도·팔금도·안좌도·자은도까지, 퍼플교로
              반월도·박지도까지 배 없이 이어집니다. 머무는 길이에 맞춰
              동선을 컨시어지와 상의해 보세요.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PRIVATE_TOURS.map((tour, i) => (
              <Reveal key={tour.title} delay={(i % 4 === 0 ? 0 : (i % 4) as 1 | 2 | 3)}>
                <div className="flex h-full flex-col rounded-sm border border-line bg-cream-deep p-7">
                  <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em] text-bronze">
                    {tour.duration}
                  </span>
                  <h3 className="mt-3 font-serif text-lg text-ink">{tour.title}</h3>
                  <p className="mt-2 text-xs tracking-wide text-stone">{tour.islands}</p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {tour.highlights.map((h) => (
                      <li key={h} className="text-xs leading-6 text-stone">
                        · {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-xs leading-6 text-stone">
            렌터카·기사·보트 섭외는 아직 자동 예약이 연결되어 있지 않습니다 —
            일정을 정하고 싶다면 AI 컨시어지에게 먼저 물어보시거나{" "}
            <a href={`mailto:${BRAND.email}`} className="underline underline-offset-2">
              문의
            </a>
            로 남겨주세요.
          </p>
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
          <p className="mt-6 max-w-md text-sm leading-8 text-stone">{SECRET_COUPON_NOTE}</p>
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/chat"
              className="rounded-full bg-ink px-9 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:bg-ink-soft hover:shadow-lg hover:shadow-ink/20"
            >
              AI 컨시어지에게 묻기
            </Link>
            <a
              href={`mailto:${BRAND.email}`}
              className="rounded-full border border-ink/30 px-9 py-3.5 text-sm font-medium tracking-wide text-ink transition-all duration-300 hover:border-ink hover:bg-ink hover:text-cream"
            >
              문의하기
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
