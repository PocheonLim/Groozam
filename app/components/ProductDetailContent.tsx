"use client";

import { useMemo } from "react";
import ProductImage from "./ProductImage";

export default function ProductDetailContent({ content, productName }: { content?: string; productName: string }) {
  const { imageUrls, text } = useMemo(() => {
    if (!content) return { imageUrls: [], text: "" };
    const document = new DOMParser().parseFromString(content, "text/html");
    return {
      imageUrls: Array.from(document.images).map((image) => image.getAttribute("src") ?? "")
        .filter((url) => /^https?:\/\//i.test(url)),
      text: document.body.textContent?.trim() ?? "",
    };
  }, [content]);

  return <section className="mt-20 border-t border-stone-300">
    <h2 className="py-5 text-lg font-medium">상품 상세 정보</h2>
    {imageUrls.length ? <div className="mx-auto max-w-[860px]">
      {imageUrls.map((url, index) => <ProductImage key={`${url}-${index}`} src={url} alt={`${productName} 상세 이미지 ${index + 1}`} className="block h-auto w-full" />)}
    </div> : <p className="whitespace-pre-wrap border-t border-stone-200 py-12 text-sm leading-7 text-stone-700">{text || "등록된 상품 상세 정보가 없습니다."}</p>}
  </section>;
}
