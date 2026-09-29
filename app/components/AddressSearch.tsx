"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

type PostcodeResult = {
  zonecode: string;
  userSelectedType: "R" | "J";
  roadAddress: string;
  jibunAddress: string;
};
type PostcodeConstructor = new (options: {
  width: string;
  height: string;
  minWidth: number;
  oncomplete: (result: PostcodeResult) => void;
  onresize: (size: { height: number }) => void;
}) => { embed: (element: HTMLElement) => void };

declare global {
  interface Window {
    kakao?: { Postcode?: PostcodeConstructor };
  }
}

const inputClass = "mt-2 w-full min-w-0 border border-stone-300 px-4 py-3 text-sm outline-offset-4 focus-visible:outline-stone-700";
const failureMessage = "주소 검색 서비스를 불러오지 못했습니다. 네트워크 연결을 확인하고 페이지를 새로고침해 주세요.";

export default function AddressSearch({ postalCode = "", addressLine1 = "", addressLine2 = "" }: {
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
}) {
  const id = useId();
  const [postal, setPostal] = useState(postalCode);
  const [address, setAddress] = useState(addressLine1);
  const [detail, setDetail] = useState(addressLine2);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const detailInput = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const selected = useRef({ postal: postalCode, address: addressLine1 });

  // Timeout also covers a script request which never finishes.
  useEffect(() => {
    if (!open || ready || error) return;
    const timeout = window.setTimeout(() => setError(failureMessage), 15000);
    return () => window.clearTimeout(timeout);
  }, [open, ready, error]);

  useEffect(() => {
    const host = container.current;
    const Postcode = window.kakao?.Postcode;
    if (!open || !ready || error || !host || !Postcode) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setError(failureMessage);
    }, 15000);
    try {
      new Postcode({
        width: "100%",
        height: "100%",
        minWidth: 200,
        onresize(size) {
          if (!active) return;
          window.clearTimeout(timeout);
          host.style.height = `${Math.max(400, size.height)}px`;
        },
        oncomplete(result) {
          if (!active) return;
          const nextAddress = result.userSelectedType === "R" ? result.roadAddress : result.jibunAddress;
          if (!/^\d{5}$/.test(result.zonecode) || !nextAddress || nextAddress.length > 300) {
            setError("선택한 주소를 확인할 수 없습니다. 검색 창을 닫고 다시 검색해 주세요.");
            return;
          }
          if (selected.current.postal !== result.zonecode || selected.current.address !== nextAddress) setDetail("");
          selected.current = { postal: result.zonecode, address: nextAddress };
          setPostal(result.zonecode);
          setAddress(nextAddress);
          setOpen(false);
          detailInput.current?.focus();
        },
      }).embed(host);
    } catch {
      // Delay state changes out of the effect body, and ignore unmounted instances.
      queueMicrotask(() => { if (active) setError(failureMessage); });
    }
    return () => {
      active = false;
      window.clearTimeout(timeout);
      host.replaceChildren();
    };
  }, [open, ready, error]);

  function close() {
    setOpen(false);
    searchButton.current?.focus();
  }

  return <div className="min-w-0 space-y-5">
    <Script src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive"
      onReady={() => { if (searchButton.current) { setReady(Boolean(window.kakao?.Postcode)); setError(window.kakao?.Postcode ? "" : failureMessage); } }}
      onError={() => { if (searchButton.current) setError(failureMessage); }} />
    <div>
      <label htmlFor={`${id}-postal`} className="block text-sm">우편번호 (필수)</label>
      <div className="flex flex-wrap items-end gap-2">
        <input id={`${id}-postal`} name="postal_code" value={postal} readOnly required autoComplete="shipping postal-code" placeholder="우편번호" className={`${inputClass} max-w-36 bg-stone-50`} />
        <button ref={searchButton} type="button" aria-expanded={open} aria-controls={open ? `${id}-search` : undefined} onClick={() => { if (ready) setError(""); setOpen(true); }} className="min-h-11 border border-stone-300 px-4 py-3 text-sm hover:border-stone-700">우편번호 찾기</button>
      </div>
    </div>
    {open && <section id={`${id}-search`} aria-label="우편번호 검색" className="min-w-0 border border-stone-300" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
      <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-3 py-2"><span className="text-sm">주소 검색</span><button type="button" onClick={close} className="min-h-11 px-3 text-sm underline underline-offset-4">검색 닫기</button></div>
      {error ? <p role="alert" className="p-4 text-sm leading-6 text-red-700">{error}</p> : <>
        {!ready && <p role="status" className="p-4 text-sm">주소 검색 서비스를 불러오는 중입니다…</p>}
        <div ref={container} className="w-full min-w-0" style={{ height: ready ? 400 : 0 }} />
        <p className="border-t border-stone-200 p-3 text-xs leading-5 text-stone-500">검색 화면이 표시되지 않으면 검색을 닫고 다시 열어 주세요. 연결이 끊긴 경우 페이지를 새로고침해 주세요.</p>
      </>}
    </section>}
    <div><label htmlFor={`${id}-address`} className="block text-sm">기본 주소 (필수)</label><input id={`${id}-address`} name="address_line1" value={address} readOnly required autoComplete="shipping address-line1" placeholder="주소 검색으로 입력해 주세요" className={`${inputClass} bg-stone-50`} /></div>
    <div><label htmlFor={`${id}-detail`} className="block text-sm">상세 주소 (선택)</label><input ref={detailInput} id={`${id}-detail`} name="address_line2" value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={300} autoComplete="shipping address-line2" className={inputClass} /></div>
  </div>;
}
