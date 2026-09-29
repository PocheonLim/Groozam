"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "./PhoneInput";
import { formatPhone } from "@/lib/supabase/profile";
import { addressFields, validateAddress, type Address, type AddressOperation, type AddressResult } from "@/lib/supabase/addresses";
import { writeAddress } from "@/app/mypage/address-actions";

const buttonClass = "border border-stone-300 px-4 py-2 text-sm hover:border-stone-700 disabled:cursor-not-allowed disabled:opacity-50";

export default function AddressManager({ addresses, loadError }: { addresses: Address[]; loadError: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | null | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<AddressResult | null>(null);
  const busy = useRef(false);

  async function mutate(operation: AddressOperation, id: string | null, form?: FormData): Promise<boolean> {
    if (busy.current) return false;
    if (operation === "delete" && !window.confirm("이 배송지를 삭제하시겠습니까? 기본 배송지를 삭제하면 기본 배송지가 없는 상태가 됩니다.")) return false;
    busy.current = true;
    setPending(true);
    setMessage({ success: true, message: operation === "delete" ? "배송지 삭제 중…" : "배송지 저장 중…" });
    try {
      const result = await writeAddress(operation, id, form);
      setMessage(result);
      if (result.success) { setEditing(undefined); router.refresh(); }
      return result.success;
    } catch {
      setMessage({ success: false, message: "요청 결과를 확인하지 못했습니다. 목록을 새로고침한 뒤 다시 시도해 주세요." });
      return false;
    } finally { busy.current = false; setPending(false); }
  }

  return <div aria-busy={pending}>
    <div className="flex items-center justify-between gap-3 border-b border-stone-900 pb-4"><h2 className="text-lg font-medium">배송지 관리</h2><button type="button" className={buttonClass} disabled={pending || editing !== undefined || loadError} onClick={() => { setMessage(null); setEditing(null); }}>배송지 추가</button></div>
    {message && <p role={message.success ? "status" : "alert"} className="mt-5 border border-stone-200 bg-stone-50 p-4 text-sm leading-6">{message.message}</p>}
    {loadError ? <div role="alert" className="py-10 text-sm leading-6 text-stone-600">배송지를 불러오지 못했습니다.<button type="button" className={`${buttonClass} ml-3`} onClick={() => router.refresh()}>다시 불러오기</button></div> : <>
      {editing !== undefined && <AddressEditor key={editing?.id ?? "new"} address={editing} first={addresses.length === 0} pending={pending} save={(data) => mutate("save", editing?.id ?? null, data)} cancel={() => setEditing(undefined)} />}
      {!addresses.length && editing === undefined && <div className="border-b border-stone-200 px-4 py-16 text-center"><p>등록된 배송지가 없습니다.</p><p className="mt-3 text-sm leading-6 text-stone-500">배송지를 등록하면 주문 시 편리하게 이용할 수 있습니다.</p><button type="button" className={`${buttonClass} mt-6`} onClick={() => setEditing(null)}>배송지 추가</button></div>}
      <ul className="mt-6 space-y-4">{addresses.map((address) => <li key={address.id} className="border border-stone-200 p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3"><h3 className="break-all font-medium">{address.label}</h3>{address.is_default && <span className="bg-stone-100 px-2 py-1 text-xs">기본 배송지</span>}</div>
        <p className="mt-4 break-all text-sm">{address.recipient_name} / {formatPhone(address.recipient_phone)}</p>
        <p className="mt-3 break-words text-sm leading-6 text-stone-600">({address.postal_code}) {address.address_line1}<br />{address.address_line2}</p>
        {address.delivery_note && <p className="mt-3 break-words text-sm text-stone-500">배송 요청사항: {address.delivery_note}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={pending || editing !== undefined} className={buttonClass} onClick={() => { setMessage(null); setEditing(address); }}>수정</button>
          <button type="button" disabled={pending || editing !== undefined} className={buttonClass} onClick={() => mutate("delete", address.id)}>삭제</button>
          {!address.is_default && <button type="button" disabled={pending || editing !== undefined} className={buttonClass} onClick={() => mutate("default", address.id)}>기본 배송지 설정</button>}
        </div>
      </li>)}</ul>
      {!!addresses.length && !addresses.some((address) => address.is_default) && <p className="mt-4 text-xs text-stone-500">현재 기본 배송지가 없습니다. 원하는 배송지를 기본으로 설정해 주세요.</p>}
    </>}
  </div>;
}

function AddressEditor({ address, first, pending, save, cancel }: { address: Address | null; first: boolean; pending: boolean; save: (data: FormData) => Promise<boolean>; cancel: () => void }) {
  const [phone, setPhone] = useState(formatPhone(address?.recipient_phone ?? null));
  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const result = validateAddress(data);
    if (phoneError || !result.values) { setError(phoneError || result.error || "입력 내용을 확인해 주세요."); return; }
    setError("");
    await save(data);
  }
  return <form onSubmit={submit} noValidate className="mt-6 border border-stone-200 p-5 md:p-6" aria-label={address ? "배송지 수정" : "배송지 추가"}>
    <h3 className="mb-5 font-medium">{address ? "배송지 수정" : "새 배송지"}</h3>
    <fieldset disabled={pending} className="space-y-5">
      {addressFields.map((field) => <div key={field.name}>
        <label htmlFor={`address-${field.name}`} className="block text-sm">{field.label}{field.required ? " (필수)" : " (선택)"}</label>
        <input id={`address-${field.name}`} name={field.name} required={field.required} maxLength={field.max} inputMode={field.name === "postal_code" ? "numeric" : undefined} autoComplete={field.name === "postal_code" ? "shipping postal-code" : field.name === "address_line1" ? "shipping address-line1" : field.name === "address_line2" ? "shipping address-line2" : field.name === "recipient_name" ? "shipping name" : "off"} defaultValue={address?.[field.name] ?? ""} className="mt-2 w-full border border-stone-300 px-4 py-3 text-sm outline-offset-4 focus-visible:outline-stone-700" />
        {field.name === "recipient_name" && <div className="mt-5"><PhoneInput id="address-phone" required value={phone} error={phoneError} onChange={(value, phoneIssue) => { setPhone(value); setPhoneError(phoneIssue); setError(""); }} /></div>}
      </div>)}
      <p className="text-xs leading-5 text-stone-500">우편번호와 주소를 직접 입력해 주세요. 상세 주소가 없는 경우에는 비워 두셔도 됩니다.</p>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="is_default" defaultChecked={first || address?.is_default} className="size-4 accent-stone-900" />기본 배송지로 설정</label>
      {first && <p className="text-xs text-stone-500">첫 배송지는 자동으로 기본 배송지로 등록됩니다.</p>}
      {error && <p role="alert" className="text-sm leading-6 text-red-700">{error}</p>}
      <div className="flex gap-3"><button type="submit" disabled={pending} className="bg-stone-900 px-6 py-3 text-sm text-white disabled:opacity-50">{pending ? "저장 중…" : "저장"}</button><button type="button" disabled={pending} className={buttonClass} onClick={cancel}>취소</button></div>
    </fieldset>
  </form>;
}
