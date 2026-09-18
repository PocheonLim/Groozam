import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OriginProductDetail from "@/app/components/OriginProductDetail";
import { getOriginProduct } from "@/app/lib/naver-commerce";

type Props = { params: Promise<{ originProductNo: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getOriginProduct((await params).originProductNo).catch(() => undefined);
  return { title: product ? `${product.name} | GROOZAM` : "상품을 찾을 수 없습니다 | GROOZAM", description: product?.name ?? "그루잠 상품 상세" };
}

export default async function OriginProductPage({ params }: Props) {
  const product = await getOriginProduct((await params).originProductNo).catch(() => undefined);
  if (!product) notFound();
  return <OriginProductDetail product={product} />;
}
