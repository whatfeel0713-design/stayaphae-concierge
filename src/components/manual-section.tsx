"use client";

import { useActionState, useState } from "react";
import { submitBbqRequestAction, type BbqRequestState } from "@/app/actions";
import type { ManualItem } from "@/lib/guide-content";
import { Modal } from "@/components/modal";
import { SiteMapDiagram } from "@/components/site-map-diagram";
import { Reveal } from "@/components/reveal";

const CARD_HINT: Record<ManualItem["kind"], string> = {
  info: "눌러서 자세히 보기",
  bbq: "눌러서 시간 예약하기",
  "site-map": "눌러서 위치 확인하기",
  link: "눌러서 현황 확인하기",
};

export function ManualSection({ items }: { items: ManualItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openItem = openIndex !== null ? items[openIndex] : null;

  return (
    <>
      <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={(i % 3) as 0 | 1 | 2}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group w-full border-t border-ink/15 pt-6 text-left transition-colors duration-300 hover:border-ink/40"
            >
              <h3 className="text-base font-medium tracking-wide text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-stone">{item.body}</p>
              <span className="mt-4 inline-block text-xs tracking-wide text-bronze opacity-80 transition-opacity group-hover:opacity-100">
                {CARD_HINT[item.kind]} →
              </span>
            </button>
          </Reveal>
        ))}
      </div>

      <Modal
        open={openItem !== null}
        onClose={() => setOpenIndex(null)}
        eyebrow="Manual"
        title={openItem?.title ?? ""}
      >
        {openItem?.kind === "info" && <p>{openItem.body}</p>}

        {openItem?.kind === "bbq" && <BbqReservationForm item={openItem} />}

        {openItem?.kind === "site-map" && (
          <div className="flex flex-col gap-5">
            <p>{openItem.body}</p>
            <SiteMapDiagram highlight={openItem.highlight} />
            <p className="text-xs leading-6 text-stone/80">
              실제 배치와 다소 다를 수 있는 간편 위치도입니다 — 정확한 위치는 체크인 시 다시 안내해 드립니다.
            </p>
          </div>
        )}

        {openItem?.kind === "link" && (
          <div className="flex flex-col gap-5">
            <p>{openItem.body}</p>
            <a
              href={openItem.linkHref}
              target="_blank"
              rel="noreferrer"
              className="self-start rounded-full border border-ink/30 px-6 py-2.5 text-sm font-medium tracking-wide text-ink transition-all duration-300 hover:border-ink hover:bg-ink hover:text-cream"
            >
              {openItem.linkLabel} →
            </a>
          </div>
        )}
      </Modal>
    </>
  );
}

function BbqReservationForm({
  item,
}: {
  item: Extract<ManualItem, { kind: "bbq" }>;
}) {
  const initialState: BbqRequestState = {};
  const [state, formAction, pending] = useActionState(submitBbqRequestAction, initialState);

  if (state.success) {
    return (
      <p className="text-ink">
        신청이 접수되었습니다. 호스트가 확인 후 준비합니다 — 확정 여부는 별도로 안내드릴게요.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <p>{item.body}</p>
      <label className="flex flex-col gap-2 text-left">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-stone">
          희망 시간
        </span>
        <select
          name="preferred_time"
          required
          defaultValue=""
          className="field-underline w-full text-left"
        >
          <option value="" disabled>
            선택해 주세요
          </option>
          {item.timeSlots.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-left">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-stone">
          참고 사항 (선택)
        </span>
        <textarea
          name="notes"
          rows={2}
          placeholder="인원 수, 요청 사항 등"
          className="field-underline w-full resize-none text-left"
        />
      </label>
      {state.error && <p className="text-xs text-bronze">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-ink px-7 py-3 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:bg-ink-soft disabled:opacity-50"
      >
        {pending ? "신청 중..." : "신청하기"}
      </button>
    </form>
  );
}
