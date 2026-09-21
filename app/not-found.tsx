import Link from "next/link";

export default function NotFound() {
  return <main className="mx-auto max-w-[720px] px-5 py-24 text-center">
    <h1 className="text-2xl font-medium">페이지를 찾을 수 없습니다.</h1>
    <p className="mt-4 text-sm text-stone-600">주소가 변경되었거나 판매가 종료된 상품일 수 있습니다.</p>
    <Link href="/" className="mt-8 inline-block border-b border-stone-900 pb-1 text-sm">전체 상품 보기</Link>
  </main>;
}
