"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import logo from "../../public/rogo.png";

const navItems = [
  { href: "/shop", label: "SHOP" },
  { href: "/about", label: "ABOUT" },
  { href: "/journal", label: "JOURNAL" },
] as const;

export default function Header() {
  const pathname = usePathname();
  return <HeaderBar key={pathname} pathname={pathname} />;
}

function HeaderBar({ pathname }: { pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-10 max-md:flex max-md:h-16 max-md:justify-between max-md:px-5">
        <Link href="/" aria-label="GROOZAM 홈" className="justify-self-start">
          <Image
            src={logo}
            alt="GROOZAM"
            priority
            className="h-6 w-auto max-md:h-5"
          />
        </Link>

        <nav className="flex items-center gap-9 max-md:hidden" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[12px] tracking-[0.16em] text-neutral-900 transition-opacity hover:opacity-45 ${
                pathname === item.href ? "underline decoration-1 underline-offset-[7px]" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-5 justify-self-end">
          <button
            type="button"
            aria-label="검색"
            className={iconControlClass}
          >
            <SearchIcon />
          </button>
          <IconLink href="/mypage" label="마이페이지" active={pathname === "/mypage"}>
            <UserIcon />
          </IconLink>
          <IconLink href="/cart" label="장바구니" active={pathname === "/cart"}>
            <BagIcon />
          </IconLink>
          <button
            type="button"
            className="hidden size-10 items-center justify-center text-neutral-900 max-md:inline-flex"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-5 border-t border-neutral-200 bg-white px-5 py-6 md:hidden"
          aria-label="모바일 메뉴"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[13px] tracking-[0.16em] text-neutral-900 ${
                pathname === item.href ? "underline decoration-1 underline-offset-[6px]" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

const iconControlClass =
  "inline-flex size-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-neutral-900 transition-opacity hover:opacity-45";

function IconLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${iconControlClass} ${active ? "opacity-45" : ""}`}
    >
      {children}
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M16 16.5 20.5 21" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.15" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.6 19.4c.85-3.05 3.35-4.9 6.4-4.9s5.55 1.85 6.4 4.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8.5h10l-.7 11.1a1.2 1.2 0 0 1-1.2 1.1H8.9a1.2 1.2 0 0 1-1.2-1.1L7 8.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 8.5V7.2a2.5 2.5 0 0 1 5 0v1.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {open ? (
        <>
          <path d="M6 6 18 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M18 6 6 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M5 8h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M5 16h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
