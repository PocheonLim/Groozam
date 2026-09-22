import type { Metadata } from "next";
import MemberForm from "@/app/components/MemberForm";
import { safeNext } from "@/lib/supabase/login";

export const metadata: Metadata = { title: "로그인 | GROOZAM", description: "그루잠 회원 로그인", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined);
  return <main className="mx-auto max-w-[480px] px-5 py-12 md:py-20">
    <p className="text-center text-xs tracking-[0.2em] text-stone-500">WELCOME TO GROOZAM</p>
    <h1 className="mt-4 text-center text-3xl font-medium">로그인</h1>
    <p className="mt-4 text-center text-sm leading-6 text-stone-500">당신의 공간을 위한 선택, 그루잠과 함께하세요.</p>
    <p className="mb-8 mt-6 bg-stone-50 px-4 py-3 text-center text-xs text-stone-600">이메일로 로그인하세요. 소셜 로그인은 준비 중입니다.</p>
    <MemberForm mode="login" next={next} />
  </main>;
}
