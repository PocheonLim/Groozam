"use client";

import { formatPhoneInput } from "@/lib/supabase/profile";

export default function PhoneInput({ id, value, error, onChange, required = false }: { id: string; value: string; error: string; onChange: (value: string, error: string) => void; required?: boolean }) {
  function change(input: HTMLInputElement, raw: string, cursor: number) {
    const formatted = formatPhoneInput(raw);
    onChange(formatted.value, formatted.error);
    const digitCount = raw.slice(0, cursor).replace(/[^0-9]/g, "").length;
    let position = cursor;
    if (!formatted.error) {
      position = 0;
      for (let count = 0; position < formatted.value.length && count < digitCount; position++) if (/[0-9]/.test(formatted.value[position])) count++;
    }
    requestAnimationFrame(() => { if (document.activeElement === input) input.setSelectionRange(position, position); });
  }
  return <div>
    <label htmlFor={id} className="block text-sm">휴대전화{required ? " (필수)" : ""}</label>
    <input id={id} name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required={required} value={value} onChange={(event) => change(event.currentTarget, event.target.value, event.target.selectionStart ?? event.target.value.length)} onKeyDown={(event) => {
      const input = event.currentTarget;
      const cursor = input.selectionStart;
      if (cursor === null || cursor !== input.selectionEnd || error) return;
      if (event.key === "Backspace" && cursor > 1 && value[cursor - 1] === "-") {
        event.preventDefault(); change(input, value.slice(0, cursor - 2) + value.slice(cursor), cursor - 2);
      } else if (event.key === "Delete" && value[cursor] === "-") {
        event.preventDefault(); change(input, value.slice(0, cursor) + value.slice(cursor + 2), cursor);
      }
    }} className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-sm outline-offset-4 focus-visible:outline-stone-700" placeholder="010-1234-5678" aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} />
    {error && <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    <p id={`${id}-help`} className="mt-2 text-xs leading-5 text-stone-500">010으로 시작하는 숫자 11자리를 입력하면 하이픈(-)이 자동으로 표시됩니다.</p>
  </div>;
}
