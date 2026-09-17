import { NextResponse } from "next/server";
import { getNaverProducts, NaverCommerceError } from "@/app/lib/naver-commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const products = await getNaverProducts();

    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof NaverCommerceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "네이버 커머스 API 요청 중 알 수 없는 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
