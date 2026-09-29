"use client";

import { useActionState } from "react";
import { retrySignupConsents } from "@/app/auth/confirmed/actions";

export default function ConsentRecovery({ canRetry }: { canRetry: boolean }) {
  const [state, action, pending] = useActionState(retrySignupConsents, null);
  return <div className="mt-6 border border-stone-200 p-5 text-sm leading-6">
    <p role={state?.success ? "status" : "alert"}>{state?.message ?? (canRetry
      ? "이메일 인증은 완료되었지만 약관 동의 기록 저장을 확인하지 못했습니다. 아래 버튼으로 다시 저장해 주세요."
      : "가입 당시 약관 동의 기록을 확인하지 못했습니다. 가입한 브라우저에서 다시 확인해 주세요. 임시 정보가 만료되었거나 문제가 계속되면 새로 가입하지 마시고 고객지원에 문의해 주세요.")}</p>
    {canRetry && !state?.success && <form action={action}><button type="submit" disabled={pending} className="mt-4 border border-stone-300 px-4 py-3 disabled:opacity-50">{pending ? "동의 기록 저장 중…" : "동의 기록 다시 저장"}</button></form>}
  </div>;
}
