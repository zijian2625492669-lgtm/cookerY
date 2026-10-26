# cookerY 规划书（定稿）

两人共用的私人菜谱网站。代码在 GitHub 仓库 zijian2625492669-lgtm/cookerY，部署到 GitHub Pages，Supabase 项目 cookerY（ref：jjgrnefvpqhthsobpkml）负责登录、数据库和图片。

## 0. 已定决策

| 事项 | 决定 | 理由 |
|---|---|---|
| 仓库 | zijian2625492669-lgtm/cookerY | 已建 |
| Supabase | 项目 cookerY，免费档 | 已建 |
| 登录 | 邮箱 + 密码 | 两人用，最直观 |
| 谁能用 | 只有你们两个人；关闭公开注册 | 不需要对外公开 |
| 权限 | 两人都能看、都能改所有菜谱，记录是谁创建的 | 共用一个菜谱本最省事 |
| 部署 | GitHub Pages + HashRouter | 免费，和仓库在一起，不用多一个账号 |

### 账号密码登录有没有风险？
风险很低，可以放心用：
- 密码由 Supabase Auth 加密存储（bcrypt），你的代码碰不到明文
- 关掉公开注册，陌生人连账号都建不了
- 数据库每张表都开 RLS，只有白名单里的两个人能读写
- 要做的：密码至少 8 位、两个人别用和其他网站一样的密码；前端只放 anon/publishable key，service_role / secret key 永远不进前端和仓库

### GitHub Pages 和 Vercel 的区别
| | GitHub Pages | Vercel |
|---|---|---|
| 费用 | 免费 | 个人免费 |
| 账号 | 只要 GitHub | 要再注册 Vercel 并授权仓库 |
| 网址 | zijian2625492669-lgtm.github.io/cookerY/ | cookery-xxx.vercel.app |
| 前端路由 | 刷新子页面会 404，要用 HashRouter（网址带 #） | 自动支持，网址干净 |
| 部署 | 写一个 GitHub Actions 文件 | 连上仓库自动部署，每个 PR 有预览地址 |
| 后端函数 | 没有 | 有（本项目用不到） |

结论：两人自用，选 GitHub Pages。以后想要干净网址或预览部署，再迁到 Vercel，代码几乎不用改（HashRouter 换成 BrowserRouter，base 改回 /）。

## 1. 技术栈
- Vite + React + TypeScript
- React Router（HashRouter）
- @supabase/supabase-js v2
- 样式：Tailwind CSS（可选）
- 图片压缩：browser-image-compression（上传前压到 1MB 内，省免费档 1GB 存储）
- Node 22，npm

## 2. MVP 功能
- 登录 / 退出 / 修改密码（没有注册页）
- 菜谱增删改查：标题、简介、份量、准备时间、烹饪时间、封面图
- 食材：名称、用量、单位、备注，可排序
- 步骤：文字 + 可选图片，可排序
- 标签：家常、快手、汤、甜点……可多选，可按标签筛选
- 搜索：按菜名或食材关键词
- 显示“谁添加的”

以后再说：收藏/做过次数、购物清单、对外分享单篇。

## 3. 目录结构
```
cookerY/
├─ .github/workflows/deploy.yml
├─ public/
├─ src/
│  ├─ lib/supabase.ts        # 创建 supabase 客户端
│  ├─ lib/api.ts             # 菜谱、食材、步骤、标签的读写函数
│  ├─ lib/images.ts          # 压缩、上传、取签名地址
│  ├─ auth/AuthProvider.tsx  # 登录状态
│  ├─ auth/RequireAuth.tsx   # 未登录跳 /login
│  ├─ pages/                 # 见第 5 节
│  ├─ components/            # RecipeCard、IngredientEditor、StepEditor、TagPicker、ImageUpload
│  ├─ App.tsx
│  └─ main.tsx
├─ .env.local                # 本地变量，不提交
├─ .gitignore                # 加上 .env.local
├─ vite.config.ts
└─ package.json
```

## 4. 数据库（在 Supabase 的 SQL Editor 里整段运行）

### 4.1 表、触发器、搜索函数
```sql
-- 成员白名单：只有这里的人能用
create table public.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_member()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid());
$$;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  title text not null,
  description text,
  cover_path text,
  servings int,
  prep_min int,
  cook_min int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position int not null default 0,
  name text not null,
  amount text,
  unit text,
  note text
);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position int not null default 0,
  content text not null,
  image_path text
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create index on public.ingredients (recipe_id);
create index on public.steps (recipe_id);

-- 自动更新时间
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

-- 搜索：菜名或食材包含关键词（数据量小，ilike 足够，中文也能搜）
create or replace function public.search_recipes(q text)
returns setof public.recipes
language sql stable
as $$
  select distinct r.*
  from public.recipes r
  left join public.ingredients i on i.recipe_id = r.id
  where r.title ilike '%' || q || '%'
     or i.name ilike '%' || q || '%'
  order by r.updated_at desc;
$$;
```

### 4.2 RLS 行级安全
```sql
alter table public.members     enable row level security;
alter table public.recipes     enable row level security;
alter table public.ingredients enable row level security;
alter table public.steps       enable row level security;
alter table public.tags        enable row level security;
alter table public.recipe_tags enable row level security;

-- 成员表：成员只能读，增删只在 SQL Editor 里做
create policy "members can read members" on public.members
  for select to authenticated using (public.is_member());

-- 其余表：两位成员都能读写
create policy "members full access" on public.recipes
  for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members full access" on public.ingredients
  for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members full access" on public.steps
  for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members full access" on public.tags
  for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members full access" on public.recipe_tags
  for all to authenticated using (public.is_member()) with check (public.is_member());
```
如果以后想改成“各自只能改自己创建的菜谱”，把 recipes 的 update/delete 策略加上 `created_by = auth.uid()` 即可。

