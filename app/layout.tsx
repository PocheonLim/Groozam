import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Header from "./components/Header";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "GROOZAM",
  description: "좋은 잠을 위한 가구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-neutral-900">
        <Header />
        {children}
      </body>
    </html>
  );
}
