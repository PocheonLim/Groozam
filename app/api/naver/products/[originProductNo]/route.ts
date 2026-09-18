import { NextResponse } from "next/server";
import { getOriginProduct, NaverCommerceError } from "@/app/lib/naver-commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext<"/api/naver/products/[originProductNo]">) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  try {
    const { originProductNo } = await context.params;
    return NextResponse.json({ originProduct: await getOriginProduct(originProductNo) });
  } catch (error) {
    if (error instanceof NaverCommerceError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "네이버 상품 상세 API 요청 중 알 수 없는 오류가 발생했습니다." }, { status: 500 });
  }
}
