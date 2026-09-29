begin;

-- Caller privileges and existing RLS stay in force. Serialize application
-- mutations for each user, including simultaneous first-address creation.
create or replace function public.groozam_write_address(p_operation text, p_id uuid default null, p_values jsonb default '{}'::jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  target_id uuid := p_id;
  make_default boolean;
  deleted_default boolean;
  field_name text;
  field_limit integer;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_operation is null or p_operation not in ('save','delete','default') then raise exception 'Invalid operation' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  if p_id is not null then
    perform 1 from public.addresses where id = p_id and user_id = owner_id for update;
    if not found then raise exception 'Address not found' using errcode = 'P0002'; end if;
  elsif p_operation <> 'save' then
    raise exception 'Address required' using errcode = '22023';
  end if;
  if p_operation = 'delete' then
    delete from public.addresses where id = p_id and user_id = owner_id
    returning is_default into deleted_default;
    if deleted_default then
      update public.addresses set is_default = true
      where user_id = owner_id and id = (
        select id from public.addresses where user_id = owner_id
        order by created_at desc, id limit 1
      );
    end if;
    return p_id;
  end if;
  if p_operation = 'save' then
    if pg_catalog.jsonb_typeof(p_values) is distinct from 'object' then raise exception 'Invalid fields' using errcode = '22023'; end if;
    for field_name, field_limit in select * from (values ('label',50),('recipient_name',50),('postal_code',5),('address_line1',300),('address_line2',300)) as limits(name, max_length) loop
      if pg_catalog.jsonb_typeof(p_values->field_name) is distinct from 'string' or length(p_values->>field_name) > field_limit or (p_values->>field_name) ~ '[[:cntrl:]]' then raise exception 'Invalid field' using errcode = '22023'; end if;
    end loop;
    if length(btrim(p_values->>'label')) = 0 or length(btrim(p_values->>'recipient_name')) = 0 or length(btrim(p_values->>'address_line1')) = 0
      or (p_values->>'postal_code') !~ '^[0-9]{5}$'
      or pg_catalog.jsonb_typeof(p_values->'recipient_phone') is distinct from 'string' or (p_values->>'recipient_phone') !~ '^010[0-9]{8}$'
      or pg_catalog.jsonb_typeof(p_values->'is_default') is distinct from 'boolean'
      or (p_values->>'delivery_note' is not null and (pg_catalog.jsonb_typeof(p_values->'delivery_note') <> 'string' or length(p_values->>'delivery_note') > 500 or (p_values->>'delivery_note') ~ '[[:cntrl:]]')) then
      raise exception 'Invalid address' using errcode = '22023';
    end if;
    make_default := (p_values->>'is_default')::boolean or (p_id is null and not exists(select 1 from public.addresses where user_id = owner_id));
  else make_default := true;
  end if;
  if make_default then
    update public.addresses set is_default = false where user_id = owner_id and is_default and (p_id is null or id <> p_id);
  end if;
  if p_operation = 'default' then
    update public.addresses set is_default = true where id = p_id and user_id = owner_id;
  elsif p_id is null then
    insert into public.addresses(user_id,label,recipient_name,recipient_phone,postal_code,address_line1,address_line2,delivery_note,is_default)
    values(owner_id,btrim(p_values->>'label'),btrim(p_values->>'recipient_name'),p_values->>'recipient_phone',p_values->>'postal_code',btrim(p_values->>'address_line1'),btrim(p_values->>'address_line2'),nullif(btrim(p_values->>'delivery_note'),''),make_default)
    returning id into target_id;
  else
    update public.addresses set label=btrim(p_values->>'label'),recipient_name=btrim(p_values->>'recipient_name'),recipient_phone=p_values->>'recipient_phone',postal_code=p_values->>'postal_code',address_line1=btrim(p_values->>'address_line1'),address_line2=btrim(p_values->>'address_line2'),delivery_note=nullif(btrim(p_values->>'delivery_note'),''),is_default=make_default
    where id=p_id and user_id=owner_id;
  end if;
  return target_id;
end;
$$;
revoke all on function public.groozam_write_address(text,uuid,jsonb) from public, anon;
grant execute on function public.groozam_write_address(text,uuid,jsonb) to authenticated;
commit;
