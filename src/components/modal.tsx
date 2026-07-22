"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}

/** 카드 클릭 시 뜨는 범용 팝업 — 이용안내 카드들이 공유하는 셸. */
export function Modal({ open, onClose, eyebrow, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <div className="relative max-h-full w-full max-w-md overflow-y-auto rounded-sm border border-line bg-cream p-8 shadow-xl md:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-5 top-5 text-lg text-stone transition-colors hover:text-ink"
        >
          ✕
        </button>
        {eyebrow && (
          <p className="pr-6 text-[0.65rem] font-medium uppercase tracking-[0.3em] text-bronze">
            {eyebrow}
          </p>
        )}
        <h3 className="mt-3 pr-6 font-serif text-xl font-light tracking-tight text-ink md:text-2xl">
          {title}
        </h3>
        <div className="mt-5 text-sm leading-7 text-stone">{children}</div>
      </div>
    </div>
  );
}
