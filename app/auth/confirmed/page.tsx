import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = { title: "이메일 인증 안내 | GROOZAM", robots: { index: false } };

export default async function ConfirmedPage() {
  const user = await getCurrentUser();
  return <main className="mx-auto max-w-[480px] px-5 py-12 text-center md:py-20">
    <p className="text-xs tracking-[0.2em] text-stone-500">JOIN GROOZAM</p>
    <h1 className="mt-4 text-3xl font-medium">{user ? "회원가입이 완료되었습니다" : "로그인이 필요합니다"}</h1>
    <p className="mt-6 text-sm leading-6 text-stone-600">{user ? "현재 로그인되어 있습니다. 그루잠에 오신 것을 환영합니다." : "현재 로그인 상태를 확인할 수 없습니다. 이메일 인증을 마쳤다면 로그인 후 서비스를 이용해 주세요."}</p>
    <Link href={user ? "/" : "/login"} className="mt-8 block bg-stone-900 px-5 py-4 text-sm text-white hover:bg-stone-700">{user ? "쇼핑 계속하기" : "로그인하기"}</Link>
    {user && <Link href="/mypage" className="mt-4 block py-3 text-sm underline underline-offset-4">마이페이지</Link>}
  </main>;
}
