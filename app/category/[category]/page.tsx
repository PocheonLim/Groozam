import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, matchesCategory } from "@/app/lib/categories";
import ProductGrid from "@/app/components/ProductGrid";
import { getNaverProducts, type ChannelProduct } from "@/app/lib/naver-commerce";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const item = categories.find((item) => item.slug === category);
  return { title: `${item?.label ?? "카테고리"} | GROOZAM`, description: `그루잠 ${item?.label ?? "가구"} 컬렉션` };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const item = categories.find((item) => item.slug === category);
  if (!item) notFound();

  let products: ChannelProduct[] = [];
  let errorMessage: string | undefined;
  try {
    const response = await getNaverProducts();
    products = response.contents.flatMap((content) => content.channelProducts)
      .filter((product) => matchesCategory(product, item));
  } catch {
    errorMessage = "상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-20">
      <p className="text-xs tracking-[0.18em] text-stone-500">GROOZAM COLLECTION</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">{item.label}</h1>
      <div className="mt-12">
        {errorMessage || products.length === 0 ? (
          <div className="border-y border-stone-200 py-24 text-center">
            <p role={errorMessage ? "alert" : undefined} className="text-stone-700">
              {errorMessage ?? `등록된 ${item.label} 상품이 없습니다.`}
            </p>
            <Link href="/" className="mt-6 inline-block border-b border-stone-900 pb-1 text-sm">전체 상품 보기</Link>
          </div>
        ) : <ProductGrid key={item.slug} products={products} />}
      </div>
    </main>
  );
}
