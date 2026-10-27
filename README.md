# cookerY · 我们的菜谱

两人共用的私人菜谱网站，手机优先。Vite + React + TypeScript + HashRouter，GitHub Pages 部署，Supabase Auth / Postgres / 私有 Storage 提供后台。

## v0.2

- 自定账号 + 密码登录、退出、修改密码，无需真实邮箱或邮箱验证
- members 白名单：两人都能查看和编辑全部菜谱，保留原创建人
- 食材 / 调料 / 酱料 / 备菜 / 开做五段菜谱，事务保存、标签和搜索
- 封面压缩上传、私有图片签名地址、替换和删除时清理图片
- 「我的」导入原来浏览器的本地菜谱，重复导入不覆盖云端
- 真实后端已初始化，两个账号需在 Supabase 管理端创建并加入白名单

启用账号、部署和验证见 [首次设置](docs/setup.md)。

## 本地运行

```bash
npm ci
npm run dev
npm run build
```

本项目公开配置已内置，可通过 `.env.local` 覆盖，见 `.env.example`。只使用 publishable key，管理员 secret/service-role key 不能放进前端或仓库。

```bash
npx playwright install chromium
npm test
```

视觉基调与规划见 `docs/design.md`、`docs/plan.md`，当前进度见 `docs/handoff.md`。
