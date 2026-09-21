"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "groozam-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) queueMicrotask(() => setItems(JSON.parse(saved) as CartItem[]));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    addItem: (item) => setItems((current) => {
      const existing = current.find((saved) => saved.productId === item.productId);
      if (!existing) return [...current, item];
      return current.map((saved) => saved.productId === item.productId
        ? { ...saved, price: item.price, quantity: saved.quantity + item.quantity }
        : saved);
    }),
    updateQuantity: (productId, quantity) => setItems((current) => current.map((item) =>
      item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item)),
    removeItem: (productId) => setItems((current) => current.filter((item) => item.productId !== productId)),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
