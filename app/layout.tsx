import type { Metadata } from "next";
import Header from "./components/Header";
import { CartProvider } from "./components/CartProvider";
import "./globals.css";
import { getCurrentUser } from "@/lib/supabase/user";

export const metadata: Metadata = {
  title: "GROOZAM",
  description: "좋은 쉼을 위한 가구, 그루잠",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-white font-sans text-neutral-900">
        <CartProvider>
          <Header authenticated={Boolean(user)} />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
