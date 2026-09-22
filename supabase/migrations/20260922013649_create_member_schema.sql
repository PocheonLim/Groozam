-- Initial member schema. Apply once through migration history, as the DB owner.
-- Never overwrite existing objects: inspect supabase/checks/member_schema_preflight.sql first.
begin;

do $preflight$
begin
  if pg_catalog.to_regclass('auth.users') is null then
    raise exception 'Supabase auth.users is required before applying the member schema';
  end if;

  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in (
      'profiles', 'addresses', 'member_consents',
      'profiles_pkey', 'addresses_pkey', 'member_consents_pkey',
      'addresses_user_id_idx', 'addresses_one_default_per_user_idx',
      'member_consents_user_recorded_at_idx'
    )
  ) or exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname in ('profiles', 'addresses', 'member_consents')
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('groozam_handle_new_user', 'groozam_set_updated_at')
  ) or exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'auth.users'::regclass and tgname = 'groozam_auth_user_created'
  ) then
    raise exception 'Member schema objects already exist. Inspect and reconcile migration history; no objects were overwritten';
  end if;
end;
$preflight$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  recipient_name text not null,
  recipient_phone text not null,
  postal_code text not null,
  address_line1 text not null,
  address_line2 text not null,
  delivery_note text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user_idx
  on public.addresses (user_id) where is_default = true;

create table public.member_consents (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  document_version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default now(),
  constraint member_consents_type_check check (
    consent_type in ('terms', 'privacy', 'marketing_email', 'marketing_sms')
  ),
  constraint member_consents_document_version_not_blank check (
    length(btrim(document_version)) > 0
  )
);

create index member_consents_user_recorded_at_idx
  on public.member_consents (user_id, recorded_at desc);

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.member_consents enable row level security;

-- Restrict SQL privileges as well as RLS. Do not inherit broad API-role defaults.
revoke all privileges on table public.profiles, public.addresses, public.member_consents
  from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

grant select, delete on table public.addresses to authenticated;
grant insert (
  user_id, label, recipient_name, recipient_phone, postal_code,
  address_line1, address_line2, delivery_note, is_default
) on public.addresses to authenticated;
grant update (
  label, recipient_name, recipient_phone, postal_code,
  address_line1, address_line2, delivery_note, is_default
) on public.addresses to authenticated;

grant select on table public.member_consents to authenticated;
grant insert (user_id, consent_type, document_version, granted)
  on public.member_consents to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy addresses_select_own on public.addresses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy addresses_insert_own on public.addresses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy addresses_update_own on public.addresses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy addresses_delete_own on public.addresses
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy member_consents_select_own on public.member_consents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy member_consents_insert_own on public.member_consents
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Shared timestamp trigger, with caller privileges and no writable search_path.
create function public.groozam_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.statement_timestamp();
  return new;
end;
$function$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.groozam_set_updated_at();
create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.groozam_set_updated_at();

-- Only the verified Auth UUID is copied. Provider metadata is not trusted or required.
create function public.groozam_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$function$;

create trigger groozam_auth_user_created
  after insert on auth.users
  for each row execute function public.groozam_handle_new_user();

-- Trigger functions are not public RPC endpoints.
revoke all privileges on function public.groozam_handle_new_user()
  from public, anon, authenticated;
revoke all privileges on function public.groozam_set_updated_at()
  from public, anon, authenticated;

-- Include Auth accounts created before this migration without changing Auth data.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

commit;
