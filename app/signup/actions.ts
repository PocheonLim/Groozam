"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { validateProfile } from "@/lib/supabase/profile";
import { sealSignupPhone, saveSignupPhone, signupPhoneCookie, signupPhoneMaxAge } from "@/lib/supabase/signup-phone";

export async function prepareSignupPhone(email: string, phone: string): Promise<{ error?: string }> {
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "이메일 주소를 확인해 주세요." };
  const validated = validateProfile("", phone);
  if (!validated.values?.phone) return { error: validated.error ?? "휴대전화 번호 11자리를 입력해 주세요." };
  const store = await cookies();
  try {
    store.set(signupPhoneCookie, sealSignupPhone(email, validated.values.phone), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: signupPhoneMaxAge });
    return {};
  } catch { return { error: "가입 정보를 안전하게 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." }; }
}

export async function clearSignupPhone() {
  (await cookies()).delete(signupPhoneCookie);
}

// Handles projects that return a session immediately; normal Confirm Email uses callback.
export async function finishSignupPhone(): Promise<boolean> {
  const store = await cookies();
  const result = await saveSignupPhone(await createClient(), store.get(signupPhoneCookie)?.value);
  store.delete(signupPhoneCookie);
  return result;
}
