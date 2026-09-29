// Optional local SQL check; see supabase/MEMBER_CONSENTS.md for the temporary engine setup.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac, randomBytes } from "node:crypto";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const engine = resolve(".next/consent-db-check/node_modules/@electric-sql/pglite");
const { PGlite } = require(engine);
const { pgcrypto } = require(`${engine}/dist/contrib/pgcrypto.cjs`);
const db = new PGlite({ extensions: { pgcrypto } });
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;`);
  await db.exec(readFileSync("supabase/migrations/20260922013649_create_member_schema.sql", "utf8"));
  const first = "00000000-0000-4000-8000-000000000001", other = "00000000-0000-4000-8000-000000000002";
  await db.query("insert into auth.users values ($1,'one@example.invalid',now()),($2,'two@example.invalid',now())", [first, other]);
  // Legacy duplicates must survive the new partial unique index unchanged.
  await db.query("insert into public.member_consents(user_id,consent_type,document_version,granted) values ($1,'terms','legacy',true),($1,'terms','legacy',false)", [first]);
  await db.exec(readFileSync("supabase/migrations/20260929020000_signup_consent_records.sql", "utf8"));
  const secret = randomBytes(32).toString("hex");
  await db.query("insert into groozam_private.consent_signing_key(secret) values ($1)", [secret]);
  const agreedAt = new Date(Date.now() - 1000).toISOString();
  const fixture = { email: "one@example.invalid", userId: first, choices: { terms: true, privacy: true, marketing_email: false, marketing_sms: true }, versions: { terms: "2026-09-29.r1", privacy: "2026-09-29.r1", marketing_email: "2026-09-29.r1", marketing_sms: "2026-09-29.r1" }, agreedAt, expires: Date.parse(agreedAt) + 3600000 };
  async function login(id) { await db.exec("reset role; set role authenticated"); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); }
  function signature(payload) { return createHmac("sha256", Buffer.from(secret, "hex")).update(payload).digest("hex"); }
  async function save(value, proof) { const payload = JSON.stringify(value); return db.query("select public.groozam_record_signup_consents($1,$2)", [payload, proof ?? signature(payload)]); }
  async function rows() { return (await db.query("select * from public.member_consents order by consent_type,document_version")).rows; }
  async function rejects(fn, code) { await assert.rejects(fn, error => error.code === code); }
  await login(first);
  await save(fixture); let saved = await rows(); assert.equal(saved.length, 6);
  assert.equal(saved.filter(row => row.signup_record).length, 4);
  assert.equal(saved.find(row => row.consent_type === "marketing_email").granted, false);
  assert.ok(saved.every(row => row.user_id === first));
  const original = JSON.stringify(saved);
  await save(fixture); assert.equal(JSON.stringify(await rows()), original);
  await rejects(() => save(fixture, "0".repeat(64)), "42501");
  await rejects(() => save({ ...fixture, choices: { ...fixture.choices, marketing_email: true } }), "P0001");
  assert.equal(JSON.stringify(await rows()), original);
  const expiredTime = new Date(Date.now() - 3601000).toISOString();
  await rejects(() => save({ ...fixture, agreedAt: expiredTime, expires: Date.parse(expiredTime) + 3600000 }), "22023");
  const revised = { ...fixture, versions: Object.fromEntries(Object.keys(fixture.versions).map(type => [type, "2027-01-10.r1"])) };
  await rejects(() => save({ ...revised, choices: { ...fixture.choices, privacy: false } }), "22023");
  assert.equal((await rows()).length, 6); // whole batch rolled back
  await save(revised); assert.equal((await rows()).length, 10);
  await rejects(() => db.query("insert into public.member_consents(user_id,consent_type,document_version,granted) values ($1,'terms','forged',true)", [first]), "42501");
  await rejects(() => db.exec("update public.member_consents set granted=false"), "42501");
  await rejects(() => db.exec("delete from public.member_consents"), "42501");
  await rejects(() => db.exec("select * from groozam_private.consent_signing_key"), "42501");
  await login(other); assert.equal((await rows()).length, 0);
  await rejects(() => save(fixture), "42501");
  await rejects(() => save({ ...fixture, userId: other }), "42501"); // verified email mismatch
  await db.exec("reset role; set role anon"); await rejects(() => save(fixture), "42501");
  console.log("PASS: migration, legacy preservation, signed batch, optional false, replay, conflict rollback, revision history, tampering, expiry, own-row RLS, direct writes denied, private key denied, anon denied");
} finally { await db.close(); }
