export type ProfileValues = { display_name: string | null; phone: string | null };
export type ProfileResult = { success: boolean; message: string };

export function validateProfile(name: unknown, phone: unknown): { values: ProfileValues; error?: never } | { error: string; values?: never } {
  if (typeof name !== "string" || typeof phone !== "string") return { error: "이름과 휴대전화 입력을 확인해 주세요." };
  const displayName = name.trim();
  const telephone = phone.trim();
  if (displayName.length > 50 || /[\u0000-\u001f\u007f]/u.test(displayName)) return { error: "이름은 줄바꿈 없이 50자 이하로 입력해 주세요." };
  if (telephone && !/^(010\d{8}|010-\d{4}-\d{4})$/.test(telephone)) return { error: "휴대전화는 01012345678 또는 010-1234-5678 형식으로 입력해 주세요." };
  return { values: { display_name: displayName || null, phone: telephone.replaceAll("-", "") || null } };
}

export function formatPhone(phone: string | null): string {
  return phone?.replace(/^(010)(\d{4})(\d{4})$/, "$1-$2-$3") ?? "";
}

export function formatPhoneInput(value: string): { value: string; error: string } {
  if (/[^0-9-]/.test(value)) return { value, error: "휴대전화에는 숫자만 입력해 주세요." };
  const digits = value.replaceAll("-", "");
  if (digits.length > 11) return { value, error: "휴대전화 번호는 11자리까지만 입력해 주세요." };
  const formatted = [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)].filter(Boolean).join("-");
  return { value: formatted, error: digits.length >= 3 && !digits.startsWith("010") ? "010으로 시작하는 휴대전화 번호를 입력해 주세요." : "" };
}
