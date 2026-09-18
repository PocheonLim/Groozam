import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/app/components/ProductDetail";
import { getProductDetail } from "@/app/lib/naver-commerce";

type Props = { params: Promise<{ productId: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductDetail((await params).productId).catch(() => undefined);
  return { title: product ? `${product.name} | GROOZAM` : "상품을 찾을 수 없습니다 | GROOZAM", description: product?.brandName ?? "그루잠 상품 상세" };
}
export default async function ProductPage({ params }: Props) {
  const product = await getProductDetail((await params).productId).catch(() => undefined);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
