import type { Metadata } from "next";
import ProductGrid from "@/app/components/ProductGrid";
import { getNaverProducts, NaverCommerceError } from "@/app/lib/naver-commerce";

export const metadata: Metadata = { title: "GROOZAM | 좋은 잠을 위한 가구", description: "그루잠의 가구를 만나보세요." };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof getNaverProducts>>["contents"][number]["channelProducts"] = [];
  let errorMessage: string | undefined;
  try {
    const response = await getNaverProducts();
    products = response.contents.flatMap((content) => content.channelProducts);
  } catch (error) {
    errorMessage = error instanceof NaverCommerceError ? error.message : "상품을 불러오는 중 오류가 발생했습니다.";
  }
  return <main className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-20"><p className="text-xs tracking-[0.18em] text-stone-500">GROOZAM COLLECTION</p><h1 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">SHOP</h1><div className="mt-12">{errorMessage ? <EmptyState message={errorMessage} /> : products.length ? <ProductGrid products={products} /> : <EmptyState message="현재 판매 중인 상품이 없습니다." />}</div></main>;
}

function EmptyState({ message }: { message: string }) { return <div className="mt-12 border-y border-stone-200 py-24 text-center"><p className="text-stone-700">{message}</p><p className="mt-2 text-sm text-stone-500">잠시 후 다시 시도해 주세요.</p></div>; }
