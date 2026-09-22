-- Read-only. Run in Supabase SQL Editor BEFORE applying the initial migration.
-- No user rows or metadata are returned.
select current_database() as database_name, current_user as migration_role,
       current_setting('server_version') as postgres_version,
       to_regclass('auth.users') as auth_users,
       to_regprocedure('auth.uid()') as auth_uid,
       to_regprocedure('pg_catalog.gen_random_uuid()') as uuid_generator;

select n.nspname as schema_name, c.relname as object_name, c.relkind,
       c.relrowsecurity as rls_enabled
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in (
  'profiles', 'addresses', 'member_consents',
  'profiles_pkey', 'addresses_pkey', 'member_consents_pkey',
  'addresses_user_id_idx', 'addresses_one_default_per_user_idx',
  'member_consents_user_recorded_at_idx'
)
order by c.relname;

select n.nspname as schema_name, t.typname as type_name
from pg_catalog.pg_type t
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typname in ('profiles', 'addresses', 'member_consents');

select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.proconfig as configuration
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('groozam_handle_new_user', 'groozam_set_updated_at');

-- Review ALL custom Auth insert triggers, even when their names differ.
select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
       pg_get_triggerdef(t.oid) as definition
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and (
  (n.nspname = 'auth' and c.relname = 'users') or
  (n.nspname = 'public' and c.relname in ('profiles', 'addresses', 'member_consents'))
);

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public' and tablename in ('profiles', 'addresses', 'member_consents');
