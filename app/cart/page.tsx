import type { Metadata } from "next";
import CartContents from "@/app/components/CartContents";

export const metadata: Metadata = { title: "장바구니 | GROOZAM", description: "그루잠에서 담아 둔 가구를 확인하세요.", robots: { index: false } };

export default function CartPage() {
  return <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-20">
    <h1 className="text-3xl font-medium">장바구니</h1>
    <CartContents />
  </main>;
}
