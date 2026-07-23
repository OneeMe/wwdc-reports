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

### Google 统计配置

站点在 `web/src/layouts/BaseLayout.astro` 中支持 Google Analytics 和 Google Search Console。相关代码只读取公开的构建期环境变量，未配置时不会输出对应标签。

| 变量 | 用途 | 示例 |
| --- | --- | --- |
| `PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics 4 Measurement ID | `G-XXXXXXXXXX` |
| `PUBLIC_GA_MEASUREMENT_ID` | GA Measurement ID 的兼容别名 | `G-XXXXXXXXXX` |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console HTML meta 验证 token | `xxxxxxxxxxxxxxxx` |

本地验证：

```bash
cd web
PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX \
PUBLIC_GOOGLE_SITE_VERIFICATION=xxxxxxxxxxxxxxxx \
npm run build
```

Cloudflare Pages 中需要在项目设置的 **Environment variables** 里添加以上变量，然后重新部署。Search Console 侧选择 **HTML tag** 验证方式，并把 `content="..."` 中的值填入 `PUBLIC_GOOGLE_SITE_VERIFICATION`。

### Google AdSense 配置

站点已经预留文章页响应式广告位。广告脚本和广告位只有在生产构建同时满足以下条件时才会输出：

| 变量 | 用途 |
| --- | --- |
| `PUBLIC_GOOGLE_ADSENSE_ENABLED` | 功能开关；仅值为 `true` 时启用 |
| `PUBLIC_GOOGLE_ADSENSE_CLIENT` | AdSense 客户端标识 |
| `PUBLIC_GOOGLE_ADSENSE_ARTICLE_SLOT` | 文章页响应式广告位标识 |

这些变量应仅配置在 Cloudflare Pages 的 **Production** 环境中，不要把实际值写入仓库、提交到 `.env` 文件或添加到构建日志。任一变量缺失或格式不正确时，构建结果不会包含 AdSense 脚本和广告位。

客户端标识和广告位标识最终会出现在浏览器 HTML 中，本质上不是服务端密钥；使用 Cloudflare 环境变量的目的，是集中管理配置并避免把实际值提交到源代码。真正的访问令牌或账号凭据不应使用 `PUBLIC_` 前缀，也不应传递给前端。

当前广告策略：

1. 只在文章正文结束、评论区开始之前显示一个响应式广告位。
2. 首页、文章列表、搜索、筛选和视频入口暂不放置广告。
3. AdSense 后台暂不开启自动广告，待手动广告位完成审核和效果验证后再评估。
4. 根域名的 `ads.txt` 由根站点维护，本仓库不保存发布商标识，也不生成子域名 `ads.txt`。

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
