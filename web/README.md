# :globe_with_meridians: wwdc-quick-look Web

Astro 构建的 wwdc-quick-look 静态站点，部署在 Cloudflare Pages。

文章评论使用 GitHub Issues 作为数据源，并通过仓库根目录的 Cloudflare Pages Functions 暴露 `/api/comments/*`。Functions 保存 GitHub OAuth secret，前端只访问同源 API。

## 开发

```bash
cd web
npm install
npm run dev      # localhost:4321
npm run build    # 输出到 web/dist/
npm run preview  # 本地预览构建结果
```

## 部署

本站点通过 **Cloudflare Pages Git 集成** 自动部署。

### 配置方式

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. 授权 Cloudflare 访问 `SwiftGGTeam/wwdc-quick-look` 仓库
3. 构建配置：
   - **Project name**: `wwdc-quick-look`
   - **Production branch**: `main`
   - **Build command**: `cd web && npm run build`
   - **Build output directory**: `web/dist`
   - **Functions directory**: `functions`
4. 保存并部署

### 评论系统配置

在 Cloudflare Pages → Settings → Variables and Secrets 中配置：

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `GITHUB_COMMENTS_CLIENT_ID` | Variable | GitHub OAuth App Client ID |
| `GITHUB_COMMENTS_CLIENT_SECRET` | Secret | GitHub OAuth App Client Secret |
| `GITHUB_COMMENTS_SESSION_SECRET` | Secret | 用于加密登录 cookie，建议至少 32 字符 |
| `GITHUB_COMMENTS_REPO` | Variable | 评论 Issue 所在仓库，默认 `SwiftGGTeam/wwdc-quick-look` |
| `GITHUB_COMMENTS_SCOPE` | Variable | OAuth scope，默认 `public_repo` |
| `GITHUB_COMMENTS_LABEL` | Variable | 评论 Issue 标签，默认 `article-comment` |

GitHub OAuth App 的 callback URL 需要设置为：

```text
https://wwdc-quick-look.swiftgg.team/api/comments/auth/callback
```

本地调试 Cloudflare Pages Functions 时，使用 `.dev.vars` 或 Cloudflare Dashboard 配置同名变量；不要把 secret 提交到仓库。

### 自动触发

推送至 `main` 分支且变更涉及 `web/**` 或 `functions/**` 路径时，Cloudflare 会自动构建并部署。无需配置 GitHub Actions；评论系统所需密钥只配置在 Cloudflare Pages。

## 项目结构

```
web/
├── public/          # 静态资源（favicon、图片等）
├── src/
│   ├── components/  # Astro 组件
│   ├── layouts/     # 页面布局
│   ├── pages/       # 路由页面
│   ├── content/     # MDX 文章集合
│   └── i18n/        # 文案配置
├── astro.config.mjs # Astro 配置
└── package.json

functions/
└── api/comments/    # Cloudflare Pages Functions 评论 API
```
