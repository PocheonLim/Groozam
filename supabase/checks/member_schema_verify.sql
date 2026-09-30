-- Read-only catalog verification after all four member migrations.
-- Returns no user data, credentials, or signing key values.
select jsonb_build_object(
  'migrations', (select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
  'tables', (select jsonb_agg(jsonb_build_object('name', c.relname, 'rls', c.relrowsecurity) order by c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('profiles','addresses','member_consents') and c.relkind='r'),
  'functions', (select jsonb_agg(jsonb_build_object('name',p.proname,'security_definer',p.prosecdef,'config',p.proconfig) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'groozam_%'),
  'triggers', (select jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) order by t.tgname)
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and ((n.nspname='auth' and c.relname='users') or (n.nspname='public' and c.relname in ('profiles','addresses','member_consents')))),
  'policies', (select jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'roles',roles,'command',cmd,'using',qual,'check',with_check) order by policyname)
    from pg_policies where schemaname='public' and tablename in ('profiles','addresses','member_consents')),
  'indexes', (select jsonb_agg(jsonb_build_object('name',indexname,'definition',indexdef) order by indexname)
    from pg_indexes where schemaname='public' and tablename in ('profiles','addresses','member_consents')),
  'constraints', (select jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid)) order by conname)
    from pg_constraint where conrelid in ('public.profiles'::regclass,'public.addresses'::regclass,'public.member_consents'::regclass)),
  'phone_nullable', (select is_nullable='YES' from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='phone'),
  'consent_columns', (select jsonb_agg(column_name order by column_name) from information_schema.columns where table_schema='public' and table_name='member_consents' and column_name in ('signup_record','agreed_at')),
  'consent_key_configured', exists(select 1 from groozam_private.consent_signing_key),
  'private_schema_anon_access', has_schema_privilege('anon','groozam_private','USAGE'),
  'private_schema_member_access', has_schema_privilege('authenticated','groozam_private','USAGE'),
  'private_key_member_read', has_table_privilege('authenticated','groozam_private.consent_signing_key','SELECT'),
  'consent_direct_insert', has_any_column_privilege('authenticated','public.member_consents','INSERT'),
  'consent_direct_update', has_any_column_privilege('authenticated','public.member_consents','UPDATE'),
  'consent_direct_delete', has_table_privilege('authenticated','public.member_consents','DELETE'),
  'consent_rpc_anon', has_function_privilege('anon','public.groozam_record_signup_consents(text,text)','EXECUTE'),
  'consent_rpc_member', has_function_privilege('authenticated','public.groozam_record_signup_consents(text,text)','EXECUTE'),
  'address_rpc_member', has_function_privilege('authenticated','public.groozam_write_address(text,uuid,jsonb)','EXECUTE'),
  'address_rpc_reassigns_default', (select position('returning is_default into deleted_default' in pg_get_functiondef('public.groozam_write_address(text,uuid,jsonb)'::regprocedure)) > 0)
) as verification;
