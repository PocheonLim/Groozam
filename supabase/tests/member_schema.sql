-- LOCAL/DISPOSABLE DATABASE ONLY. Requires the migration to have been applied.
-- Test Auth users are inserted inside this rolled-back transaction.
begin;

create function pg_temp.assert_true(condition boolean, message text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;

create function pg_temp.expect_error(statement text, expected_state text)
returns void language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE %, but statement succeeded: %', expected_state, statement;
end;
$$;

select pg_temp.assert_true(
  (select count(*) = 3 and bool_and(relrowsecurity) from pg_class
   where oid in ('public.profiles'::regclass, 'public.addresses'::regclass, 'public.member_consents'::regclass)),
  'RLS enabled on all three tables'
);
select pg_temp.assert_true(
  (select count(*) = 3 from pg_constraint where contype = 'f' and confdeltype = 'c' and (
    (conrelid = 'public.profiles'::regclass and confrelid = 'auth.users'::regclass) or
    (conrelid in ('public.addresses'::regclass, 'public.member_consents'::regclass) and confrelid = 'public.profiles'::regclass)
  )), 'Auth/profile foreign keys and cascade rules'
);
select pg_temp.assert_true(
  (select count(*) = 8 from pg_policies where schemaname = 'public'
   and tablename in ('profiles', 'addresses', 'member_consents') and roles = array['authenticated']::name[]),
  'Eight authenticated-only policies'
);
select pg_temp.assert_true(
  (select count(*) = 2 from pg_policies where schemaname = 'public'
   and tablename in ('profiles', 'addresses') and cmd = 'UPDATE' and qual is not null and with_check is not null),
  'UPDATE policies check existing and resulting rows'
);

insert into auth.users (id, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', null),
  ('b0000000-0000-4000-8000-000000000002', '{"display_name":{"unexpected":true},"phone":[1,2]}'::jsonb),
  ('c0000000-0000-4000-8000-000000000003', '["unexpected","metadata"]'::jsonb);
select pg_temp.assert_true(
  (select count(*) = 3 and bool_and(display_name is null and phone is null) from public.profiles
   where id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003')),
  'Auth insert generates profiles despite absent or malformed provider metadata'
);
select pg_temp.expect_error(
  $$insert into public.profiles(id) values ('f0000000-0000-4000-8000-000000000009')$$, '23503'
);

-- Verify the timestamp trigger overwrites an explicitly supplied stale timestamp.
update public.profiles set updated_at = '2000-01-01' where id = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true(
  (select updated_at > '2000-01-01' from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'),
  'profiles updated_at trigger'
);

-- Seed B's address/consent, which A must not be able to access.
insert into public.addresses(user_id, label, recipient_name, recipient_phone, postal_code, address_line1, address_line2, is_default)
values ('b0000000-0000-4000-8000-000000000002', 'B home', 'B', '01000000000', '01234', 'Test road', 'Room B', true);
insert into public.member_consents(user_id, consent_type, document_version, granted)
values ('b0000000-0000-4000-8000-000000000002', 'terms', 'test-v1', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select pg_temp.assert_true((select count(*) = 1 from public.profiles), 'A sees only own profile');
update public.profiles set display_name = 'Member A', phone = '01011111111'
where id = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select display_name = 'Member A' from public.profiles), 'Own profile update');
update public.profiles set display_name = 'ATTACK' where id = 'b0000000-0000-4000-8000-000000000002';
select pg_temp.expect_error($$insert into public.profiles(id) values ('a0000000-0000-4000-8000-000000000001')$$, '42501');
select pg_temp.expect_error($$delete from public.profiles$$, '42501');
select pg_temp.expect_error($$update public.profiles set id = 'b0000000-0000-4000-8000-000000000002'$$, '42501');
select pg_temp.expect_error($$update public.profiles set created_at = '2000-01-01'$$, '42501');
select pg_temp.expect_error($$select public.groozam_handle_new_user()$$, '42501');

insert into public.addresses(user_id, label, recipient_name, recipient_phone, postal_code, address_line1, address_line2, is_default)
values ('a0000000-0000-4000-8000-000000000001', 'A home', 'A', '01011111111', '01234', 'Test road', 'Room A', true);
select pg_temp.assert_true((select count(*) = 1 and bool_and(id is not null) from public.addresses), 'Own address SELECT, INSERT and UUID default');
select pg_temp.expect_error($$insert into public.addresses(user_id, label, recipient_name, recipient_phone, postal_code, address_line1, address_line2, is_default)
values ('a0000000-0000-4000-8000-000000000001', 'A duplicate', 'A', '01011111111', '01234', 'Test road', 'Room A', true)$$, '23505');
select pg_temp.expect_error($$insert into public.addresses(user_id, label, recipient_name, recipient_phone, postal_code, address_line1, address_line2)
values ('b0000000-0000-4000-8000-000000000002', 'ATTACK', 'A', '01011111111', '01234', 'Test road', 'Room A')$$, '42501');
select pg_temp.expect_error($$update public.addresses set user_id = 'b0000000-0000-4000-8000-000000000002'$$, '42501');
select pg_temp.expect_error($$update public.addresses set updated_at = '2000-01-01'$$, '42501');
update public.addresses set label = 'A renamed' where user_id = 'a0000000-0000-4000-8000-000000000001';
update public.addresses set label = 'ATTACK' where user_id = 'b0000000-0000-4000-8000-000000000002';
delete from public.addresses where user_id = 'b0000000-0000-4000-8000-000000000002';
select pg_temp.assert_true((select label = 'A renamed' from public.addresses), 'Own address UPDATE');
insert into public.addresses(user_id, label, recipient_name, recipient_phone, postal_code, address_line1, address_line2)
values ('a0000000-0000-4000-8000-000000000001', 'A office', 'A', '01011111111', '01234', 'Test road', 'Office');
delete from public.addresses where label = 'A office';
select pg_temp.assert_true((select count(*) = 1 from public.addresses), 'Own address DELETE');

insert into public.member_consents(user_id, consent_type, document_version, granted)
select 'a0000000-0000-4000-8000-000000000001', consent_type, 'test-v1', true
from unnest(array['terms', 'privacy', 'marketing_email', 'marketing_sms']) as consent_type;
insert into public.member_consents(user_id, consent_type, document_version, granted)
values ('a0000000-0000-4000-8000-000000000001', 'marketing_email', 'test-v1', false);
select pg_temp.assert_true((select count(*) = 5 from public.member_consents), 'All consent types; revocation appends a row; B history hidden');
select pg_temp.expect_error($$insert into public.member_consents(user_id, consent_type, document_version, granted)
values ('b0000000-0000-4000-8000-000000000002', 'terms', 'test-v1', true)$$, '42501');
select pg_temp.expect_error($$insert into public.member_consents(user_id, consent_type, document_version, granted)
values ('a0000000-0000-4000-8000-000000000001', 'invalid', 'test-v1', true)$$, '23514');
select pg_temp.expect_error($$insert into public.member_consents(user_id, consent_type, document_version, granted)
values ('a0000000-0000-4000-8000-000000000001', 'terms', ' ', true)$$, '23514');
select pg_temp.expect_error($$insert into public.member_consents(user_id, consent_type, document_version, granted, recorded_at)
values ('a0000000-0000-4000-8000-000000000001', 'terms', 'test-v1', true, '2000-01-01')$$, '42501');
select pg_temp.expect_error($$update public.member_consents set granted = false$$, '42501');
select pg_temp.expect_error($$delete from public.member_consents$$, '42501');
select pg_temp.expect_error($$truncate public.member_consents$$, '42501');

-- A stale/absent JWT must not expose any member rows.
select set_config('request.jwt.claims', '{}', true);
select pg_temp.assert_true((select count(*) = 0 from public.profiles), 'No JWT subject, no profiles');
select pg_temp.assert_true((select count(*) = 0 from public.addresses), 'No JWT subject, no addresses');
select pg_temp.assert_true((select count(*) = 0 from public.member_consents), 'No JWT subject, no consents');

set local role anon;
select pg_temp.expect_error($$select * from public.profiles$$, '42501');
select pg_temp.expect_error($$select * from public.addresses$$, '42501');
select pg_temp.expect_error($$select * from public.member_consents$$, '42501');
select pg_temp.expect_error($$insert into public.profiles(id) values ('a0000000-0000-4000-8000-000000000001')$$, '42501');
select pg_temp.expect_error($$insert into public.addresses(user_id) values ('a0000000-0000-4000-8000-000000000001')$$, '42501');
select pg_temp.expect_error($$insert into public.member_consents(user_id) values ('a0000000-0000-4000-8000-000000000001')$$, '42501');

reset role;
select pg_temp.assert_true((select display_name is null from public.profiles where id = 'b0000000-0000-4000-8000-000000000002'), 'A could not update B profile');
select pg_temp.assert_true((select count(*) = 1 and bool_and(label = 'B home') from public.addresses where user_id = 'b0000000-0000-4000-8000-000000000002'), 'A could not update/delete B address');
select pg_temp.assert_true((select count(*) = 2 from public.addresses where is_default), 'Two different members can each have one default');
update public.addresses set updated_at = '2000-01-01' where user_id = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select updated_at > '2000-01-01' from public.addresses where user_id = 'a0000000-0000-4000-8000-000000000001'), 'addresses updated_at trigger');
select pg_temp.expect_error($$insert into public.addresses(user_id, label, recipient_name, recipient_phone, postal_code, address_line1, address_line2)
values ('f0000000-0000-4000-8000-000000000009', 'Missing member', 'X', '01011111111', '01234', 'Test road', 'X')$$, '23503');

delete from auth.users where id = 'b0000000-0000-4000-8000-000000000002';
select pg_temp.assert_true(not exists(select 1 from public.profiles where id = 'b0000000-0000-4000-8000-000000000002'), 'Auth deletion cascades to profile');
select pg_temp.assert_true(not exists(select 1 from public.addresses where user_id = 'b0000000-0000-4000-8000-000000000002'), 'Auth deletion cascades to addresses');
select pg_temp.assert_true(not exists(select 1 from public.member_consents where user_id = 'b0000000-0000-4000-8000-000000000002'), 'Documented account-deletion exception to consent retention');

select 'All member schema tests passed' as result;
rollback;
