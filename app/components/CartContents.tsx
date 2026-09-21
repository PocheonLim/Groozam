"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import ProductImage from "./ProductImage";
import { MAX_CART_QUANTITY } from "@/app/lib/cart";

const money = new Intl.NumberFormat("ko-KR");

export default function CartContents() {
  const { items, ready, storageError, updateQuantity, removeItem } = useCart();
  if (!ready) return <p role="status" className="py-16 text-sm text-stone-500">장바구니를 불러오는 중입니다.</p>;

  return <>
    {storageError && <p role="status" className="mt-6 text-sm text-stone-600">이 브라우저에서는 장바구니를 저장할 수 없습니다. 페이지를 나가면 담은 상품이 사라질 수 있습니다.</p>}
    {items.length === 0 ? <div className="mt-10 border-y border-stone-200 py-20 text-center">
      <p className="text-stone-600">장바구니가 비어 있습니다.</p>
      <Link href="/" className="mt-6 inline-block border-b border-stone-900 pb-1 text-sm">상품 둘러보기</Link>
    </div> : <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {items.map((item) => <li key={item.productId} className="flex gap-4 py-6">
          <Link href={`/shop/${item.productId}`} className="w-24 shrink-0 sm:w-32">
            <ProductImage src={item.imageUrl} alt={item.productName} className="aspect-square w-full object-cover" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/shop/${item.productId}`} className="text-sm leading-6">{item.productName}</Link>
            <p className="mt-2 text-sm text-stone-600">{money.format(item.price)}원</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center border border-stone-300">
                <button type="button" aria-label={`${item.productName} 수량 줄이기`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="size-10 disabled:text-stone-300">−</button>
                <output aria-label={`${item.productName} 수량`} className="min-w-8 text-center text-sm">{item.quantity}</output>
                <button type="button" aria-label={`${item.productName} 수량 늘리기`} disabled={item.quantity >= MAX_CART_QUANTITY} onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="size-10 disabled:text-stone-300">+</button>
              </div>
              <strong className="text-sm">{money.format(item.price * item.quantity)}원</strong>
            </div>
            <button type="button" aria-label={`${item.productName} 삭제`} onClick={() => removeItem(item.productId)} className="mt-3 py-2 text-xs text-stone-500 underline underline-offset-4">삭제</button>
          </div>
        </li>)}
      </ul>
      <aside className="h-fit bg-stone-50 p-6">
        <h2 className="text-lg font-medium">상품금액</h2>
        <p className="mt-5 text-2xl font-medium" aria-live="polite">{money.format(items.reduce((total, item) => total + item.price * item.quantity, 0))}원</p>
        <p className="mt-3 text-xs leading-6 text-stone-500">담은 시점의 상품금액입니다. 옵션과 배송·설치비에 따라 최종 금액이 달라질 수 있습니다.</p>
        <p className="mt-5 border-t border-stone-200 pt-4 text-sm text-stone-600">주문·결제 기능은 준비 중입니다.</p>
        <Link href="/" className="mt-5 block border border-stone-900 py-3 text-center text-sm">쇼핑 계속하기</Link>
      </aside>
    </div>}
  </>;
}
