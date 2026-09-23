import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const signupPhoneCookie = "groozam-signup-phone";
export const signupPhoneMaxAge = 60 * 60;
function key() {
  const secret = process.env.SIGNUP_PHONE_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error("Signup phone configuration unavailable");
  return Buffer.from(secret, "hex");
}
export function sealSignupPhone(email: string, phone: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ email: email.trim().toLowerCase(), phone, expires: Date.now() + signupPhoneMaxAge * 1000 }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
function openSignupPhone(value: string) {
  try {
    if (value.length > 2048) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (typeof data.email !== "string" || typeof data.phone !== "string" || !/^010\d{8}$/.test(data.phone) || typeof data.expires !== "number" || data.expires < Date.now()) return null;
    return data as { email: string; phone: string; expires: number };
  } catch { return null; }
}

export async function saveSignupPhone(supabase: SupabaseClient, cookie: string | undefined): Promise<boolean> {
  if (!cookie) return false;
  const pending = openSignupPhone(cookie);
  if (!pending) return false;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email_confirmed_at || user.email?.trim().toLowerCase() !== pending.email) return false;
    // Only fill a blank phone. A retry never overwrites an existing/editing user's number.
    const { data, error: updateError } = await supabase.from("profiles").update({ phone: pending.phone }).eq("id", user.id).is("phone", null).select("id").maybeSingle();
    if (updateError) return false;
    if (data) return true;
    const { data: existing, error: readError } = await supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle();
    return !readError && Boolean(existing?.phone);
  } catch { return false; }
}
