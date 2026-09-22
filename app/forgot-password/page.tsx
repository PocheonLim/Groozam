import type { Metadata } from "next";
import MemberForm from "@/app/components/MemberForm";

export const metadata: Metadata = { title: "비밀번호 찾기 | GROOZAM", description: "그루잠 비밀번호 재설정", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <main className="mx-auto max-w-[480px] px-5 py-12 md:py-20">
    <h1 className="text-3xl font-medium">비밀번호 찾기</h1>
    <p className="mt-4 text-sm leading-6 text-stone-500">가입한 이메일로 비밀번호를 재설정할 수 있습니다.<br />소셜 회원은 카카오 또는 Google 로그인을 이용해 주세요.</p>
    <p className="mb-8 mt-6 bg-stone-50 px-4 py-3 text-xs text-stone-600">서비스 준비 중으로, 재설정 메일은 발송되지 않습니다.</p>
    <MemberForm mode="reset" />
  </main>;
}
