import "server-only";
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consentTypes, type ConsentChoices, type ConsentType } from "./consents";

export const signupConsentCookie = "groozam-signup-consents";
export const signupConsentMaxAge = 60 * 60;
export type ConsentSnapshot = {
  email: string;
  userId: string;
  choices: ConsentChoices;
  versions: Record<ConsentType, string>;
  agreedAt: string;
  expires: number;
};
export type ConsentSaveResult = "saved" | "missing" | "failed";

function key() {
  const secret = process.env.SIGNUP_PHONE_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error("Signup consent configuration unavailable");
  // Separate key/domain from the existing phone cookie without changing its format.
  return Buffer.from(hkdfSync("sha256", Buffer.from(secret, "hex"), "groozam", "signup-consents-v1", 32));
}

export function sealSignupConsents(snapshot: ConsentSnapshot) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(snapshot), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function signConsentProof(payload: string) {
  const secret = process.env.SIGNUP_CONSENT_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error("Signup consent signing unavailable");
  return createHmac("sha256", Buffer.from(secret, "hex")).update(payload, "utf8").digest("hex");
}

export function openSignupConsents(value: string | undefined): ConsentSnapshot | null {
  try {
    if (!value || value.length > 3800) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const data: ConsentSnapshot = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
    if (!data || typeof data.email !== "string" || typeof data.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(data.userId)
      || typeof data.expires !== "number" || data.expires <= Date.now()
      || typeof data.agreedAt !== "string" || !Number.isFinite(Date.parse(data.agreedAt)) || Date.parse(data.agreedAt) > Date.now()
      || data.expires - Date.parse(data.agreedAt) !== signupConsentMaxAge * 1000
      || !data.choices || !data.versions || data.choices.terms !== true || data.choices.privacy !== true
      || !consentTypes.every(type => typeof data.choices[type] === "boolean" && typeof data.versions[type] === "string" && /^\d{4}-\d{2}-\d{2}\.r[1-9]\d*$/.test(data.versions[type]))) return null;
    return data;
  } catch { return null; }
}

export async function saveSignupConsents(supabase: SupabaseClient, cookie: string | undefined): Promise<ConsentSaveResult> {
  const pending = openSignupConsents(cookie);
  if (!pending) {
    console.warn("[auth/consents] Pending record missing, invalid or expired");
    return "missing";
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email_confirmed_at || user.id !== pending.userId || user.email?.trim().toLowerCase() !== pending.email) {
      console.warn("[auth/consents] Verified account does not match pending record");
      return "missing";
    }
    const payload = JSON.stringify(pending);
    const { error: writeError } = await supabase.rpc("groozam_record_signup_consents", { p_payload: payload, p_signature: signConsentProof(payload) });
    if (writeError) {
      console.warn("[auth/consents] Record failed", { code: writeError.code });
      return "failed";
    }
    return "saved";
  } catch {
    console.warn("[auth/consents] Record unavailable");
    return "failed";
  }
}
