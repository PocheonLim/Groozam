"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { validateProfile } from "@/lib/supabase/profile";
import { sealSignupPhone, saveSignupPhone, signupPhoneCookie, signupPhoneMaxAge } from "@/lib/supabase/signup-phone";
import { consentTypes, getActiveConsentVersions, type ConsentChoices } from "@/lib/supabase/consents";
import { signupErrorMessage, validateSignup } from "@/lib/supabase/signup";
import { saveSignupConsents, sealSignupConsents, signConsentProof, signupConsentCookie, signupConsentMaxAge, type ConsentSnapshot } from "@/lib/supabase/signup-consents";

export async function signupWithConsents(form: FormData): Promise<{ error?: string; redirectTo?: string }> {
  if (!(form instanceof FormData)) return { error: "가입 정보를 확인해 주세요." };
  const email = form.get("email"), password = form.get("password"), confirmation = form.get("passwordConfirm"), phone = form.get("phone");
  if (typeof email !== "string" || typeof password !== "string" || typeof confirmation !== "string" || typeof phone !== "string") return { error: "가입 정보를 확인해 주세요." };
  const choices = Object.fromEntries(consentTypes.map(type => [type, form.get(type) === "true"])) as ConsentChoices;
  const validation = validateSignup(email.trim(), password, confirmation, choices);
  if (validation) return { error: validation };
  if (consentTypes.some(type => !["true", "false"].includes(String(form.get(type))))) return { error: "약관 동의 항목을 다시 확인해 주세요." };
  const versions = getActiveConsentVersions();
  if (!versions) return { error: "약관 문서를 준비 중입니다. 문서 확정 후 회원가입을 이용해 주세요." };
  if (consentTypes.some(type => form.get(`version_${type}`) !== versions[type])) return { error: "약관이 변경되었습니다. 페이지를 새로고침하고 내용을 다시 확인해 주세요." };
  const requestHeaders = await headers();
  let origin: URL;
  try {
    origin = new URL(requestHeaders.get("origin") ?? "");
    if (origin.protocol !== "https:" && !(origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) throw new Error();
  } catch { return { error: "가입 요청 주소를 확인하지 못했습니다. 페이지를 새로고침해 주세요." }; }
  const store = await cookies();
  const agreedAt = new Date().toISOString();
  const snapshot: ConsentSnapshot = { email: email.trim().toLowerCase(), userId: "", choices, versions, agreedAt, expires: Date.parse(agreedAt) + signupConsentMaxAge * 1000 };
  // Fail before creating an Auth account when cookie encryption is unavailable.
  try { sealSignupConsents(snapshot); signConsentProof(JSON.stringify(snapshot)); } catch { return { error: "가입 정보를 안전하게 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." }; }
  const prepared = await prepareSignupPhone(email.trim(), phone);
  if (prepared.error) return prepared;
  store.delete(signupConsentCookie);
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: new URL("/auth/callback", origin).toString() } });
    if (error || !data.user) {
      store.delete(signupPhoneCookie);
      console.warn("[auth/signup] Request failed", { code: error?.code });
      return { error: signupErrorMessage(error?.code) };
    }
    // Obfuscated existing-account responses are not evidence of a new signup.
    if (data.user.identities?.length === 0) { store.delete(signupPhoneCookie); return {}; }
    const sealed = sealSignupConsents({ ...snapshot, userId: data.user.id });
    store.set(signupConsentCookie, sealed, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: signupConsentMaxAge });
    if (data.session) {
      const phoneSaved = await finishSignupPhone().catch(() => false);
      const consentSaved = await saveSignupConsents(supabase, sealed);
      if (consentSaved === "saved") store.delete(signupConsentCookie);
      const params = new URLSearchParams();
      if (!phoneSaved) params.set("phone", "missing");
      return { redirectTo: `/auth/confirmed${params.size ? `?${params}` : ""}` };
    }
    return {};
  } catch {
    console.warn("[auth/signup] Request unavailable");
    return { error: signupErrorMessage() };
  }
}

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
