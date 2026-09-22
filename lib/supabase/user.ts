import "server-only";
import { cache } from "react";
import { createClient } from "./server";

// Deduplicate within one render only; never cache a user's identity globally.
export const getCurrentUser = cache(async () => {
  // Keep Next.js cookies()/dynamic-render control flow outside the Auth catch.
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    console.warn("[auth] User verification unavailable");
    return null;
  }
});
