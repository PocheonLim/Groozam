import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/app/components/LogoutButton";
import ProfileForm from "@/app/components/ProfileForm";

export const metadata: Metadata = { title: "마이페이지 | GROOZAM", description: "그루잠 주문·배송 및 회원정보", robots: { index: false } };

const menus = [
  { key: "overview", label: "마이페이지 홈" },
  { key: "orders", label: "주문·배송 조회" },
  { key: "claims", label: "취소·교환·반품" },
  { key: "addresses", label: "배송지 관리" },
  { key: "profile", label: "회원정보" },
] as const;

export default async function MyPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const { section } = await searchParams;
  const current = menus.find((menu) => menu.key === section) ?? menus[0];
  const user = await getCurrentUser();
  if (!user) {
    const next = current.key === "overview" ? "/mypage" : `/mypage?section=${current.key}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id, display_name, phone").eq("id", user.id).maybeSingle();

  return <main className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-20">
    <p className="text-xs tracking-[0.18em] text-stone-500">MY GROOZAM</p>
    <h1 className="mt-3 text-3xl font-medium">마이페이지</h1>
    <div className="mt-8 flex flex-col justify-between gap-6 bg-stone-50 p-6 sm:flex-row sm:items-center md:p-8">
      <div><h2 className="text-xl font-medium">그루잠에 오신 것을 환영합니다.</h2><p className="mt-3 break-all text-sm leading-6 text-stone-600">{user.email}</p><p className="mt-2 text-xs text-stone-500">회원정보에서 이름과 휴대전화를 관리할 수 있습니다.</p></div>
      <LogoutButton />
    </div>

    <div className="mt-10 grid gap-8 md:grid-cols-[180px_1fr] md:gap-12">
      <nav aria-label="마이페이지 메뉴" className="flex gap-5 overflow-x-auto border-b border-stone-200 pb-4 md:flex-col md:gap-1 md:overflow-visible md:border-b-0">
        {menus.map((menu) => <Link key={menu.key} href={menu.key === "overview" ? "/mypage" : `/mypage?section=${menu.key}`} aria-current={current.key === menu.key ? "page" : undefined} className={`whitespace-nowrap py-3 text-sm ${current.key === menu.key ? "font-medium text-stone-900 underline underline-offset-8" : "text-stone-500 hover:text-stone-900"}`}>{menu.label}</Link>)}
        <Link href="/cart" className="whitespace-nowrap py-3 text-sm text-stone-500 hover:text-stone-900 md:mt-4">장바구니</Link>
      </nav>

      <section className="min-w-0" aria-label={current.label}>
        {current.key === "overview" ? <>
          <div className="flex items-center justify-between border-b border-stone-900 pb-4"><h2 className="text-lg font-medium">주문·배송 현황</h2><Link href="/mypage?section=orders" className="text-xs text-stone-500">전체 보기 →</Link></div>
          <ol className="grid grid-cols-2 gap-y-6 border-b border-stone-200 py-8 sm:grid-cols-4">{["결제 완료", "상품 준비", "배송 중", "배송 완료"].map((step) => <li key={step} className="text-center"><span className="block text-2xl text-stone-300" aria-label="준비 중">—</span><span className="mt-3 block text-sm text-stone-600">{step}</span></li>)}</ol>
          <p className="py-8 text-center text-sm text-stone-500">주문 현황 조회 기능은 준비 중입니다.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{[{ href: "addresses", title: "배송지 관리", text: "자주 사용하는 배송지를 관리하세요." }, { href: "profile", title: "회원정보", text: "기본 정보와 연결 계정을 확인하세요." }].map((card) => <Link key={card.href} href={`/mypage?section=${card.href}`} className="border border-stone-200 p-6 hover:border-stone-500"><h3 className="font-medium">{card.title} <span aria-hidden="true" className="float-right">→</span></h3><p className="mt-3 text-sm leading-6 text-stone-500">{card.text}</p></Link>)}</div>
        </> : current.key === "profile" ? <>
          <h2 className="border-b border-stone-900 pb-4 text-lg font-medium">회원정보</h2>
          {profileError || !profile ? <p role="status" className="mt-4 text-sm text-stone-500">회원정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</p> : <ProfileForm email={user.email ?? "—"} profile={profile} />}
        </> : <>
          <h2 className="border-b border-stone-900 pb-4 text-lg font-medium">{current.label}</h2>
          <ComingSoon text={current.key === "addresses" ? "배송지 등록 및 관리 기능은 준비 중입니다." : current.key === "claims" ? "취소·교환·반품 기능은 준비 중입니다." : "주문·배송 조회 기능은 준비 중입니다."} />
        </>}
      </section>
    </div>
  </main>;
}

function ComingSoon({ text }: { text: string }) {
  return <div className="border-b border-stone-200 px-4 py-16 text-center"><p className="text-base">서비스 준비 중입니다.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-500">{text}</p></div>;
}
