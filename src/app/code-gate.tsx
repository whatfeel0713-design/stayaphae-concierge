"use client";

import { useActionState, useEffect, useRef } from "react";
import { verifyCodeAction, type VerifyCodeState } from "./actions";

const initialState: VerifyCodeState = {};

/**
 * `/?code=xxxxx` 링크로 들어오면 코드를 자동 제출해 세션 쿠키를 발급받고,
 * 코드 없이(또는 검증 실패 후) 들어오면 직접 입력할 수 있는 폼을 보여준다.
 */
export function CodeGate({ initialCode }: { initialCode?: string }) {
  const [state, formAction, pending] = useActionState(verifyCodeAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (initialCode && !autoSubmitted.current) {
      autoSubmitted.current = true;
      formRef.current?.requestSubmit();
    }
  }, [initialCode]);

  const showAutoState = Boolean(initialCode) && !state.error;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 pt-40 text-center">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.45em] text-bronze">
        Aphae Concierge
      </p>
      <h1 className="mt-6 font-serif text-3xl font-light leading-snug tracking-tight text-ink md:text-4xl">
        예약 확정 고객을 위한
        <br />
        전용 안내입니다
      </h1>

      {showAutoState ? (
        <p className="mt-6 max-w-sm text-sm leading-7 text-stone">
          {pending ? "코드를 확인하는 중입니다..." : "코드를 확인하는 중입니다..."}
        </p>
      ) : (
        <p className="mt-6 max-w-sm text-sm leading-7 text-stone">
          예약 확정 시 안내 메일과 함께 받으신 링크로 접속해 주세요.
          코드를 직접 입력하실 수도 있습니다.
        </p>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="mt-10 flex w-full max-w-xs flex-col items-center gap-4"
      >
        {initialCode ? (
          <input type="hidden" name="code" value={initialCode} />
        ) : (
          <input
            type="text"
            name="code"
            placeholder="예약 코드"
            autoComplete="off"
            className="field-underline w-full text-center"
          />
        )}
        {!initialCode && (
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-9 py-3.5 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:bg-ink-soft hover:shadow-lg hover:shadow-ink/20 disabled:opacity-50"
          >
            {pending ? "확인 중..." : "입장하기"}
          </button>
        )}
      </form>

      {state.error && (
        <p className="mt-5 max-w-sm text-sm leading-6 text-bronze">{state.error}</p>
      )}
    </div>
  );
}
