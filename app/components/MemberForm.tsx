"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { signupErrorMessage, validateSignup } from "@/lib/supabase/signup";
import { loginErrorMessage, safeNext, validateLogin } from "@/lib/supabase/login";
import { consentDocuments, consentTypes, emptyConsentChoices, type ConsentChoices } from "@/lib/supabase/consents";

type Mode = "login" | "signup" | "reset";
const inputClass = "mt-2 w-full rounded-none border border-stone-300 bg-white px-4 py-3.5 text-sm outline-offset-4 focus-visible:outline-stone-700";

export default function MemberForm({ mode, next }: { mode: Mode; next?: string }) {
  const [notice, setNotice] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [consents, setConsents] = useState<ConsentChoices>({ ...emptyConsentChoices });
  const allConsented = consentTypes.every((type) => consents[type]);
  const submitting = useRef(false);
  const signup = mode === "signup";
  const reset = mode === "reset";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reset) {
      setNotice("비밀번호 재설정은 준비 중입니다. 이메일은 발송되지 않았습니다.");
      return;
    }
    if (submitting.current || complete) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get("email") ?? "").trim();
    const password = String(fields.get("password") ?? "");
    const validation = signup
      ? validateSignup(email, password, String(fields.get("passwordConfirm") ?? ""), consents)
      : validateLogin(email, password);
    if (validation) { setNotice(validation); return; }
    submitting.current = true;
    setPending(true);
    setNotice("");
    try {
      if (!signup) {
        const { data, error } = await createClient().auth.signInWithPassword({ email, password });
        if (error || !data.session) {
          setNotice(loginErrorMessage(error?.code));
          return;
        }
        form.reset();
        setComplete(true);
        // A fresh document request verifies the new cookies on the server and
        // discards any prefetched anonymous layout/protected-page payloads.
        window.location.assign(safeNext(next));
        return;
      }
      const { data, error } = await createClient().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: new URL("/auth/callback", window.location.origin).toString() },
      });
      if (error) {
        console.warn("[auth/signup] Request failed", { status: error.status });
        setNotice(signupErrorMessage(error.code));
        return;
      }
      if (!data.user) { setNotice(signupErrorMessage()); return; }
      form.reset();
      setConsents({ ...emptyConsentChoices });
      setVisible(false);
      setComplete(true);
      if (data.session) {
        // Reload the server layout after cookies change; do not reuse prefetched auth state.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/auth/confirmed");
        return;
      }
      // Existing accounts may receive an obfuscated success response. Do not
      // promise delivery or infer that a new account was created from that response.
      setNotice("이메일을 확인해 주세요. 인증 메일이 도착했다면 가입한 기기와 브라우저에서 링크를 열어 주세요. 스팸함도 확인해 주세요. 이미 가입한 회원이라면 아래에서 로그인할 수 있습니다. 기존 회원에게는 새 인증 메일이 발송되지 않을 수 있습니다.");
    } catch {
      console.warn("[auth] Request unavailable");
      setComplete(false);
      setNotice(signup ? signupErrorMessage() : loginErrorMessage());
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <>
    {!reset && <div className="space-y-3">
      <button type="button" onClick={() => setNotice("카카오 로그인은 준비 중입니다. 아직 계정이 연결되지 않습니다.")} className="flex w-full items-center justify-center gap-3 bg-[#FEE500] px-5 py-4 text-sm font-medium text-[#191919]">
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.3 4.8 6.6L5.6 21l4.2-2.6c.7.1 1.5.2 2.2.2 5.5 0 10-3.5 10-7.8S17.5 3 12 3Z" /></svg>
        카카오로 시작하기
      </button>
      <button type="button" onClick={() => setNotice("Google 로그인은 준비 중입니다. 아직 계정이 연결되지 않습니다.")} className="w-full border border-stone-300 bg-white px-5 py-4 text-sm font-medium">Google로 시작하기</button>
      <div className="flex items-center gap-4 py-5 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200" />또는 이메일로 {signup ? "가입" : "로그인"}<span className="h-px flex-1 bg-stone-200" /></div>
    </div>}

    <form method="post" onSubmit={handleSubmit} noValidate={!reset} aria-busy={pending} className="space-y-5">
      <fieldset disabled={pending || complete} className="min-w-0 space-y-5">
      <label className="block text-sm" htmlFor="member-email">이메일<input id="member-email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} placeholder="example@email.com" /></label>
      {!reset && <>
        <div><div className="flex items-center justify-between"><label className="text-sm" htmlFor="member-password">비밀번호</label><button type="button" aria-controls="member-password" aria-pressed={visible} onClick={() => setVisible((value) => !value)} className="py-1 text-xs text-stone-500">{visible ? "숨기기" : "보기"}</button></div>
          <input id="member-password" name="password" type={visible ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} maxLength={128} className={inputClass} placeholder={signup ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"} />
        </div>
        {signup && <label className="block text-sm" htmlFor="member-confirm">비밀번호 확인<input id="member-confirm" name="passwordConfirm" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} placeholder="비밀번호를 한 번 더 입력해 주세요" /></label>}
      </>}
      {signup && <div className="border-y border-stone-200 py-5 text-sm">
        <label className="mb-5 flex items-start gap-3 border-b border-stone-200 pb-5 font-medium"><input type="checkbox" checked={allConsented} ref={(element) => { if (element) element.indeterminate = !allConsented && consentTypes.some((type) => consents[type]); }} onChange={(event) => { const checked = event.target.checked; setConsents({ terms: checked, privacy: checked, marketing_email: checked, marketing_sms: checked }); setNotice(""); }} className="mt-1 size-4 accent-stone-900" /><span>전체 동의 <span className="font-normal text-stone-500">(선택 항목 포함)</span></span></label>
        <div className="space-y-4">{consentTypes.map((type) => {
          const item = consentDocuments[type];
          return <div key={type} className="flex items-start justify-between gap-3">
            <label className="flex items-start gap-3"><input type="checkbox" name={type} required={item.required} checked={consents[type]} onChange={(event) => { setConsents((current) => ({ ...current, [type]: event.target.checked })); setNotice(""); }} className="mt-1 size-4 shrink-0 accent-stone-900" /><span>[{item.required ? "필수" : "선택"}] {item.label}</span></label>
            <Link href={item.document.path} target="_blank" rel="noopener noreferrer" aria-label={`${item.label} 내용 보기 (새 탭)`} className="shrink-0 text-xs leading-6 text-stone-500 underline underline-offset-4">보기</Link>
          </div>;
        })}</div>
        <p className="mt-5 text-xs leading-5 text-stone-500">약관 문서는 검토 중입니다. 현재 체크는 가입 화면의 입력 확인에만 사용하며 동의 이력과 마케팅 수신 동의는 저장하지 않습니다. 선택 항목에 동의하지 않아도 가입할 수 있습니다.</p>
      </div>}
      <button type="submit" disabled={pending || complete} className="w-full bg-stone-900 px-5 py-4 text-sm text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60">{pending ? (signup ? "가입 요청 중…" : "로그인 중…") : complete ? (signup ? "가입 요청 완료" : "이동 중…") : reset ? "재설정 메일 받기" : signup ? "회원가입" : "로그인"}</button>
      </fieldset>
    </form>

    {notice && <p role="status" className="mt-5 border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">{notice}</p>}
    {signup && notice && <div className="mt-4 text-center text-sm text-stone-600">
      <div className="flex justify-center gap-6"><Link href="/login" className="underline underline-offset-4">로그인하기</Link><Link href="/forgot-password" className="underline underline-offset-4">비밀번호 찾기</Link></div>
      <p className="mt-3 text-xs text-stone-500">비밀번호 재설정 기능은 준비 중입니다.</p>
    </div>}
    <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-stone-600">
      {!(signup && notice) && <Link href={signup || reset ? "/login" : "/signup"} className="underline-offset-4 hover:underline">{signup || reset ? "로그인으로 돌아가기" : "이메일로 회원가입"}</Link>}
      {mode === "login" && <Link href="/forgot-password" className="underline-offset-4 hover:underline">비밀번호 찾기</Link>}
    </div>
  </>;
}
