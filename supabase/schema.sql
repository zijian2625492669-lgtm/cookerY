-- cookerY v0.2: two members share one recipe book.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(trim(display_name)) between 1 and 30),
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;

create function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.members where user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_member() from public, anon;
grant execute on function private.is_member() to authenticated;
create policy members_read on public.members for select to authenticated
  using ((select private.is_member()));
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.members(user_id),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  emoji text not null default '🍳',
  palette int not null default 0 check (palette between 0 and 5),
  minutes int not null default 20 check (minutes between 0 and 10080),
  servings int not null default 2 check (servings between 1 and 100),
  sauce_note text not null default '',
  cover_path text,
  local_photo text check (local_photo is null or local_photo = 'recipes/tangcu-paigu.jpg'),
  legacy_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recipes_created_by_idx on public.recipes(created_by);
create index recipes_updated_at_idx on public.recipes(updated_at desc);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  kind text not null default 'main' check (kind in ('main','seasoning','sauce')),
  position int not null check (position >= 0),
  name text not null check (length(trim(name)) > 0),
  amount text not null default '', unit text not null default '',
  unique(recipe_id, kind, position)
);
create table public.steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  phase text not null default 'cook' check (phase in ('prep','cook')),
  position int not null check (position >= 0),
  content text not null check (length(trim(content)) > 0),
  image_path text,
  unique(recipe_id, phase, position)
);
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 30)
);
create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key(recipe_id, tag_id)
);
create index recipe_tags_tag_id_idx on public.recipe_tags(tag_id);

do $$ declare t text; begin
  foreach t in array array['recipes','ingredients','steps','tags','recipe_tags'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy members_access on public.%I for all to authenticated using ((select private.is_member())) with check ((select private.is_member()))', t);
  end loop;
end $$;

create function private.recipe_metadata() returns trigger
language plpgsql set search_path = '' as $$ begin
  if TG_OP = 'INSERT' then
    new.created_by := auth.uid();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.legacy_id := old.legacy_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger recipe_metadata before insert or update on public.recipes
for each row execute function private.recipe_metadata();

-- Invoker function: RLS still applies. A failed child write rolls back the whole recipe.
create function public.save_recipe(payload jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare rid uuid; tid uuid; item jsonb; tag_name text; n int; group_name text;
begin
  if not private.is_member() then raise exception '仅厨房成员可保存菜谱' using errcode='42501'; end if;
  rid := (payload->>'id')::uuid;
  if rid is null then
    -- Repeated import is idempotent; it never overwrites a recipe already in the cloud.
    if nullif(payload->>'legacyId','') is not null then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(payload->>'legacyId', 0));
      select id into rid from public.recipes where legacy_id = payload->>'legacyId';
      if rid is not null then return rid; end if;
    end if;
    rid := coalesce((payload->>'draftId')::uuid, gen_random_uuid());
    insert into public.recipes(id,title,legacy_id) values (rid,payload->>'title',nullif(payload->>'legacyId','')) on conflict(id) do nothing;
    if not found then return rid; end if;
    perform 1 from public.recipes where id=rid for update;
  else
    perform 1 from public.recipes where id = rid for update;
    if not found then raise exception '这道菜已被删除，请刷新列表'; end if;
    if payload->>'version' is not null and exists(select 1 from public.recipes where id=rid and updated_at <> (payload->>'version')::timestamptz) then
      raise exception '这道菜刚被更新过，请返回详情确认后重新编辑；当前内容尚未保存';
    end if;
  end if;
  update public.recipes set title=trim(payload->>'title'), description=coalesce(payload->>'description',''),
    emoji=coalesce(payload->>'emoji','🍳'), palette=(payload->>'palette')::int,
    minutes=(payload->>'minutes')::int, servings=(payload->>'servings')::int,
    sauce_note=coalesce(payload->>'sauceNote',''), cover_path=nullif(payload->>'coverPath',''),
    local_photo=nullif(payload->>'localPhoto','') where id=rid;
  delete from public.ingredients where recipe_id=rid;
  foreach group_name in array array['ingredients','seasonings','sauce'] loop
    n := 0;
    for item in select value from jsonb_array_elements(coalesce(payload->group_name,'[]'::jsonb)) loop
      insert into public.ingredients(recipe_id,kind,position,name,amount,unit)
      values(rid,case group_name when 'ingredients' then 'main' when 'seasonings' then 'seasoning' else 'sauce' end,
        n,trim(item->>'name'),coalesce(item->>'amount',''),coalesce(item->>'unit',''));
      n := n+1;
    end loop;
  end loop;
  delete from public.steps where recipe_id=rid;
  foreach group_name in array array['prep','steps'] loop
    n := 0;
    for item in select value from jsonb_array_elements(coalesce(payload->group_name,'[]'::jsonb)) loop
      insert into public.steps(recipe_id,phase,position,content)
      values(rid,case group_name when 'prep' then 'prep' else 'cook' end,n,item #>> '{}');
      n := n+1;
    end loop;
  end loop;
  delete from public.recipe_tags where recipe_id=rid;
  for tag_name in select distinct trim(value) from jsonb_array_elements_text(coalesce(payload->'tags','[]'::jsonb)) loop
    insert into public.tags(name) values(tag_name) on conflict(name) do update set name=excluded.name returning id into tid;
    insert into public.recipe_tags(recipe_id,tag_id) values(rid,tid);
  end loop;
  return rid;
end $$;
revoke all on function public.save_recipe(jsonb) from public, anon;
grant execute on function public.save_recipe(jsonb) to authenticated;

insert into public.tags(name) values ('家常'),('快手'),('下饭'),('汤'),('早餐'),('甜点'),('素食');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('recipe-images','recipe-images',false,1048576,array['image/jpeg','image/png','image/webp']);
create policy members_read_images on storage.objects for select to authenticated
  using (bucket_id='recipe-images' and (select private.is_member()));
create policy members_insert_images on storage.objects for insert to authenticated
  with check (bucket_id='recipe-images' and (select private.is_member()));
create policy members_update_images on storage.objects for update to authenticated
  using (bucket_id='recipe-images' and (select private.is_member()))
  with check (bucket_id='recipe-images' and (select private.is_member()));
create policy members_delete_images on storage.objects for delete to authenticated
  using (bucket_id='recipe-images' and (select private.is_member()));

