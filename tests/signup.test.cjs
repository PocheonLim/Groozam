/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { NextRequest } = require("next/server");

function load(file, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled.outputText)((name) => name in mocks ? mocks[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}
const validation = load("lib/supabase/signup.ts");

test("signup validation rejects invalid input before sending", () => {
  const valid = ["member@example.com", "safe-password", "safe-password", true];
  assert.equal(validation.validateSignup(...valid), null);
  for (const email of ["", "bad", "a@", "a@b", "a b@example.com"]) assert.ok(validation.validateSignup(email, ...valid.slice(1)));
  assert.match(validation.validateSignup(valid[0], "short", "short", true), /8자/);
  assert.match(validation.validateSignup(valid[0], valid[1], "different", true), /일치/);
  assert.match(validation.validateSignup(...valid.slice(0, 3), false), /동의/);
  for (const code of ["weak_password", "user_already_exists", "over_email_send_rate_limit", "unknown"]) assert.match(validation.signupErrorMessage(code), /[가-힣]/);
});

test("callback exchanges code only and uses fixed internal destinations", async () => {
  let calls = 0;
  let result = { data: { session: {} }, error: null };
  const { GET } = load("app/auth/callback/route.ts", {
    "@supabase/ssr": { createServerClient: () => ({ auth: { exchangeCodeForSession: async (code) => {
      calls++;
      assert.equal(code, "test-code");
      if (result instanceof Error) throw result;
      return result;
    } } }) },
  });
  const request = (query) => new NextRequest(`https://groozam.example/auth/callback${query}`);
  for (const query of ["", "?error=denied", "?code=test-code&error=denied"]) {
    const response = await GET(request(query));
    assert.equal(response.headers.get("location"), "https://groozam.example/signup?error=confirmation");
  }
  assert.equal(calls, 0);
  for (const destination of ["https://evil.example", "//evil.example", "/mypage", "%2F%2Fevil.example"]) {
    const response = await GET(request(`?code=test-code&next=${encodeURIComponent(destination)}&redirectTo=${encodeURIComponent(destination)}`));
    assert.equal(response.headers.get("location"), "https://groozam.example/auth/confirmed");
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  }
  for (const failure of [{ data: { session: null }, error: { status: 400 } }, new Error("network")]) {
    result = failure;
    assert.equal((await GET(request("?code=test-code"))).headers.get("location"), "https://groozam.example/signup?error=confirmation");
  }
});

function find(element, type) {
  if (!element || typeof element !== "object") return undefined;
  if (element.type === type) return element;
  for (const child of React.Children.toArray(element.props?.children)) {
    const found = find(child, type);
    if (found) return found;
  }
}

test("signup blocks concurrent submissions, clears password fields and leaves reset disconnected", async () => {
  const previous = { FormData: global.FormData, window: global.window };
  global.FormData = class { constructor(form) { this.fields = form.fields; } get(key) { return this.fields[key] ?? null; } };
  global.window = { location: { origin: "https://groozam.example" } };
  try {
    let calls = 0;
    let resolve;
    const states = [];
    const MemberForm = load("app/components/MemberForm.tsx", {
      react: { ...React, useState: (value) => [value, (next) => states.push(next)], useRef: (value) => ({ current: value }) },
      "next/link": { __esModule: true, default: "a" },
      "@/lib/supabase/signup": validation,
      "@/lib/supabase/login": load("lib/supabase/login.ts"),
      "@/lib/supabase/client": { createClient: () => ({ auth: { signUp: (input) => {
        calls++;
        assert.deepEqual(Object.keys(input).sort(), ["email", "options", "password"]);
        assert.equal(input.options.emailRedirectTo, "https://groozam.example/auth/callback");
        return new Promise((done) => { resolve = done; });
      } } }) },
    }).default;
    let resets = 0;
    const event = { preventDefault() {}, currentTarget: { fields: { email: "member@example.com", password: "safe-password", passwordConfirm: "safe-password", terms: "on" }, reset() { resets++; } } };
    const form = find(MemberForm({ mode: "signup" }), "form");
    const first = form.props.onSubmit(event);
    await form.props.onSubmit(event);
    assert.equal(calls, 1);
    resolve({ data: { user: { identities: [] }, session: null }, error: null });
    await first;
    assert.equal(resets, 1);
    assert.ok(states.some((value) => typeof value === "string" && value.includes("이미 가입한 주소")));
    await find(MemberForm({ mode: "reset" }), "form").props.onSubmit(event);
    assert.equal(calls, 1);
  } finally {
    global.FormData = previous.FormData;
    global.window = previous.window;
  }
});
