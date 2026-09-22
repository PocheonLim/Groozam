import type { Metadata } from "next";
import MemberForm from "@/app/components/MemberForm";

export const metadata: Metadata = { title: "회원가입 | GROOZAM", description: "그루잠 회원가입", robots: { index: false } };

export default function SignupPage() {
  return <main className="mx-auto max-w-[480px] px-5 py-12 md:py-20">
    <p className="text-center text-xs tracking-[0.2em] text-stone-500">JOIN GROOZAM</p>
    <h1 className="mt-4 text-center text-3xl font-medium">회원가입</h1>
    <p className="mt-4 text-center text-sm leading-6 text-stone-500">이메일 또는 소셜 계정으로 시작하세요.</p>
    <p className="mb-8 mt-6 bg-stone-50 px-4 py-3 text-center text-xs text-stone-600">회원가입 화면 미리보기입니다. 계정은 생성되지 않습니다.</p>
    <MemberForm mode="signup" />
  </main>;
}
