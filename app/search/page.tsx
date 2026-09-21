import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProductGrid from "@/app/components/ProductGrid";
import { getNaverProducts, type ChannelProduct } from "@/app/lib/naver-commerce";
import { categories, matchesCategory } from "@/app/lib/categories";

export const metadata: Metadata = { title: "상품 검색 | GROOZAM", description: "그루잠 가구를 검색하세요.", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = (typeof q === "string" ? q : "").trim().slice(0, 100);
  if (!query) redirect("/");
  let products: ChannelProduct[] = [];
  let failed = false;
  if (query) {
    try {
      const response = await getNaverProducts();
      const keywords = query.toLocaleLowerCase("ko-KR").split(/\s+/);
      const category = categories.find((item) => item.label === query);
      products = response.contents.flatMap((content) => content.channelProducts)
        .filter((product) => category ? matchesCategory(product, category) : keywords.every((word) => product.name.toLocaleLowerCase("ko-KR").includes(word)));
    } catch {
      failed = true;
    }
  }

  return <main className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-20">
    <h1 className="break-words text-2xl font-medium md:text-3xl">‘{query}’ 검색 결과</h1>
    <div className="mt-10">
      {failed ? <p role="alert" className="border-y border-stone-200 py-16 text-center text-stone-600">상품을 불러오지 못했습니다. 잠시 후 다시 검색해 주세요.</p>
        : products.length ? <ProductGrid key={query} products={products} /> : <p className="border-y border-stone-200 py-16 text-center text-stone-600">검색 결과가 없습니다. 상단 검색에서 다른 상품명으로 검색해 주세요.</p>}
    </div>
  </main>;
}
