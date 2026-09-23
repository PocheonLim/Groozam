"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ compact = false }: { compact?: boolean } = {}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function logout() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw new Error("signout_failed");
      window.location.replace("/");
    } catch {
      setError("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return <div className={compact ? "relative" : undefined}>
    <button type="button" onClick={logout} disabled={pending} aria-busy={pending} className={`whitespace-nowrap py-2 text-stone-600 hover:text-stone-950 disabled:opacity-50 ${compact ? "text-xs max-[360px]:text-[11px]" : "text-sm"}`}>{pending && !compact ? "로그아웃 중…" : "로그아웃"}</button>
    {error && <p role="alert" className={`text-xs leading-5 text-stone-600 ${compact ? "absolute right-0 top-full mt-4 w-48 border border-stone-200 bg-white p-3 shadow-sm" : "max-w-56"}`}>{error}</p>}
  </div>;
}
