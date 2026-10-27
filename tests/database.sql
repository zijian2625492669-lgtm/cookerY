-- Run through a privileged SQL connection. Every fixture is rolled back.
begin;
create temporary table kitchen_test_ids(a uuid, b uuid, outsider uuid, recipe uuid, payload jsonb);
insert into kitchen_test_ids values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,
  '{"title":"测试菜谱","emoji":"🍳","palette":1,"minutes":20,"servings":2,"ingredients":[{"name":"蛋","amount":"2","unit":"个"}],"seasonings":[{"name":"盐"}],"sauce":[{"name":"醋"}],"sauceNote":"拌匀","prep":["洗菜"],"steps":["炒熟"],"tags":["测试"]}');
insert into auth.users(id,email) select a,a::text||'@example.invalid' from kitchen_test_ids union all select b,b::text||'@example.invalid' from kitchen_test_ids union all select outsider,outsider::text||'@example.invalid' from kitchen_test_ids;
insert into public.members(user_id,username,display_name) select a,'test_'||left(replace(a::text,'-',''),12),'测试甲' from kitchen_test_ids union all select b,'test_'||left(replace(b::text,'-',''),12),'测试乙' from kitchen_test_ids;
grant select,update on kitchen_test_ids to authenticated;
select set_config('request.jwt.claim.sub',a::text,true) from kitchen_test_ids;
set local role authenticated;
update kitchen_test_ids set recipe=public.save_recipe(payload);
do $$ declare rid uuid; p jsonb; begin
  select recipe,payload into rid,p from kitchen_test_ids;
  if (select count(*) from public.ingredients where recipe_id=rid) <> 3 then raise exception 'ingredient groups missing'; end if;
  if (select count(*) from public.steps where recipe_id=rid) <> 2 then raise exception 'step phases missing'; end if;
  begin
    perform public.save_recipe(p||jsonb_build_object('id',rid,'title','不应保存','steps',jsonb_build_array('')));
    raise exception 'invalid child was accepted';
  exception when check_violation then null;
  end;
  if (select title from public.recipes where id=rid) <> '测试菜谱' then raise exception 'save was not atomic'; end if;
  begin
    perform public.save_recipe(p||jsonb_build_object('id',rid,'version','2000-01-01T00:00:00Z'));
    raise exception 'stale update was accepted';
  exception when raise_exception then
    if SQLERRM not like '这道菜刚被更新过%' then raise; end if;
  end;
  perform public.save_recipe(p||jsonb_build_object('draftId',rid,'title','不应覆盖已保存草稿'));
  if (select title from public.recipes where id=rid) <> '测试菜谱' then raise exception 'draft retry overwrote existing recipe'; end if;
  perform public.save_recipe(p||'{"legacyId":"test-import-id"}');
  perform public.save_recipe(p||'{"legacyId":"test-import-id"}');
  if (select count(*) from public.recipes where legacy_id='test-import-id') <> 1 then raise exception 'import not idempotent'; end if;
end $$;
select set_config('request.jwt.claim.sub',b::text,true) from kitchen_test_ids;
do $$ declare rid uuid; p jsonb; creator uuid; begin
  select recipe,payload,a into rid,p,creator from kitchen_test_ids;
  perform public.save_recipe(p||jsonb_build_object('id',rid,'title','另一成员编辑'));
  if (select created_by from public.recipes where id=rid) <> creator then raise exception 'creator changed'; end if;
  update public.recipes set created_by=(select b from kitchen_test_ids) where id=rid;
  if (select created_by from public.recipes where id=rid) <> creator then raise exception 'creator could be forged'; end if;
end $$;
select set_config('request.jwt.claim.sub',outsider::text,true) from kitchen_test_ids;
do $$ begin
  if exists(select 1 from public.recipes) or exists(select 1 from public.members) or exists(select 1 from public.tags) then raise exception 'non-member read data'; end if;
  begin
    perform public.save_recipe((select payload from kitchen_test_ids));
    raise exception 'non-member saved recipe';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub',b::text,true) from kitchen_test_ids;
delete from public.recipes where id=(select recipe from kitchen_test_ids);
do $$ begin
  if exists(select 1 from public.ingredients where recipe_id=(select recipe from kitchen_test_ids)) or exists(select 1 from public.steps where recipe_id=(select recipe from kitchen_test_ids)) then raise exception 'children not cascaded'; end if;
  begin
    insert into public.members(user_id,username,display_name) values((select outsider from kitchen_test_ids),'notallowed','不能添加');
    raise exception 'member could extend whitelist';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.recipes;
    raise exception 'anonymous read allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS: five recipe sections, atomic rollback, repeat import, shared edits, immutable creator, stale edit rejection, draft retry, outsider denial, anonymous denial, whitelist protection, cascade delete' as verification;
rollback;