### 4.3 图片存储
```sql
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', false);

create policy "members read images" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-images' and public.is_member());
create policy "members upload images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-images' and public.is_member());
create policy "members update images" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-images' and public.is_member());
create policy "members delete images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-images' and public.is_member());
```
- 文件路径：`{recipe_id}/{时间戳}.jpg`，数据库只存路径（cover_path、image_path）
- 私有桶，显示时用 `createSignedUrl(path, 3600)` 拿 1 小时有效的地址
- 删除菜谱时，前端顺手把它目录下的图片删掉

## 5. 页面结构（HashRouter，网址形如 /cookerY/#/recipes/xxx）
| 路由 | 页面 | 内容 |
|---|---|---|
| /login | 登录 | 邮箱 + 密码 |
| / | 菜谱列表 | 搜索框、标签筛选、卡片（封面、菜名、时长、谁添加的） |
| /recipes/new | 新建 | 基本信息、食材编辑、步骤编辑、标签、封面上传 |
| /recipes/:id | 详情 | 封面、食材清单、步骤、编辑/删除按钮 |
| /recipes/:id/edit | 编辑 | 同新建，带已有数据 |
| /settings | 设置 | 显示名、修改密码、退出 |

除 /login 外都套 RequireAuth。

## 6. 关键配置

### vite.config.ts
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cookerY/',
})
```

### src/lib/supabase.ts
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

### .env.local（本地，不提交）
```
VITE_SUPABASE_URL=https://jjgrnefvpqhthsobpkml.supabase.co
VITE_SUPABASE_ANON_KEY=在 Supabase 的 Project Settings → API Keys 里复制 anon / publishable key
```

### .github/workflows/deploy.yml
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 7. 执行清单（按顺序打勾）

### 阶段 0：Supabase 设置（约 20 分钟）
- [ ] SQL Editor 依次运行 4.1、4.2、4.3
- [ ] Authentication → Sign In / Providers → Email：保持开启，最短密码设 8 位
- [ ] Authentication → Users → Add user：给你们两个人各建一个账号（勾选自动确认邮箱）
- [ ] 复制两人的 User UID，在 SQL Editor 运行：
  `insert into public.members (user_id, display_name) values ('你的UID', 'Zijian'), ('对方UID', '对方名字');`
- [ ] 关闭公开注册：Authentication 设置里把 Allow new users to sign up 关掉
- [ ] Authentication → URL Configuration：Site URL 填 https://zijian2625492669-lgtm.github.io/cookerY/ ；Redirect URLs 加上它和 http://localhost:5173（改密码邮件要用）

### 阶段 1：脚手架 + 自动部署（约 1 小时）
- [ ] `npm create vite@latest cookerY -- --template react-ts`
- [ ] `npm i @supabase/supabase-js react-router-dom browser-image-compression`
- [ ] 加 vite.config.ts 的 base、.env.local、.gitignore
- [ ] 加 deploy.yml，推到 main
- [ ] 仓库 Settings → Pages → Source 选 GitHub Actions
- [ ] 仓库 Settings → Secrets and variables → Actions → Variables：加 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
- [ ] 打开 Pages 网址能看到页面 = 完成

### 阶段 2：登录（约 半天）
- [ ] AuthProvider：`getSession()` + `onAuthStateChange()`
- [ ] 登录页：`signInWithPassword({ email, password })`
- [ ] RequireAuth、退出 `signOut()`
- [ ] 设置页改密码：`updateUser({ password })`
- [ ] 验证：未登录访问 /#/ 会跳登录；第三个账号（若有）读不到数据

### 阶段 3：菜谱增删改查（约 1–2 天）
- [ ] 列表：`from('recipes').select('*, members!created_by(display_name)')`（或单独查 members 映射名字）
- [ ] 详情：`select('*, ingredients(*), steps(*), recipe_tags(tags(*))')`，前端按 position 排序
- [ ] 新建：先插 recipes 拿 id，再批量插 ingredients、steps
- [ ] 编辑：更新 recipes；食材和步骤直接“全删再插”，最简单不出错
- [ ] 删除：删 recipes，子表自动级联

### 阶段 4：标签 + 搜索（约 半天）
- [ ] TagPicker：已有标签多选，可新建（`upsert` 到 tags）
- [ ] 筛选：按标签查 recipe_tags 拿 recipe_id
- [ ] 搜索：`supabase.rpc('search_recipes', { q })`

### 阶段 5：图片（约 半天）
- [ ] 上传前压缩到 1MB / 1600px 内
- [ ] `storage.from('recipe-images').upload(path, file)`，路径写回 cover_path / image_path
- [ ] 显示用 `createSignedUrl(path, 3600)`
- [ ] 换图或删菜谱时删旧文件

### 阶段 6：打磨（随意）
- [ ] 手机端排版（做饭时多半用手机看）
- [ ] 空状态、加载中、错误提示
- [ ] 可选：加到手机主屏（PWA）

## 8. 注意事项
- Supabase 免费项目一周没有访问会被暂停，到后台点恢复即可；常用就不会遇到
- anon/publishable key 放前端是正常的，安全靠 RLS；secret / service_role key 绝不能出现在仓库
- 每加一张新表，记得 enable RLS 并加策略，否则前端读不到（或者被所有人读到）
- 自带的邮件服务每小时只能发很少几封，两人用够了；不够再接自己的 SMTP
