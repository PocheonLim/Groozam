"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { MAX_CART_QUANTITY, readCart, type CartItem } from "@/app/lib/cart";

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  storageError: boolean;
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "groozam-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setItems(readCart(window.localStorage.getItem(STORAGE_KEY)));
      } catch {
        setItems([]);
        setStorageError(true);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (items === null) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items: items ?? [],
    ready: items !== null,
    storageError,
    addItem: (item) => setItems((current) => {
      if (current === null) return current;
      const existing = current.find((saved) => saved.productId === item.productId);
      if (!existing) return [...current, item];
      return current.map((saved) => saved.productId === item.productId
        ? { ...saved, price: item.price, quantity: Math.min(MAX_CART_QUANTITY, saved.quantity + item.quantity) }
        : saved);
    }),
    updateQuantity: (productId, quantity) => setItems((current) => !Number.isFinite(quantity) ? current : current?.map((item) =>
      item.productId === productId ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(quantity))) } : item) ?? null),
    removeItem: (productId) => setItems((current) => current?.filter((item) => item.productId !== productId) ?? null),
  }), [items, storageError]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
