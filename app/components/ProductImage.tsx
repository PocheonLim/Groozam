"use client";

import { useState } from "react";

export default function ProductImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={`flex items-center justify-center bg-stone-100 text-xs tracking-[0.12em] text-stone-400 ${className ?? ""}`}>IMAGE</div>;
  }
  // The API may return images from multiple seller domains, so a native image avoids an unsafe broad remotePatterns rule.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}
