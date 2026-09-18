"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ChannelProduct } from "@/app/lib/naver-commerce";
import ProductImage from "./ProductImage";

const money = new Intl.NumberFormat("ko-KR");
const formatPrice = (price: number) => `${money.format(price)}원`;

function discountedPrice(product: ChannelProduct) {
  return product.discountedPrice && product.discountedPrice < product.salePrice ? product.discountedPrice : product.salePrice;
}

export default function ProductGrid({ products }: { products: ChannelProduct[] }) {
  const [sort, setSort] = useState("latest");
  const [favorites, setFavorites] = useState<string[]>([]);
  const sorted = useMemo(() => [...products].sort((a, b) => {
    if (sort === "low") return discountedPrice(a) - discountedPrice(b);
    if (sort === "high") return discountedPrice(b) - discountedPrice(a);
    return 0;
  }), [products, sort]);

  return <>
    <div className="mb-8 flex items-center justify-between border-y border-stone-200 py-4 text-sm">
      <p>{products.length} products</p>
      <label className="flex items-center gap-3 text-xs text-stone-600">SORT
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-white py-1 text-sm text-stone-900 outline-none">
          <option value="latest">신상품순</option><option value="low">낮은 가격순</option><option value="high">높은 가격순</option>
        </select>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
      {sorted.map((product) => {
        const id = String(product.originProductNo);
        const sale = discountedPrice(product);
        const discount = sale < product.salePrice ? Math.round(((product.salePrice - sale) / product.salePrice) * 100) : 0;
        const soldOut = product.stockQuantity <= 0 || product.statusType !== "SALE";
        return <article key={id} className="group relative min-w-0">
          <Link href={`/shop/${id}`} className="block">
            <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
              <ProductImage src={product.representativeImage?.url} alt={product.name} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              {soldOut && <div className="absolute inset-0 grid place-items-center bg-black/35 text-xs tracking-[0.16em] text-white">SOLD OUT</div>}
            </div>
            <div className="pt-4">
              <p className="line-clamp-2 min-h-10 text-sm leading-5 text-stone-900">{product.name}</p>
              {product.sellerTags?.length ? <p className="mt-2 text-[11px] tracking-wide text-stone-500">{product.sellerTags.map((tag) => `#${tag.text}`).join(" ")}</p> : null}
              <div className="mt-3 flex items-baseline gap-2"><span className="text-sm font-medium">{formatPrice(sale)}</span>{discount > 0 && <><span className="text-xs text-stone-400 line-through">{formatPrice(product.salePrice)}</span><span className="text-sm text-rose-700">{discount}%</span></>}</div>
              <p className="mt-2 text-xs text-stone-500">{product.deliveryFee === 0 ? "무료배송" : product.deliveryFee ? `배송비 ${formatPrice(product.deliveryFee)}` : "배송 정보 확인"}</p>
            </div>
          </Link>
          <button type="button" aria-label={`${product.name} 관심상품`} onClick={() => setFavorites((saved) => saved.includes(id) ? saved.filter((savedId) => savedId !== id) : [...saved, id])} className="absolute right-2 top-2 grid size-8 place-items-center bg-white/80 text-stone-700">
            <span aria-hidden="true">{favorites.includes(id) ? "♥" : "♡"}</span>
          </button>
        </article>;
      })}
    </div>
  </>;
}
