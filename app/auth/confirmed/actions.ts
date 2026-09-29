"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveSignupConsents, signupConsentCookie } from "@/lib/supabase/signup-consents";

export async function retrySignupConsents() {
  const store = await cookies();
  const result = await saveSignupConsents(await createClient(), store.get(signupConsentCookie)?.value);
  if (result === "saved") {
    store.delete(signupConsentCookie);
    revalidatePath("/auth/confirmed");
    return { success: true, message: "약관 동의 기록이 저장되었습니다." };
  }
  return { success: false, message: result === "missing"
    ? "가입 당시 동의 정보를 확인할 수 없거나 유효 시간이 지났습니다. 새로 가입하지 마시고 고객지원에 문의해 주세요."
    : "약관 동의 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요. 이메일 인증은 완료된 상태입니다." };
}
