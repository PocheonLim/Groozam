"use client";

import Link from "next/link";

export default function ProductError({ retry }: { retry: () => void }) {
  return <main className="mx-auto max-w-[720px] px-5 py-24 text-center">
    <h1 className="text-2xl font-medium">상품을 불러오지 못했습니다.</h1>
    <p className="mt-4 text-sm text-stone-600">일시적인 연결 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.</p>
    <button type="button" onClick={retry} className="mt-8 bg-stone-900 px-6 py-3 text-sm text-white">다시 시도</button>
    <Link href="/" className="ml-5 text-sm underline underline-offset-4">전체 상품 보기</Link>
  </main>;
}
