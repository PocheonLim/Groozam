"use client";

import Link from "next/link";
import { useState } from "react";

type Mode = "login" | "signup" | "reset";
const inputClass = "mt-2 w-full rounded-none border border-stone-300 bg-white px-4 py-3.5 text-sm outline-offset-4 focus-visible:outline-stone-700";

export default function MemberForm({ mode }: { mode: Mode }) {
  const [notice, setNotice] = useState("");
  const [visible, setVisible] = useState(false);
  const signup = mode === "signup";
  const reset = mode === "reset";

  return <>
    {!reset && <div className="space-y-3">
      <button type="button" onClick={() => setNotice("카카오 로그인은 준비 중입니다. 아직 계정이 연결되지 않습니다.")} className="flex w-full items-center justify-center gap-3 bg-[#FEE500] px-5 py-4 text-sm font-medium text-[#191919]">
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.8 1.9 5.3 4.8 6.6L5.6 21l4.2-2.6c.7.1 1.5.2 2.2.2 5.5 0 10-3.5 10-7.8S17.5 3 12 3Z" /></svg>
        카카오로 시작하기
      </button>
      <button type="button" onClick={() => setNotice("Google 로그인은 준비 중입니다. 아직 계정이 연결되지 않습니다.")} className="w-full border border-stone-300 bg-white px-5 py-4 text-sm font-medium">Google로 시작하기</button>
      <div className="flex items-center gap-4 py-5 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200" />또는 이메일로 {signup ? "가입" : "로그인"}<span className="h-px flex-1 bg-stone-200" /></div>
    </div>}

    <form method="post" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      if (signup && data.get("password") !== data.get("passwordConfirm")) { setNotice("비밀번호가 일치하지 않습니다. 다시 확인해 주세요."); return; }
      setNotice(reset ? "비밀번호 재설정은 준비 중입니다. 이메일은 발송되지 않았습니다." : signup ? "회원가입은 준비 중입니다. 입력한 정보는 저장되지 않았습니다." : "로그인 서비스는 준비 중입니다. 입력한 정보는 전송되지 않았습니다.");
    }} className="space-y-5">
      {signup && <label className="block text-sm" htmlFor="member-name">이름<input id="member-name" name="name" autoComplete="name" required maxLength={50} className={inputClass} placeholder="이름을 입력해 주세요" /></label>}
      <label className="block text-sm" htmlFor="member-email">이메일<input id="member-email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputClass} placeholder="example@email.com" /></label>
      {!reset && <>
        <div><div className="flex items-center justify-between"><label className="text-sm" htmlFor="member-password">비밀번호</label><button type="button" aria-controls="member-password" aria-pressed={visible} onClick={() => setVisible((value) => !value)} className="py-1 text-xs text-stone-500">{visible ? "숨기기" : "보기"}</button></div>
          <input id="member-password" name="password" type={visible ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} maxLength={128} className={inputClass} placeholder={signup ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"} />
        </div>
        {signup && <label className="block text-sm" htmlFor="member-confirm">비밀번호 확인<input id="member-confirm" name="passwordConfirm" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} className={inputClass} placeholder="비밀번호를 한 번 더 입력해 주세요" /></label>}
      </>}
      {signup && <div className="border-y border-stone-200 py-5 text-sm">
        <label className="flex items-start gap-3"><input type="checkbox" name="terms" required className="mt-1 size-4 accent-stone-900" /><span>[필수] 이용약관 및 개인정보 수집·이용 동의</span></label>
        <p className="mt-3 text-xs leading-5 text-stone-500">가입 화면 미리보기입니다. 정식 가입 시 확인할 약관과 개인정보 안내는 서비스 오픈 전에 제공됩니다.</p>
      </div>}
      <button type="submit" className="w-full bg-stone-900 px-5 py-4 text-sm text-white hover:bg-stone-700">{reset ? "재설정 메일 받기" : signup ? "회원가입" : "로그인"}</button>
    </form>

    {notice && <p role="status" className="mt-5 border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">{notice}</p>}
    <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-stone-600">
      <Link href={signup || reset ? "/login" : "/signup"} className="underline-offset-4 hover:underline">{signup || reset ? "로그인으로 돌아가기" : "이메일로 회원가입"}</Link>
      {mode === "login" && <Link href="/forgot-password" className="underline-offset-4 hover:underline">비밀번호 찾기</Link>}
    </div>
  </>;
}
