# :globe_with_meridians: wwdc-quick-look Web

Astro 构建的 wwdc-quick-look 静态站点，部署在 Cloudflare Pages。

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

### 自动触发

推送至 `main` 分支且变更涉及 `web/**` 路径时，Cloudflare 会自动构建并部署。无需配置 GitHub Actions 或 Secrets。

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
