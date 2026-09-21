export function getProductPrice(product: { salePrice: number; discountedPrice?: number }) {
  return product.discountedPrice != null && product.discountedPrice >= 0 && product.discountedPrice < product.salePrice
    ? product.discountedPrice
    : product.salePrice;
}
