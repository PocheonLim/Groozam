import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(name => name in mocks ? mocks[name] : require(name), mod, mod.exports);
  return mod.exports;
}
const documents = load("lib/legal/documents.ts");
const consents = load("lib/supabase/consents.ts", { "@/lib/legal/documents": documents });
const signup = load("lib/supabase/signup.ts", { "./consents": consents });
const profile = load("lib/supabase/profile.ts");
const phone = load("lib/supabase/signup-phone.ts", { "server-only": {} });
const consent = load("lib/supabase/signup-consents.ts", { "server-only": {}, "./consents": consents });
const userId = "00000000-0000-4000-8000-000000000001";
const email = "consent-test@example.invalid";
const versions = Object.fromEntries(consents.consentTypes.map(type => [type, "2026-09-29.r1"])); // fixture only
function snapshot(overrides = {}) {
  const agreedAt = new Date(Date.now() - 1000).toISOString();
  return { email, userId, choices: { terms: true, privacy: true, marketing_email: false, marketing_sms: true }, versions, agreedAt, expires: Date.parse(agreedAt) + 3600000, ...overrides };
}
async function withKeys(fn) {
  const previous = [process.env.SIGNUP_PHONE_SECRET, process.env.SIGNUP_CONSENT_SECRET];
  process.env.SIGNUP_PHONE_SECRET = randomBytes(32).toString("hex");
  process.env.SIGNUP_CONSENT_SECRET = randomBytes(32).toString("hex");
  try { await fn(); } finally {
    for (const [i, name] of ["SIGNUP_PHONE_SECRET", "SIGNUP_CONSENT_SECRET"].entries()) {
      if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i];
    }
  }
}

test("cookie roundtrip, optional choices, tampering, expiry and domain separation", () => withKeys(async () => {
  const original = snapshot();
  const sealed = consent.sealSignupConsents(original);
  assert.deepEqual(consent.openSignupConsents(sealed), original);
  const bytes = Buffer.from(sealed, "base64url"); bytes[30] ^= 1;
  assert.equal(consent.openSignupConsents(bytes.toString("base64url")), null);
  const expiredAt = new Date(Date.now() - 3601000).toISOString();
  assert.equal(consent.openSignupConsents(consent.sealSignupConsents(snapshot({ agreedAt: expiredAt, expires: Date.parse(expiredAt) + 3600000 }))), null);
  assert.equal(consent.openSignupConsents(phone.sealSignupPhone(email, "01012345678")), null);
  assert.equal(consent.openSignupConsents("bad"), null);
  assert.equal(consent.openSignupConsents(consent.sealSignupConsents(snapshot({ choices: { ...original.choices, terms: false } }))), null);
}));

test("verified identity and original version are bound to signed DB payload", () => withKeys(async () => {
  let calls = 0, payload;
  const client = { auth: { getUser: async () => ({ data: { user: { id: userId, email, email_confirmed_at: "confirmed" } }, error: null }) }, rpc: async (_name, args) => { calls++; payload = args; return { error: null }; } };
  const sealed = consent.sealSignupConsents(snapshot());
  assert.equal(await consent.saveSignupConsents(client, sealed), "saved");
  assert.equal(calls, 1);
  const decoded = JSON.parse(payload.p_payload);
  assert.equal(decoded.userId, userId); assert.deepEqual(decoded.versions, versions);
  assert.equal(decoded.choices.marketing_email, false); assert.equal(decoded.choices.marketing_sms, true);
  assert.equal(payload.p_signature, consent.signConsentProof(payload.p_payload));
  client.auth.getUser = async () => ({ data: { user: { id: "other", email, email_confirmed_at: "confirmed" } } });
  assert.equal(await consent.saveSignupConsents(client, sealed), "missing"); assert.equal(calls, 1);
  client.auth.getUser = async () => ({ data: { user: null }, error: {} });
  assert.equal(await consent.saveSignupConsents(client, sealed), "missing"); assert.equal(calls, 1);
}));

test("DB failure stays recoverable with same cookie and no phone dependency", () => withKeys(async () => {
  const sealed = consent.sealSignupConsents(snapshot());
  const client = { auth: { getUser: async () => ({ data: { user: { id: userId, email, email_confirmed_at: "confirmed" } } }) }, rpc: async () => ({ error: { code: "PGRST202" } }) };
  assert.equal(await consent.saveSignupConsents(client, sealed), "failed");
  client.rpc = async () => ({ error: null });
  assert.equal(await consent.saveSignupConsents(client, sealed), "saved");
}));

function signupHarness(active) {
  let calls = 0;
  const store = new Map();
  const client = { auth: { signUp: async () => { calls++; return { data: { user: { id: userId, identities: [{}] }, session: null }, error: null }; } } };
  const actions = load("app/signup/actions.ts", {
    "next/headers": { cookies: async () => ({ get: name => store.has(name) ? { value: store.get(name) } : undefined, set: (name, value) => store.set(name, value), delete: name => store.delete(name) }), headers: async () => new Headers({ origin: "http://localhost:3000" }) },
    "@/lib/supabase/server": { createClient: async () => client }, "@/lib/supabase/profile": profile,
    "@/lib/supabase/signup-phone": phone, "@/lib/supabase/signup-consents": consent,
    "@/lib/supabase/consents": { ...consents, getActiveConsentVersions: () => active ? versions : null }, "@/lib/supabase/signup": signup,
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ email, password: "fixture-password", passwordConfirm: "fixture-password", phone: "010-1234-5678" })) form.set(key, value);
  for (const type of consents.consentTypes) { form.set(type, type === "terms" || type === "privacy" ? "true" : "false"); form.set(`version_${type}`, versions[type]); }
  return { actions, form, store, calls: () => calls };
}

