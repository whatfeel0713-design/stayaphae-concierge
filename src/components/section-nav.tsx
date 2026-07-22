"use client";

import { useEffect, useState } from "react";

const SECTION_LINKS = [
  { id: "manual", label: "이용 안내", href: "#manual" },
  { id: "directions", label: "오시는 길", href: "#directions" },
  { id: "dining", label: "로컬 맛집", href: "#dining" },
  { id: "courses", label: "추천 코스", href: "#courses" },
  { id: "tours", label: "프라이빗 투어", href: "#tours" },
] as const;

const CHAT_LINK = { id: "chat", label: "AI 컨시어지", href: "/chat" } as const;

/**
 * 넓은 화면(2xl+)에서만 왼쪽 여백에 고정되는 섹션 바로가기 내비게이션.
 * 히어로를 지나면 나타나고, IntersectionObserver로 현재 보고 있는
 * 섹션을 하이라이트한다.
 */
export function SectionNav() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const heroSentinel = document.getElementById("hero-end");
    const heroObserver = heroSentinel
      ? new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
          threshold: 0,
        })
      : null;
    if (heroSentinel && heroObserver) heroObserver.observe(heroSentinel);

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );
    const sections = SECTION_LINKS.map((link) => document.getElementById(link.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    sections.forEach((el) => sectionObserver.observe(el));

    return () => {
      heroObserver?.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <nav
      aria-label="섹션 바로가기"
      className={`fixed left-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 transition-opacity duration-500 2xl:flex ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {[...SECTION_LINKS, CHAT_LINK].map((link) => {
        const isActive = link.id === activeId;
        return (
          <a
            key={link.id}
            href={link.href}
            className={`group flex items-center gap-3 py-1 text-xs tracking-wide transition-colors duration-300 ${
              isActive ? "font-medium text-ink" : "text-stone hover:text-ink"
            }`}
          >
            <span
              className={`h-px shrink-0 transition-all duration-300 ${
                isActive ? "w-6 bg-ink" : "w-3 bg-stone/50 group-hover:w-4 group-hover:bg-ink/60"
              }`}
            />
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
