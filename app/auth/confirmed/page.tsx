import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { openSignupConsents, signupConsentCookie } from "@/lib/supabase/signup-consents";
import ConsentRecovery from "@/app/components/ConsentRecovery";

export const metadata: Metadata = { title: "이메일 인증 안내 | GROOZAM", robots: { index: false } };

export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  const user = await getCurrentUser();
  let incompleteProfile = false;
  let incompleteConsents = false;
  let canRetryConsents = false;
  if (user) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("display_name, phone").eq("id", user.id).maybeSingle();
    incompleteProfile = !error && !!data && (!data.display_name?.trim() || !data.phone?.trim());
    const pending = openSignupConsents((await cookies()).get(signupConsentCookie)?.value);
    canRetryConsents = Boolean(pending && pending.userId === user.id && pending.email === user.email?.trim().toLowerCase());
    try {
      const { data: records, error: consentError } = await supabase.from("member_consents").select("consent_type").eq("user_id", user.id).eq("signup_record", true);
      incompleteConsents = canRetryConsents || Boolean(consentError) || new Set(records?.map(record => record.consent_type)).size < 4;
      if (consentError) console.warn("[auth/consents] Record lookup failed", { code: consentError.code });
    } catch {
      incompleteConsents = true;
      console.warn("[auth/consents] Record lookup unavailable");
    }
  }
  return <main className="mx-auto max-w-[480px] px-5 py-12 text-center md:py-20">
    <p className="text-xs tracking-[0.2em] text-stone-500">JOIN GROOZAM</p>
    <h1 className="mt-4 text-3xl font-medium">{user ? "회원가입이 완료되었습니다" : "로그인이 필요합니다"}</h1>
    <p className="mt-6 text-sm leading-6 text-stone-600">{user ? "현재 로그인되어 있습니다. 그루잠에 오신 것을 환영합니다." : "현재 로그인 상태를 확인할 수 없습니다. 이메일 인증을 마쳤다면 로그인 후 서비스를 이용해 주세요."}</p>
    {user && phone === "missing" && <p role="status" className="mt-5 text-sm leading-6 text-stone-600">휴대전화 자동 저장을 확인하지 못했습니다. 마이페이지의 회원정보에서 번호를 확인하거나 입력해 주세요.</p>}
    {user && incompleteConsents && <ConsentRecovery canRetry={canRetryConsents} />}
    {incompleteProfile && <div className="mt-6 border border-stone-200 p-5"><p className="text-sm leading-6 text-stone-600">회원정보를 확인하거나 수정할 수 있습니다. 휴대전화번호는 선택사항이며 나중에 등록해도 됩니다.</p><Link href="/mypage?section=profile" className="mt-4 inline-block text-sm underline underline-offset-4">회원정보 입력</Link></div>}
    <Link href={user ? "/" : "/login"} className="mt-8 block bg-stone-900 px-5 py-4 text-sm text-white hover:bg-stone-700">{user ? "쇼핑 계속하기" : "로그인하기"}</Link>
    {user && <Link href="/mypage" className="mt-4 block py-3 text-sm underline underline-offset-4">마이페이지</Link>}
  </main>;
}