test("server blocks missing required consent, drafts, stale versions before signUp", () => withKeys(async () => {
  for (const type of ["terms", "privacy"]) {
    const h = signupHarness(true); h.form.set(type, "false");
    assert.ok((await h.actions.signupWithConsents(h.form)).error); assert.equal(h.calls(), 0);
  }
  const draft = signupHarness(false); assert.ok((await draft.actions.signupWithConsents(draft.form)).error); assert.equal(draft.calls(), 0);
  assert.equal(consents.getActiveConsentVersions(), null); // real documents remain drafts
  const stale = signupHarness(true); stale.form.set("version_terms", "2020-01-01.r1");
  assert.ok((await stale.actions.signupWithConsents(stale.form)).error); assert.equal(stale.calls(), 0);
}));

test("required-only signup succeeds and preserves both phone and false optional consents", () => withKeys(async () => {
  const h = signupHarness(true);
  assert.deepEqual(await h.actions.signupWithConsents(h.form), {}); assert.equal(h.calls(), 1);
  const pending = consent.openSignupConsents(h.store.get(consent.signupConsentCookie));
  assert.equal(pending.userId, userId); assert.equal(pending.choices.marketing_email, false); assert.equal(pending.choices.marketing_sms, false);
  assert.ok(h.store.get(phone.signupPhoneCookie));
  let phoneValue;
  const client = { auth: { getUser: async () => ({ data: { user: { id: userId, email, email_confirmed_at: "confirmed" } } }) }, from: () => ({ update: v => { phoneValue = v; return { eq: () => ({ is: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: userId }, error: null }) }) }) }) }; } }) };
  assert.equal(await phone.saveSignupPhone(client, h.store.get(phone.signupPhoneCookie)), true);
  assert.deepEqual(phoneValue, { phone: "01012345678" });
}));

test("server preserves independent optional choices and rejects malformed choices", () => withKeys(async () => {
  const h = signupHarness(true); h.form.set("marketing_email", "true");
  assert.deepEqual(await h.actions.signupWithConsents(h.form), {});
  const pending = consent.openSignupConsents(h.store.get(consent.signupConsentCookie));
  assert.equal(pending.choices.marketing_email, true); assert.equal(pending.choices.marketing_sms, false);
  const malformed = signupHarness(true); malformed.form.set("marketing_sms", "unknown");
  assert.ok((await malformed.actions.signupWithConsents(malformed.form)).error); assert.equal(malformed.calls(), 0);
}));

test("missing signing configuration blocks signUp before account creation", () => withKeys(async () => {
  delete process.env.SIGNUP_CONSENT_SECRET;
  const h = signupHarness(true);
  assert.ok((await h.actions.signupWithConsents(h.form)).error); assert.equal(h.calls(), 0);
}));

test("callback preserves successful auth and phone handling when consent storage fails", async () => {
  const deleted = [], saved = [];
  let phoneCalls = 0, consentCalls = 0, consentResult = "failed";
  const response = { headers: new Headers(), cookies: { delete: name => deleted.push(name), set: name => saved.push(name) } };
  const callback = load("app/auth/callback/route.ts", {
    "next/server": { NextResponse: { redirect: () => response } },
    "@supabase/ssr": { createServerClient: (_url, _key, options) => ({ auth: { exchangeCodeForSession: async () => { options.cookies.setAll([{ name: "session-fixture", value: "fixture", options: {} }], {}); return { data: { session: {} }, error: null }; } } }) },
    "@/lib/supabase/signup-phone": { signupPhoneCookie: phone.signupPhoneCookie, saveSignupPhone: async () => { phoneCalls++; return true; } },
    "@/lib/supabase/signup-consents": { signupConsentCookie: consent.signupConsentCookie, saveSignupConsents: async () => { consentCalls++; return consentResult; } },
  });
  const request = { url: "https://example.invalid/auth/callback?code=fixture&next=https://external.invalid", nextUrl: new URL("https://example.invalid/auth/callback?code=fixture"), cookies: { getAll: () => [], get: () => ({ value: "fixture" }) } };
  await callback.GET(request);
  assert.equal(response.headers.get("Location"), "https://example.invalid/auth/confirmed");
  assert.equal(phoneCalls, 1); assert.equal(consentCalls, 1);
  assert.ok(saved.includes("session-fixture")); assert.ok(deleted.includes(phone.signupPhoneCookie)); assert.ok(!deleted.includes(consent.signupConsentCookie));
  consentResult = "saved"; await callback.GET(request); assert.ok(deleted.includes(consent.signupConsentCookie));
});
