import type { Metadata } from "next";
import MemberForm from "@/app/components/MemberForm";

export const metadata: Metadata = { title: "회원가입 | GROOZAM", description: "그루잠 회원가입", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="mx-auto max-w-[480px] px-5 py-12 md:py-20">
    <p className="text-center text-xs tracking-[0.2em] text-stone-500">JOIN GROOZAM</p>
    <h1 className="mt-4 text-center text-3xl font-medium">회원가입</h1>
    <p className="mt-4 text-center text-sm leading-6 text-stone-500">이메일로 시작하세요. 소셜 가입은 준비 중입니다.</p>
    <p className="mb-8 mt-6 bg-stone-50 px-4 py-3 text-center text-xs text-stone-600">가입 후 이메일 인증을 완료해 주세요.</p>
    {error === "confirmation" && <p role="alert" className="mb-6 border border-stone-200 p-4 text-sm leading-6 text-stone-700">이메일 인증을 완료하지 못했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다. 가입한 브라우저에서 가장 최근 인증 링크를 열어 주세요. 문제가 계속되면 잠시 후 다시 가입 요청을 해 주세요.</p>}
    <MemberForm mode="signup" />
  </main>;
}
