"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
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
  return <div>
    <button type="button" onClick={logout} disabled={pending} className="py-2 text-sm text-stone-600 hover:text-stone-950 disabled:opacity-50">{pending ? "로그아웃 중…" : "로그아웃"}</button>
    {error && <p role="alert" className="max-w-56 text-xs leading-5 text-stone-600">{error}</p>}
  </div>;
}
