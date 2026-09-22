"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import logo from "../../public/rogo.png";
import { categories } from "@/app/lib/categories";
import LogoutButton from "./LogoutButton";
import { createClient } from "@/lib/supabase/client";

const navItems = categories.map((category) => ({ href: `/category/${category.slug}`, label: category.label }));

export default function Header({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    // Auth events only request a new server verdict; their client payload is
    // never used as the authority for access or the displayed login state.
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
    });
    const restore = (event: PageTransitionEvent) => { if (event.persisted) router.refresh(); };
    window.addEventListener("pageshow", restore);
    return () => { subscription.unsubscribe(); window.removeEventListener("pageshow", restore); };
  }, [router]);
  return <HeaderBar key={`${pathname}-${authenticated}`} pathname={pathname} authenticated={authenticated} />;
}

function HeaderBar({ pathname, authenticated }: { pathname: string; authenticated: boolean }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    searchButton.current?.focus();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-10 max-lg:flex max-lg:h-16 max-lg:justify-between max-lg:px-5">
        <Link href="/" aria-label="GROOZAM 홈" className="justify-self-start">
          <Image
            src={logo}
            alt="GROOZAM"
            priority
            className="h-6 w-auto max-lg:h-5"
          />
        </Link>

        <nav className="flex items-center gap-9 max-lg:hidden" aria-label="주요 메뉴">
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
            ref={searchButton}
            type="button"
            aria-label="검색"
            aria-expanded={searchOpen}
            aria-controls="header-search"
            onClick={() => { setSearchOpen((open) => !open); setMenuOpen(false); }}
            className={iconControlClass}
          >
            <SearchIcon />
          </button>
          <div className="relative" onKeyDown={(event) => { if (event.key === "Escape") { setAccountOpen(false); event.currentTarget.querySelector("button")?.focus(); } }}>
            <button type="button" aria-label={authenticated ? "내 계정" : "로그인 및 회원가입"} aria-expanded={accountOpen} aria-controls="account-nav" className={iconControlClass} onClick={() => setAccountOpen((open) => !open)}><UserIcon /></button>
            {accountOpen && <nav id="account-nav" aria-label="회원 메뉴" className="absolute right-0 top-full mt-4 w-56 space-y-2 border border-stone-200 bg-white p-5 shadow-sm">
              {authenticated ? <><Link href="/mypage" className="block py-2 text-sm">마이페이지</Link><LogoutButton /></> : <><Link href="/login" className="block py-2 text-sm">로그인</Link><Link href="/signup" className="block py-2 text-sm">회원가입</Link></>}
            </nav>}
          </div>
          <IconLink href="/cart" label="장바구니" active={pathname === "/cart"}>
            <BagIcon />
          </IconLink>
          <button
            type="button"
            className="hidden size-10 items-center justify-center text-neutral-900 max-lg:inline-flex"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => { setMenuOpen((open) => !open); setSearchOpen(false); }}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {searchOpen && <section
        id="header-search"
        aria-label="상품 검색"
        className="absolute inset-x-0 top-full border-y border-stone-200 bg-white px-5 py-7 shadow-sm md:px-10 md:py-10"
        onKeyDown={(event) => { if (event.key === "Escape") closeSearch(); }}
      >
        <div className="mx-auto max-w-2xl">
          <form role="search" action="/search" onSubmit={(event) => {
            event.preventDefault();
            const keyword = query.trim();
            if (!keyword) { searchInput.current?.focus(); return; }
            setSearchOpen(false);
            router.push(`/search?q=${encodeURIComponent(keyword)}`);
          }}>
            <div className="flex items-center gap-3 border-b border-stone-900 pb-3">
              <label htmlFor="header-query" className="sr-only">검색어</label>
              <input ref={searchInput} id="header-query" name="q" type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="어떤 가구를 찾으시나요?" className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none" />
              <button type="submit" aria-label="검색 실행" className="inline-flex size-10 shrink-0 items-center justify-center"><SearchIcon /></button>
              <button type="button" onClick={closeSearch} className="shrink-0 py-2 text-sm text-stone-500">닫기</button>
            </div>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-xs text-stone-500">추천 검색어</p>
            {categories.map((category) => <button key={category.slug} type="button" onClick={() => { setQuery(category.label); searchInput.current?.focus(); }} className="py-2 text-sm text-stone-700 hover:text-stone-950 hover:underline underline-offset-4">{category.label}</button>)}
          </div>
        </div>
      </section>}

      {menuOpen ? (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-5 border-t border-neutral-200 bg-white px-5 py-6 lg:hidden"
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
