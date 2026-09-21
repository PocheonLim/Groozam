export type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

export const MAX_CART_QUANTITY = 99;

export function readCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem => {
      if (!item || typeof item !== "object") return false;
      return typeof item.productId === "string" && /^\d+$/.test(item.productId)
        && typeof item.productName === "string" && item.productName.trim().length > 0
        && typeof item.price === "number" && Number.isSafeInteger(item.price) && item.price >= 0
        && typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= MAX_CART_QUANTITY
        && typeof item.imageUrl === "string";
    }).filter((item, index, items) => items.findIndex((other) => other.productId === item.productId) === index);
  } catch {
    return [];
  }
}
