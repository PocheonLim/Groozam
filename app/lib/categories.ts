export const categories = [
  { slug: "beds", label: "침대", naverCategoryIds: ["50001228"] },
  { slug: "dressers", label: "서랍장", naverCategoryIds: ["50007189"] },
  { slug: "mattresses", label: "매트리스", naverCategoryIds: ["50018859"] },
  { slug: "nightstands", label: "협탁", naverCategoryIds: ["50001307"] },
  { slug: "tables", label: "테이블", naverCategoryIds: ["50001235", "50001238"] },
  { slug: "wardrobes", label: "장롱", naverCategoryIds: ["50001230"] },
] as const;

export function matchesCategory(
  product: { categoryId?: string; wholeCategoryId?: string },
  category: (typeof categories)[number],
) {
  // Include descendants such as bed frames and side tables using the category path.
  const categoryPath = product.wholeCategoryId?.split(">").map((id) => id.trim()) ?? [];
  return category.naverCategoryIds.some((id) => product.categoryId === id || categoryPath.includes(id));
}
