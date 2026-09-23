import Link from "next/link";
import type { LegalDocument as Document } from "@/lib/legal/documents";

export default function LegalDocument({ document, related = [] }: { document: Document; related?: Document[] }) {
  return <main className="mx-auto max-w-3xl px-5 py-12 md:py-20">
    <p className="text-xs tracking-[0.18em] text-stone-500">GROOZAM</p>
    <h1 className="mt-4 text-3xl font-medium">{document.title}</h1>
    {document.status === "draft" && <p role="note" className="mt-6 border border-stone-200 bg-stone-50 p-5 text-sm leading-7 text-stone-700">이 문서는 검토 중인 준비 페이지입니다. 최종 운영 문서가 아니며 법률 검토와 사업자 정보 확인 후 확정됩니다. 현재 이 문서에 대한 동의 이력은 저장하지 않습니다.</p>}
    {[document, ...related].map((item) => <div key={item.path} className="mt-8">
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-b border-stone-200 pb-5 text-sm text-stone-600">
        <div><dt className="inline">문서: </dt><dd className="inline">{item.title}</dd></div>
        <div><dt className="inline">상태: </dt><dd className="inline">{item.status === "draft" ? "검토 중" : "시행"}</dd></div>
        <div><dt className="inline">버전: </dt><dd className="inline">{item.version ?? "미확정"}</dd></div>
        <div><dt className="inline">시행일: </dt><dd className="inline">{item.effectiveDate ?? "미정"}</dd></div>
      </dl>
      {item.sections.map((section) => <section id={section.id} key={section.id} className="scroll-mt-24 py-6"><h2 className="text-lg font-medium">{section.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{section.text}</p></section>)}
    </div>)}
    <nav aria-label="약관 관련 페이지" className="mt-8 flex flex-wrap gap-6 border-t border-stone-200 pt-6 text-sm text-stone-600"><Link href="/terms" className="underline underline-offset-4">이용약관</Link><Link href="/privacy" className="underline underline-offset-4">개인정보 안내</Link><Link href="/signup" className="underline underline-offset-4">회원가입</Link></nav>
  </main>;
}
