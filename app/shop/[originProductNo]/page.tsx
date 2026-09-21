import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OriginProductDetail from "@/app/components/OriginProductDetail";
import { getOriginProduct, NaverCommerceError } from "@/app/lib/naver-commerce";

type Props = { params: Promise<{ originProductNo: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { originProductNo } = await params;
  const product = /^\d+$/.test(originProductNo) ? await getOriginProduct(originProductNo).catch(() => undefined) : undefined;
  return { title: product ? `${product.name} | GROOZAM` : "상품을 찾을 수 없습니다 | GROOZAM", description: product?.name ?? "그루잠 상품 상세" };
}

export default async function OriginProductPage({ params }: Props) {
  const { originProductNo } = await params;
  if (!/^\d+$/.test(originProductNo)) notFound();
  let product;
  try {
    product = await getOriginProduct(originProductNo);
  } catch (error) {
    if (error instanceof NaverCommerceError && error.status === 404) notFound();
    throw error;
  }
  return <OriginProductDetail key={originProductNo} product={product} />;
}
