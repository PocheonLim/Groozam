begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$ begin
  if not exists(select 1 from pg_catalog.pg_extension e join pg_catalog.pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto' and n.nspname='extensions') then
    raise exception 'Inspect pgcrypto schema before applying this migration; expected extensions';
  end if;
end $$;
create schema groozam_private;
revoke all on schema groozam_private from public, anon, authenticated;
-- Provision separately as DB owner. Never expose this schema through the API.
create table groozam_private.consent_signing_key (
  singleton boolean primary key default true check (singleton),
  secret text not null check (secret ~ '^[a-fA-F0-9]{64}$')
);
revoke all on groozam_private.consent_signing_key from public, anon, authenticated;

-- Preserve legacy rows and later append-only preference events.
alter table public.member_consents
  add column signup_record boolean not null default false,
  add column agreed_at timestamptz;
create unique index member_consents_signup_version_idx
  on public.member_consents(user_id, consent_type, document_version) where signup_record;

-- Existing own-row SELECT policy is retained. All writes require a server proof.
revoke insert on public.member_consents from public, anon, authenticated;
revoke insert (user_id, consent_type, document_version, granted) on public.member_consents from public, anon, authenticated;
drop policy member_consents_insert_own on public.member_consents;

create function public.groozam_record_signup_consents(p_payload text, p_signature text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  signing_key text;
  snapshot jsonb;
  consent_kind text;
  version_value text;
  granted_value boolean;
  agreed_time timestamptz;
  expiry numeric;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_payload is null or length(p_payload) > 3000 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid proof' using errcode = '22023';
  end if;
  select secret into signing_key from groozam_private.consent_signing_key where singleton;
  if signing_key is null then raise exception 'Consent signing not configured' using errcode = '55000'; end if;
  if encode(extensions.hmac(convert_to(p_payload,'UTF8'),decode(signing_key,'hex'),'sha256'),'hex') <> p_signature then
    raise exception 'Invalid signature' using errcode = '42501';
  end if;
  snapshot := p_payload::jsonb;
  if jsonb_typeof(snapshot) is distinct from 'object'
    or snapshot->>'userId' is distinct from owner_id::text
    or not exists(select 1 from auth.users where id=owner_id and email_confirmed_at is not null and lower(btrim(email))=snapshot->>'email') then
    raise exception 'Account mismatch' using errcode = '42501';
  end if;
  if jsonb_typeof(snapshot->'choices') is distinct from 'object' or jsonb_typeof(snapshot->'versions') is distinct from 'object'
    or jsonb_typeof(snapshot->'agreedAt') is distinct from 'string' or jsonb_typeof(snapshot->'expires') is distinct from 'number' then
    raise exception 'Invalid snapshot' using errcode = '22023';
  end if;
  agreed_time := (snapshot->>'agreedAt')::timestamptz;
  expiry := (snapshot->>'expires')::numeric;
  if not isfinite(agreed_time) or agreed_time > statement_timestamp() + interval '5 minutes'
    or expiry <= extract(epoch from statement_timestamp())*1000
    or expiry - extract(epoch from agreed_time)*1000 <> 3600000 then
    raise exception 'Expired snapshot' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('signup-consents:' || owner_id::text,0));
  foreach consent_kind in array array['terms','privacy','marketing_email','marketing_sms'] loop
    if jsonb_typeof(snapshot->'choices'->consent_kind) is distinct from 'boolean'
      or jsonb_typeof(snapshot->'versions'->consent_kind) is distinct from 'string' then
      raise exception 'Invalid consent fields' using errcode = '22023';
    end if;
    version_value := snapshot->'versions'->>consent_kind;
    granted_value := (snapshot->'choices'->>consent_kind)::boolean;
    if length(version_value) > 40 or version_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.r[1-9][0-9]*$'
      or (consent_kind in ('terms','privacy') and not granted_value) then
      raise exception 'Invalid consent' using errcode = '22023';
    end if;
    insert into public.member_consents(user_id,consent_type,document_version,granted,signup_record,agreed_at)
    values(owner_id,consent_kind,version_value,granted_value,true,agreed_time)
    on conflict (user_id,consent_type,document_version) where signup_record do nothing;
    if not exists(select 1 from public.member_consents where user_id=owner_id and consent_type=consent_kind
      and document_version=version_value and signup_record and granted=granted_value) then
      raise exception 'Consent snapshot conflict' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;
revoke all on function public.groozam_record_signup_consents(text,text) from public,anon;
grant execute on function public.groozam_record_signup_consents(text,text) to authenticated;
commit;
