import { validateProfile } from "./profile";

export type AddressValues = { label: string; recipient_name: string; recipient_phone: string; postal_code: string; address_line1: string; address_line2: string; delivery_note: string | null; is_default: boolean };
export type Address = AddressValues & { id: string };
export type AddressOperation = "save" | "delete" | "default";
export type AddressResult = { success: boolean; message: string };
export const addressFields = [
  { name: "label", label: "배송지명", max: 50, required: true },
  { name: "recipient_name", label: "받는 사람", max: 50, required: true },
  { name: "postal_code", label: "우편번호", max: 5, required: true },
  { name: "address_line1", label: "기본 주소", max: 300, required: true },
  { name: "address_line2", label: "상세 주소", max: 300, required: false },
  { name: "delivery_note", label: "배송 요청사항", max: 500, required: false },
] as const;

export function validateAddress(form: FormData): { values: AddressValues; error?: never } | { error: string; values?: never } {
  const fields: Record<string, string> = {};
  for (const field of addressFields) {
    const value = form.get(field.name);
    if (typeof value !== "string") return { error: `${field.label} 입력을 확인해 주세요.` };
    fields[field.name] = value.trim();
    if (field.required && !fields[field.name]) return { error: `${field.label} 항목을 입력해 주세요.` };
    if (fields[field.name].length > field.max || /[\u0000-\u001f\u007f]/u.test(fields[field.name])) return { error: `${field.label}은 줄바꿈 없이 ${field.max}자 이하로 입력해 주세요.` };
  }
  if (!/^\d{5}$/.test(fields.postal_code)) return { error: "우편번호는 숫자 5자리로 입력해 주세요." };
  const phone = validateProfile("", form.get("phone"));
  if (!phone.values?.phone) return { error: phone.error ?? "받는 사람의 휴대전화 번호를 입력해 주세요." };
  return { values: { label: fields.label, recipient_name: fields.recipient_name, recipient_phone: phone.values.phone, postal_code: fields.postal_code, address_line1: fields.address_line1, address_line2: fields.address_line2, delivery_note: fields.delivery_note || null, is_default: form.get("is_default") === "on" } };
}
