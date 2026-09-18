import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "주문하기 | GROOZAM", description: "그루잠 주문 페이지" };

export default function OrderPage() {
  return <main className="mx-auto max-w-[720px] px-5 py-16 md:py-24"><p className="text-xs tracking-[0.18em] text-stone-500">ORDER</p><h1 className="mt-3 text-3xl font-medium">주문하기</h1><div className="mt-12 border-y border-stone-200 py-16 text-center"><p>결제 기능은 아직 준비 중입니다.</p><p className="mt-2 text-sm text-stone-500">상품과 장바구니 정보는 확인할 수 있으며, 결제 연동 후 주문을 완료할 수 있습니다.</p><Link href="/cart" className="mt-6 inline-block border-b border-stone-900 pb-1 text-sm">장바구니로 돌아가기</Link></div></main>;
}
