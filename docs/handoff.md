# cookerY 工作存档 · 交接说明

最后更新：2026-10-27（v0.2 后端接入）。接着做之前先读这份，再看《规划书（定稿）》和《视觉基调说明》。

## 1. 现在到哪了
最后更新：2026-10-27。v0.2 后端接入已完成开发，共用账号已启用；本次已获授权合并部署。

| 项目 | 状态 |
|---|---|
| 前端 UI v0.2 | 保留五段菜谱、固定顶栏、做菜模式、手机布局 |
| Supabase 数据库 | 已建立 6 张业务表、成员 RLS、事务保存 RPC、创建人保护、同时编辑检测 |
| 登录与同步 | 已接真实 Auth，两人共用账号；支持短账号/完整邮箱、退出、改密、定期刷新 |
| 封面上传 | 已接压缩上传、私有桶、签名地址、旧封面清理；步骤图待后续 |
| 旧数据 | 「我的」可导入本机旧菜谱，保留原数据，重复 ID 不覆盖云端 |
| 共用账号 | 用户已创建一个邮箱确认的 Auth 账号，已加入 members，显示名「我们俩」 |
| 验证 | 构建通过；真实数据库事务验证通过；浏览器模拟 API 测试见 tests/ |

## 2. 关键地址
- 仓库：github.com/zijian2625492669-lgtm/cookerY（main 分支）
- 线上：zijian2625492669-lgtm.github.io/cookerY/
- 部署：推送 main 自动触发 `.github/workflows/deploy.yml`（Pages 的 Source 已设为 GitHub Actions）
- Supabase 项目：cookerY，ref `jjgrnefvpqhthsobpkml`，API 地址 jjgrnefvpqhthsobpkml.supabase.co

## 3. 已定决策（别再改，除非有新理由）
- 技术：Vite + React 18 + TypeScript + React Router 6（HashRouter），纯 CSS 变量，不用 Tailwind
- 登录：一个共用账号 + 密码，前台支持短账号（补 @cook.com）或完整邮箱；成员权限已配置
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
│  ├─ mock.ts            保留的原型示例（不再作为云端数据源）
│  ├─ supabase.ts        公开客户端配置、账号转换
│  ├─ api.ts             读写 API 和事务保存
│  ├─ images.ts          压缩上传、签名地址和清理
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

## 5. 数据层
页面通过 `useStore()` 读写数据：
- `src/lib/supabase.ts`：公开客户端配置和账号转换，不含管理员密钥。
- `src/lib/api.ts`：读取菜谱、成员、标签；`save_recipe` RPC 在单个事务中保存五段内容和标签。
- `src/lib/images.ts`：压缩、私有桶上传、删除图片。
- `src/lib/store.tsx`：真实 Auth 会话、成员校验、30 秒刷新、异步保存和本机旧菜谱导入。

新菜谱使用草稿生成的稳定 UUID，以支持保存重试；导入旧菜谱时由数据库生成 UUID。未成功保存的编辑内容留在当前页面。创建人由数据库确定，另一成员编辑不会改写创建人。重复导入依据 legacy_id 跳过，不覆盖已有数据。原型 localStorage 数据不再自动用作云端列表。

## 6. 前端类型 ↔ 数据库字段（以原型为准，修正规划书）
| 前端 Recipe | 数据库 | 说明 |
|---|---|---|
| id | recipes.id (uuid) | 新菜谱使用稳定 UUID，旧原型 ID 存到 legacy_id 用于去重 |
| title / description | recipes.title / description | |
| emoji | recipes.emoji text 默认 '🍳' | 已新增，兼容原型样式 |
| palette | recipes.palette int 默认 0 | 已新增，兼容原型样式 |
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
| coverPath / photo | recipes.cover_path | 存储路径 / 临时签名地址；无照片显示渐变封面 |
| localPhoto | recipes.local_photo | 保留内置糖醋排骨照片路径 |
| version | recipes.updated_at | 原始时间戳，用于检测过期编辑 |

以下为相对旧规划书的结构变化，已经应用，无需再执行旧建表 SQL。recipes 表以 minutes 替代 prep_min、cook_min，并增加：
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

## 7. 发布与后续
1. 用户已创建一个共用账号，本次已配置成员访问权限；无需再创建第二个账号或手动加白名单。
2. 用户已授权正式上线；合并 PR 后等待 main 的 GitHub Pages 自动部署。
3. 使用后台设置的同一套账号密码在两台设备体验登录、互相编辑、封面上传和修改密码。
4. 保存过原型数据的浏览器可通过「我的 → 导入本机旧菜谱」迁入云端；后续再做步骤图和离线体验打磨。

完整空库结构在 supabase/schema.sql，真实数据库已应用。当前共用一个账号，无法区分两人的创建记录。

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
