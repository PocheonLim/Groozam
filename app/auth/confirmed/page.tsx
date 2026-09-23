import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "이메일 인증 안내 | GROOZAM", robots: { index: false } };

export default async function ConfirmedPage() {
  const user = await getCurrentUser();
  let incompleteProfile = false;
  if (user) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("display_name, phone").eq("id", user.id).maybeSingle();
    incompleteProfile = !error && !!data && (!data.display_name?.trim() || !data.phone?.trim());
  }
  return <main className="mx-auto max-w-[480px] px-5 py-12 text-center md:py-20">
    <p className="text-xs tracking-[0.2em] text-stone-500">JOIN GROOZAM</p>
    <h1 className="mt-4 text-3xl font-medium">{user ? "회원가입이 완료되었습니다" : "로그인이 필요합니다"}</h1>
    <p className="mt-6 text-sm leading-6 text-stone-600">{user ? "현재 로그인되어 있습니다. 그루잠에 오신 것을 환영합니다." : "현재 로그인 상태를 확인할 수 없습니다. 이메일 인증을 마쳤다면 로그인 후 서비스를 이용해 주세요."}</p>
    {incompleteProfile && <div className="mt-6 border border-stone-200 p-5"><p className="text-sm leading-6 text-stone-600">이름과 휴대전화를 미리 등록해 두세요. 회원정보는 나중에 입력하셔도 됩니다.</p><Link href="/mypage?section=profile" className="mt-4 inline-block text-sm underline underline-offset-4">회원정보 입력</Link></div>}
    <Link href={user ? "/" : "/login"} className="mt-8 block bg-stone-900 px-5 py-4 text-sm text-white hover:bg-stone-700">{user ? "쇼핑 계속하기" : "로그인하기"}</Link>
    {user && <Link href="/mypage" className="mt-4 block py-3 text-sm underline underline-offset-4">마이페이지</Link>}
  </main>;
}
