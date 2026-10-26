# cookerY 工作存档 · 交接说明

最后更新：2026-10-26（v0.2）。接着做之前先读这份，再看《规划书（定稿）》和《视觉基调说明》。

## 1. 现在到哪了
| 项目 | 状态 |
|---|---|
| 规划书 | 已定稿（Notion：规划 / cookerY 规划书（定稿）） |
| 视觉基调 | 已确认（Notion：规划 / cookerY 视觉基调说明） |
| 前端 UI 原型 v0.2 | 完成，已上线（v0.2：菜谱分 食材/调料/酱料/备菜/开做 五段；顶部按钮固定） |
| Supabase 后端 | 未开始（项目已建，表还没建） |
| 图片上传 | 未开始 |

## 2. 关键地址
- 仓库：github.com/zijian2625492669-lgtm/cookerY（main 分支）
- 线上：zijian2625492669-lgtm.github.io/cookerY/
- 部署：推送 main 自动触发 `.github/workflows/deploy.yml`（Pages 的 Source 已设为 GitHub Actions）
- Supabase 项目：cookerY，ref `jjgrnefvpqhthsobpkml`，API 地址 jjgrnefvpqhthsobpkml.supabase.co

## 3. 已定决策（别再改，除非有新理由）
- 技术：Vite + React 18 + TypeScript + React Router 6（HashRouter），纯 CSS 变量，不用 Tailwind
- 登录：邮箱 + 密码；关闭公开注册；两人共用，members 白名单
- 权限：两人都能看、改全部菜谱，记录创建人
- 部署：GitHub Pages，`vite.config.ts` 的 base 是 `/cookerY/`
- 不用网络字体、不放外链图片（国内访问）
- 手机优先（iOS / 安卓），可添加到主屏幕

## 4. 代码结构
```
src/
├─ main.tsx              入口：HashRouter + StoreProvider
├─ App.tsx               路由 + 未登录跳 /login + 底部导航显示规则
├─ styles.css            全部样式；顶部 CSS 变量就是视觉基调
├─ lib/
│  ├─ types.ts           Recipe / Ingredient 类型
│  ├─ mock.ts            假数据、标签列表 ALL_TAGS、成员 MEMBERS
│  └─ store.tsx          数据层：user、login、logout、recipes、save、remove
├─ components/
│  ├─ Cover.tsx          渐变 + emoji 封面（6 种配色）
│  ├─ TopBar.tsx         固定顶栏（返回/编辑/取消/保存），不随滚动
│  └─ TabBar.tsx         悬浮底部导航 + 中间新建按钮
└─ pages/
   ├─ Login.tsx          /login
   ├─ Home.tsx           /        列表、搜索、标签筛选
   ├─ Detail.tsx         /r/:id   详情、食材打勾、删除
   ├─ Cook.tsx           /r/:id/cook  做菜模式（一屏一步、屏幕常亮）
   ├─ Edit.tsx           /new 和 /r/:id/edit
   └─ Me.tsx             /me      我的、成员、退出
```
路由和规划书里写的略有不同，以代码为准：详情是 `/r/:id`，新建是 `/new`，“我的”是 `/me`。

## 5. 数据层：接后端只改一个地方
页面只通过 `useStore()` 拿数据，现在 `store.tsx` 读写的是 localStorage。接 Supabase 时：
1. `login(email)` → `supabase.auth.signInWithPassword({ email, password })`（页面要把密码也传进来）
2. `logout()` → `supabase.auth.signOut()`
3. `user` → 来自 `onAuthStateChange` 的 session，再查 members 拿 display_name
4. `recipes` → 启动时查 recipes + ingredients + steps + recipe_tags(tags)，拼成现有的 Recipe 类型
5. `save(r)` → upsert recipes；ingredients、steps、recipe_tags 先删后插
6. `remove(id)` → delete recipes（子表级联）
建议把 save / remove 改成 async，页面上加“保存中”状态。

## 6. 前端类型 ↔ 数据库字段（以原型为准，修正规划书）
| 前端 Recipe | 数据库 | 说明 |
|---|---|---|
| id | recipes.id (uuid) | 新建时前端现在用 `r+时间戳`，接库后改用数据库生成的 uuid |
| title / description | recipes.title / description | |
| emoji | recipes.emoji text 默认 '🍳' | 规划书里没有，需新增 |
| palette | recipes.palette int 默认 0 | 规划书里没有，需新增 |
| minutes | recipes.minutes int | 原型只用一个总时长，替代规划书的 prep_min / cook_min |
| servings | recipes.servings | |
| author | recipes.created_by → members.display_name | |
| tags: string[] | tags + recipe_tags | |
| ingredients[] | ingredients，kind='main' | 食材：主料配料 |
| seasonings[] | ingredients，kind='seasoning' | 调料：直接下锅 |
| sauce[] | ingredients，kind='sauce' | 酱料：提前调好的碗汁 |
| sauceNote | recipes.sauce_note text | 酱料怎么调 |
| prep: string[] | steps，phase='prep' | 备菜处理 |
| steps: string[] | steps，phase='cook' | 正式开做；步骤图 image_path 以后再加 |
| updatedAt | recipes.updated_at | |
| （无） | recipes.cover_path | 接图片上传时再用；没照片继续显示渐变封面 |

所以执行规划书 4.1 的建表 SQL 时，recipes 表改成：去掉 prep_min、cook_min，加上
```sql
emoji text not null default '🍳',
palette int not null default 0,
minutes int,
sauce_note text not null default '',
```
ingredients 表加：`kind text not null default 'main' check (kind in ('main','seasoning','sauce'))`
steps 表加：`phase text not null default 'cook' check (phase in ('prep','cook'))`
两张表都按 (recipe_id, kind/phase, position) 排序读取。

## 6.5 菜谱结构（v0.2 定下）
一道菜分五段，详情页按这个顺序展示，空的段自动隐藏：
1 食材 → 2 调料 → 3 酱料（可选，附“怎么调”） → 4 备菜处理 → 5 正式开做
做菜模式：先走备菜（有酱料且备菜里没写“调”时自动补一步“调酱料”），切到开做时按钮显示“备好了，开火 🔥”；开做第一步下方提示本菜调料。
用户之后会提供真实菜谱，按这五段录入。

## 7. 接下来按这个顺序做
1. Supabase 里跑建表、RLS、存储 SQL（规划书第 4 节 + 上面的修正），建两个账号、写 members、关注册、配 URL
2. 仓库 Settings → Secrets and variables → Actions → Variables 加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
3. `npm i @supabase/supabase-js`，新建 `src/lib/supabase.ts`
4. 改 `store.tsx`（第 5 节），登录页把密码传进去，去掉“随便填就能进”
5. 标签列表从 tags 表读，不再用 ALL_TAGS 常量；成员从 members 表读，不再用 MEMBERS
6. 图片上传（封面先做，步骤图后做）
7. 打磨：加载中、错误提示、离线时的提示

## 8. 本地开发
```bash
git clone https://github.com/zijian2625492669-lgtm/cookerY.git
cd cookerY
npm install
npm run dev        # 本地打开 localhost:5173/cookerY/
npm run build      # 先 tsc 类型检查再打包
```
本地变量放 `.env.local`（已在 .gitignore），不要提交。

## 9. 文档在哪
- Notion「规划」下：规划书（定稿）、视觉基调说明、本交接说明
- 仓库 `docs/`：同样三份（plan.md、design.md、handoff.md），跟代码一起走
- 每完成一步，回来更新本说明第 1 节和第 7 节
