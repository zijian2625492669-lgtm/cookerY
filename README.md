# cookerY · 我们的菜谱

两人共用的私人菜谱网站，手机优先（iOS / Android，可“添加到主屏幕”）。

- 技术：Vite + React + TypeScript + React Router（HashRouter）
- 部署：GitHub Pages（`.github/workflows/deploy.yml`）
- 后端：Supabase（Auth + Postgres + Storage），尚未接入

## 当前状态：UI 原型 v0.1
- 视觉基调「厨房手账」：米白纸感底、番茄红点缀、宋体标题、大圆角卡片、悬浮底部导航，自动深色模式
- 页面：登录、菜谱列表（搜索 + 标签）、详情（食材打勾）、做菜模式（一屏一步、大字、屏幕常亮）、新建/编辑、我的
- 数据是假数据，存在浏览器 localStorage；`src/lib/store.tsx` 是以后换成 Supabase 的唯一入口

## 本地运行
```bash
npm install
npm run dev
```
