# cookerY v0.2：启用两个账号

前台只使用自定账号和密码，不需要真实邮箱、验证码或邮箱收信。后台使用 Supabase Auth 保存密码。账号不区分大小写，用 3–24 位英文字母、数字或下划线；显示名可以用中文。

## 1. 创建两位成员

打开 [cookerY 的用户管理](https://supabase.com/dashboard/project/jjgrnefvpqhthsobpkml/auth/users)，用 **Add user → Create new user** 为两人各建一个账号：

- Email：`你的账号@users.cookery.invalid`，例如账号 `cook_one` 对应 `cook_one@users.cookery.invalid`。这只是内部标识，无需拥有这个邮箱。
- Password：自己设置至少 8 位的密码，最多 72 字节。不要把密码写进仓库或聊天。
- 勾选 **Auto Confirm User**，无需收邮件。

在 SQL Editor 运行下面的语句，将示例账号和名字替换成你刚建的两位成员。账号必须和上一步一致，用小写。

```sql
insert into public.members (user_id, username, display_name)
select u.id, v.username, v.display_name
from (values
  ('cook_one', '你的名字'),
  ('cook_two', '对方名字')
) as v(username, display_name)
join auth.users u on lower(u.email) = v.username || '@users.cookery.invalid'
on conflict (user_id) do update
set username = excluded.username, display_name = excluded.display_name;

-- 应返回两位成员；没有返回的账号需要检查内部地址是否拼对。
select username, display_name from public.members;
```

在 [Authentication 设置](https://supabase.com/dashboard/project/jjgrnefvpqhthsobpkml/auth/providers)关闭 **Allow new users to sign up**，保持 Email/password 登录开启。已有账号仍能登录。当前连接器不提供修改 Auth 配置或创建 Auth 用户的工具，所以这一步和账号创建需在管理界面完成。即使还没关注册，未列入 members 的用户也没有菜谱和图片权限。

## 2. 部署和使用

合并后 main 的 GitHub Actions 自动部署到 [cookerY](https://zijian2625492669-lgtm.github.io/cookerY/)。前端已使用本项目的浏览器公开配置；现有 GitHub Actions Variables 可继续覆盖默认值。无需在前端放任何管理员密钥。

用自定账号登录，例如 `cook_one`，不要填完整内部地址。首次云端菜谱本为空；在原来保存了菜谱的浏览器，打开「我的 → 导入本机旧菜谱」，确认后导入。原始本地数据保留，重复导入按旧 ID 跳过，不覆盖云端；导入者记为当前成员。另一个浏览器新记但 ID 相同的旧原型菜谱也会跳过，请核对后单独新增。

两人都能编辑全部菜谱，列表每 30 秒、重新聚焦或联网时刷新。两人同时编辑同一道菜时，旧版本保存会被拒绝并提示返回详情重新确认，避免覆盖对方刚保存的内容。保存失败会保留编辑内容，整份菜谱的关系数据在数据库事务内保存。

封面上传前压到 1600px / 1MB 内，私有存储桶使用一小时签名地址，刷新列表会更新地址。替换或删除菜谱后会尝试清理旧封面；网络中断可能留下未引用的图片，不会自动删除不确定是否保存成功的上传。步骤图片留待下一步。

「我的」可以修改密码，需要先输入当前密码。因为没有真实邮箱，忘记密码需要通过 Supabase 管理端重设，不能用邮件找回。

## 验证

```bash
npm ci
npm run build
npx playwright install chromium
npm test
# 本环境已有 Chromium 时：CHROMIUM_PATH=/usr/bin/chromium npm test
```

浏览器测试使用模拟 API，验证账号登录、保存失败重试、五段菜谱、私有封面上传、删除失败恢复。`tests/database.sql` 在真实项目事务内验证 RLS、两人共享编辑、创建人保护、重复导入、失败整份回滚和级联删除，结束后回滚全部测试账号与数据。它需要管理员 SQL 权限，不能在普通成员会话运行。

`supabase/schema.sql` 是空项目初始化的完整结构快照，已在本项目应用；不要在已有表的项目重复整段运行。真实数据库迁移记录为 `cookery_v02_backend`、`remove_unused_account_setup` 和 `protect_recipe_save_retries`。账号创建和真实密码登录仍需完成第 1 步后验收。
