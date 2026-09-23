"use client";

import { useRef, useState, type FormEvent } from "react";
import { updateProfile } from "@/app/mypage/actions";
import { formatPhone, formatPhoneInput, validateProfile, type ProfileValues, type ProfileResult } from "@/lib/supabase/profile";

const inputClass = "mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm outline-offset-4 focus-visible:outline-stone-700";

export default function ProfileForm({ email, profile }: { email: string; profile: ProfileValues }) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [phone, setPhone] = useState(formatPhone(profile.phone));
  const [phoneError, setPhoneError] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const busy = useRef(false);
  function changePhone(input: HTMLInputElement, value: string, cursor: number) {
    const formatted = formatPhoneInput(value);
    setPhone(formatted.value);
    setPhoneError(formatted.error);
    setResult(null);
    const digitCount = value.slice(0, cursor).replace(/[^0-9]/g, "").length;
    let position = cursor;
    if (!formatted.error) {
      position = 0;
      for (let count = 0; position < formatted.value.length && count < digitCount; position++) {
        if (/[0-9]/.test(formatted.value[position])) count++;
      }
    }
    requestAnimationFrame(() => { if (document.activeElement === input) input.setSelectionRange(position, position); });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (phoneError) { setResult({ success: false, message: phoneError }); return; }
    const validated = validateProfile(name, phone);
    if (!validated.values) { setResult({ success: false, message: validated.error }); return; }
    const data = new FormData(event.currentTarget);
    busy.current = true;
    setPending(true);
    setResult(null);
    try {
      const response = await updateProfile(data);
      setResult(response);
      if (response.success) { setName(validated.values.display_name ?? ""); setPhone(formatPhone(validated.values.phone)); }
    } catch {
      setResult({ success: false, message: "저장 결과를 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요." });
    } finally { busy.current = false; setPending(false); }
  }
  return <form onSubmit={save} noValidate aria-busy={pending} className="max-w-xl py-6">
    <div className="mb-6"><p className="text-sm text-stone-600">이메일</p><p className="mt-2 break-all text-sm">{email}</p><p className="mt-2 text-xs text-stone-500">인증된 이메일이며 여기에서는 변경할 수 없습니다.</p></div>
    <fieldset disabled={pending} className="space-y-5">
      <label htmlFor="profile-name" className="block text-sm">이름<input id="profile-name" name="display_name" autoComplete="name" maxLength={50} value={name} onChange={(event) => { setName(event.target.value); setResult(null); }} className={inputClass} placeholder="이름을 입력해 주세요" /></label>
      <label htmlFor="profile-phone" className="block text-sm">휴대전화<input id="profile-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(event) => changePhone(event.currentTarget, event.target.value, event.target.selectionStart ?? event.target.value.length)} onKeyDown={(event) => {
        const input = event.currentTarget;
        const cursor = input.selectionStart;
        if (cursor === null || cursor !== input.selectionEnd || phoneError) return;
        // Deleting beside an automatic separator also deletes the adjacent digit.
        if (event.key === "Backspace" && cursor > 1 && phone[cursor - 1] === "-") {
          event.preventDefault();
          changePhone(input, phone.slice(0, cursor - 2) + phone.slice(cursor), cursor - 2);
        } else if (event.key === "Delete" && phone[cursor] === "-") {
          event.preventDefault();
          changePhone(input, phone.slice(0, cursor) + phone.slice(cursor + 2), cursor);
        }
      }} className={inputClass} placeholder="010-1234-5678" aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? "profile-phone-help profile-phone-error" : "profile-phone-help"} /></label>
      {phoneError && <p id="profile-phone-error" role="alert" className="text-sm text-red-700">{phoneError}</p>}
      <p id="profile-phone-help" className="text-xs leading-5 text-stone-500">010으로 시작하는 숫자 11자리를 입력하면 하이픈(-)이 자동으로 표시됩니다. 이름과 휴대전화를 비워 저장하면 등록된 정보가 삭제됩니다.</p>
      <button type="submit" disabled={pending} className="w-full bg-stone-900 px-6 py-3.5 text-sm text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{pending ? "저장 중…" : "저장"}</button>
    </fieldset>
    {result && <p role={result.success ? "status" : "alert"} className="mt-5 border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-700">{result.message}</p>}
  </form>;
}
