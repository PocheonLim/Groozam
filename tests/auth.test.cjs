/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { NextRequest } = require("next/server");

function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled.outputText)((name) => name in mocks ? mocks[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}
function find(element, type) {
  if (!element || typeof element !== "object") return undefined;
  if (element.type === type) return element;
  for (const child of React.Children.toArray(element.props?.children)) {
    const found = find(child, type);
    if (found) return found;
  }
}
const login = load("lib/supabase/login.ts");
test("next only allows internal relative paths and normalizes dot segments", () => {
  for (const value of [undefined, "https://evil.example", "//evil.example", "/a/..//evil.example", "/\\evil.example", "/%2fevil.example", "/%252f%252fevil.example", "/\nevil.example", "javascript:alert(1)", "/auth/callback", "/login", "/a/../login"]) assert.equal(login.safeNext(value), "/mypage");
  for (const value of ["/", "/mypage", "/mypage?section=profile", "/category/bed"]) assert.equal(login.safeNext(value), value);
  assert.equal(login.validateLogin("user@example.com", "test-password"), null);
  assert.match(login.validateLogin("invalid", "test-password"), /이메일/);
  assert.match(login.validateLogin("user@example.com", ""), /비밀번호/);
  assert.match(login.loginErrorMessage("invalid_credentials"), /올바르지/);
  assert.match(login.loginErrorMessage("email_not_confirmed"), /인증/);
});

test("PKCE redirect carries session cookies, verifier deletion and cache headers", async () => {
  const { GET } = load("app/auth/callback/route.ts", {
    "@supabase/ssr": { createServerClient: (_url, _key, { cookies }) => ({ auth: { exchangeCodeForSession: async () => {
      assert.equal(cookies.getAll().find(c => c.name === "test-verifier").value, "test-only");
      cookies.setAll([
        { name: "test-session.0", value: "mock-part-a", options: { path: "/", sameSite: "lax" } },
        { name: "test-session.1", value: "mock-part-b", options: { path: "/", sameSite: "lax" } },
        { name: "test-verifier", value: "", options: { path: "/", maxAge: 0 } },
      ], { "Cache-Control": "private, no-store" });
      return { data: { session: {} }, error: null };
    } } }) },
  });
  const result = await GET(new NextRequest("https://shop.example/auth/callback?code=test&next=https://evil.example", { headers: { cookie: "test-verifier=test-only" } }));
  assert.equal(result.headers.get("location"), "https://shop.example/auth/confirmed");
  assert.equal(result.cookies.get("test-session.0").value, "mock-part-a");
  assert.equal(result.cookies.get("test-session.1").value, "mock-part-b");
  assert.equal(result.cookies.get("test-verifier").maxAge, 0);
  assert.match(result.headers.get("cache-control"), /no-store/);
});

test("verified user helper fails closed on invalid and unavailable Auth", async () => {
  for (const result of [{ data: { user: { id: "test-id" } }, error: null }, { data: { user: { id: "untrusted" } }, error: {} }, new Error("offline")]) {
    const { getCurrentUser } = load("lib/supabase/user.ts", {
      "server-only": {}, react: { cache: fn => fn },
      "./server": { createClient: async () => ({ auth: { getUser: async () => { if (result instanceof Error) throw result; return result; } } }) },
    });
    assert.deepEqual(await getCurrentUser(), result.error || result instanceof Error ? null : result.data.user);
  }
});

test("confirmed page only claims login when the server verifies a user", async () => {
  for (const user of [null, { id: "test-id" }]) {
    const Page = load("app/auth/confirmed/page.tsx", { "@/lib/supabase/user": { getCurrentUser: async () => user }, "next/link": { __esModule: true, default: "a" } }).default;
    const html = renderToStaticMarkup(await Page());
    assert.equal(html.includes("현재 로그인되어 있습니다"), Boolean(user));
    assert.equal(html.includes('href="/login"'), !user);
  }
});

test("mypage denies anonymous rendering and queries only the verified UUID", async () => {
  let user = null;
  let queries = 0;
  const Page = load("app/mypage/page.tsx", {
    "@/lib/supabase/user": { getCurrentUser: async () => user },
    "next/navigation": { redirect: (url) => { throw new Error(url); } },
    "@/app/components/LogoutButton": { __esModule: true, default: () => null },
    "@/lib/supabase/server": { createClient: async () => ({ from: table => {
      queries++; assert.equal(table, "profiles");
      return { select: () => ({ eq: (column, id) => { assert.equal(column, "id");assert.equal(id, user.id);return { maybeSingle: async () => ({ data: { id }, error: null }) }; } }) };
    } }) },
  }).default;
  await assert.rejects(Page({ searchParams: Promise.resolve({}) }), /\/login\?next=%2Fmypage/);
  assert.equal(queries, 0);
  user = { id: "verified-user-id", email: "test@example.com" };
  assert.ok(await Page({ searchParams: Promise.resolve({ section: "profile" }) }));
  assert.equal(queries, 1);
});

test("login prevents duplicate requests, recovers from failures and sanitizes navigation", async () => {
  const saved = { FormData: global.FormData, window: global.window };
  global.FormData = class { constructor(form) { this.fields = form.fields; } get(key) { return this.fields[key]; } };
  let destination;
  global.window = { location: { assign: path => { destination = path; } } };
  try {
    for (const outcome of ["success", "invalid_credentials", "email_not_confirmed", "network"]) {
      let calls = 0, finish;
      const states = [];
      const Form = load("app/components/MemberForm.tsx", {
        react: { ...React, useRef: value => ({ current: value }), useState: value => [value, next => states.push(next)] },
        "@/lib/supabase/signup": load("lib/supabase/signup.ts"),
        "@/lib/supabase/login": login,
        "@/lib/supabase/client": { createClient: () => ({ auth: { signInWithPassword: () => { calls++; return new Promise((resolve, reject) => { finish = () => outcome === "network" ? reject(new Error("offline")) : resolve({ data: { session: outcome === "success" ? {} : null }, error: outcome === "success" ? null : { code: outcome } }); }); } } }) },
      }).default;
      let resets = 0;
      const event = { preventDefault() {}, currentTarget: { fields: { email: "test@example.com", password: "test-only" }, reset() { resets++; } } };
      const submit = find(Form({ mode: "login", next: "https://evil.example" }), "form").props.onSubmit;
      const first = submit(event); await submit(event); assert.equal(calls, 1); finish(); await first;
      if (outcome === "success") { assert.equal(destination, "/mypage"); assert.equal(resets, 1); }
      else { assert.ok(states.includes(login.loginErrorMessage(outcome))); assert.equal(states.at(-1), false); }
    }
  } finally { global.FormData = saved.FormData; global.window = saved.window; }
});

test("logout uses local session scope and recovers after errors", async () => {
  const previous = global.window;
  try {
    for (const fail of [false, true]) {
      let destination;
      const states = [];
      global.window = { location: { replace: path => { destination = path; } } };
      const Button = load("app/components/LogoutButton.tsx", {
        react: { ...React, useRef: value => ({ current: value }), useState: value => [value, next => states.push(next)] },
        "@/lib/supabase/client": { createClient: () => ({ auth: { signOut: async options => { assert.equal(options.scope, "local"); return { error: fail ? {} : null }; } } }) },
      }).default;
      await find(Button(), "button").props.onClick();
      assert.equal(destination, fail ? undefined : "/");
      assert.equal(states.at(-1), false);
      if (fail) assert.ok(states.some(value => typeof value === "string" && value.includes("로그아웃하지 못했습니다")));
    }
  } finally { global.window = previous; }
});
