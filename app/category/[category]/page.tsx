import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@/app/lib/categories";

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

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-20">
      <p className="text-xs tracking-[0.18em] text-stone-500">GROOZAM COLLECTION</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-5xl">{item.label}</h1>
      <div className="mt-12 border-y border-stone-200 py-24 text-center">
        <p className="text-stone-700">컬렉션을 준비 중입니다.</p>
        <Link href="/" className="mt-6 inline-block border-b border-stone-900 pb-1 text-sm">전체 상품 보기</Link>
      </div>
    </main>
  );
}
