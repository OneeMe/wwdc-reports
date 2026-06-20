# :globe_with_meridians: wwdc-quick-look Web

Astro 构建的 wwdc-quick-look 静态站点，部署在 Cloudflare Pages。

文章评论使用开源项目 [utterances](https://utteranc.es/) 嵌入 GitHub Issues。站点不保存 GitHub OAuth secret，也不维护自定义评论 API；登录、Markdown 渲染、评论提交和 Issue 关联都由 utterances 处理。

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
4. 保存并部署

### 评论系统配置

评论由 `web/src/components/GitHubComments.astro` 里的 utterances script 加载，当前配置：

| 配置 | 值 |
| --- | --- |
| GitHub repo | `SwiftGGTeam/wwdc-quick-look` |
| Issue mapping | `articleSlug`，例如 `wwdc2026-101` |
| Label | `article-comment` |
| Theme | `github-light` |

发布前需要确认：

1. GitHub 仓库已启用 Issues。
2. 已安装并授权 [utterances GitHub App](https://github.com/apps/utterances) 访问 `SwiftGGTeam/wwdc-quick-look`。
3. 如果希望自动加标签，仓库里存在 `article-comment` label。

### 自动触发

推送至 `main` 分支且变更涉及 `web/**` 路径时，Cloudflare 会自动构建并部署。无需配置 GitHub Actions 或 Cloudflare secret。

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
```
