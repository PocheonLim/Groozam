"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OriginProduct } from "@/app/lib/naver-commerce";
import { useCart } from "./CartProvider";
import ProductImage from "./ProductImage";

const money = new Intl.NumberFormat("ko-KR");
const formatPrice = (value: number) => `${money.format(value)}원`;

export default function OriginProductDetail({ product }: { product: OriginProduct }) {
  const { addItem } = useCart();
  const images = [product.images?.representativeImage, ...(product.images?.optionalImages ?? [])].filter((image): image is { url: string } => Boolean(image?.url));
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const soldOut = product.statusType !== "SALE";
  const addToCart = () => {
    if (soldOut) return;
    addItem({ productId: String(product.originProductNo), productName: product.name, price: product.salePrice, quantity, imageUrl: images[0]?.url ?? "" });
    setNotice("장바구니에 담았습니다.");
  };

  return <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-10 md:py-10"><nav aria-label="현재 위치" className="mb-7 text-xs text-stone-500"><Link href="/shop" className="hover:text-stone-900">SHOP</Link><span className="mx-2">/</span><span>PRODUCT</span></nav><div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,.9fr)] lg:gap-16"><section><div className="relative aspect-square overflow-hidden bg-stone-100"><ProductImage src={images[activeImage]?.url} alt={product.name} className="size-full object-cover" />{soldOut && <div className="absolute inset-0 grid place-items-center bg-black/35 text-sm tracking-[0.16em] text-white">SOLD OUT</div>}</div>{images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((image, index) => <button key={image.url} type="button" aria-label={`${index + 1}번째 상품 이미지`} aria-pressed={index === activeImage} onClick={() => setActiveImage(index)} className={`size-16 shrink-0 overflow-hidden border ${index === activeImage ? "border-stone-900" : "border-transparent"}`}><ProductImage src={image.url} alt="" className="size-full object-cover" /></button>)}</div>}</section><section className="lg:pt-4"><p className="text-xs tracking-[0.16em] text-stone-500">GROOZAM</p><h1 className="mt-3 text-2xl font-medium leading-snug md:text-3xl">{product.name}</h1><div className="mt-8 border-y border-stone-200 py-6"><strong className="text-xl">{formatPrice(product.salePrice)}</strong></div>{!soldOut && <div className="mt-6 flex items-center justify-between"><span className="text-sm">수량</span><div className="flex items-center border border-stone-300"><button type="button" aria-label="수량 줄이기" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="size-10 text-lg">−</button><output className="grid size-10 place-items-center text-sm">{quantity}</output><button type="button" aria-label="수량 늘리기" onClick={() => setQuantity((value) => value + 1)} className="size-10 text-lg">+</button></div></div>}<div className="mt-5 flex justify-between border-t border-stone-900 pt-5"><span className="font-medium">총 상품금액</span><strong className="text-lg">{formatPrice(product.salePrice * quantity)}</strong></div><div className="mt-6 grid grid-cols-2 gap-2"><button type="button" disabled={soldOut} onClick={addToCart} className="h-14 border border-stone-900 text-sm disabled:border-stone-300 disabled:text-stone-400">장바구니</button><Link href={soldOut ? "#" : `/order?product=${product.originProductNo}&quantity=${quantity}`} aria-disabled={soldOut} className="grid h-14 place-items-center bg-stone-900 text-sm text-white aria-disabled:pointer-events-none aria-disabled:bg-stone-300">바로 구매</Link></div>{notice && <p role="status" className="mt-3 text-sm text-stone-600">{notice} <Link className="underline" href="/cart">장바구니 보기</Link></p>}</section></div><DetailContent content={product.detailContent} productName={product.name} /></main>;
}

function DetailContent({ content, productName }: { content?: string; productName: string }) {
  const { imageUrls, text } = useMemo(() => {
    if (!content) return { imageUrls: [], text: "" };
    const document = new DOMParser().parseFromString(content, "text/html");
    return { imageUrls: Array.from(document.images).map((image) => image.src).filter(Boolean), text: document.body.textContent?.trim() ?? "" };
  }, [content]);
  return <section className="mt-20 border-t border-stone-300"><h2 className="py-5 text-lg font-medium">상품 상세 정보</h2>{imageUrls.length ? <div className="mx-auto max-w-[860px]">{imageUrls.map((url, index) => <ProductImage key={`${url}-${index}`} src={url} alt={`${productName} 상세 이미지 ${index + 1}`} className="block h-auto w-full" />)}</div> : content ? <p className="whitespace-pre-wrap border-t border-stone-200 py-12 text-sm leading-7 text-stone-700">{text}</p> : <p className="border-t border-stone-200 py-12 text-sm text-stone-500">등록된 상품 상세 정보가 없습니다.</p>}</section>;
}
