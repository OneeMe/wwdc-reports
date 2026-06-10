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

推送至 `main` 分支且变更涉及 `web/**` 路径时，GitHub Actions 会自动构建并部署到 Cloudflare Pages。

也可手动触发：在 GitHub 仓库 → Actions → "Deploy Web to Cloudflare Pages" → Run workflow。

### 必需的 Secrets

在仓库 Settings → Secrets and variables → Actions 中配置：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（需包含 `Cloudflare Pages:Edit` 权限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

获取方式：
- **API Token**: Cloudflare Dashboard → My Profile → API Tokens → Create Token → 使用 "Custom token" 模板，权限添加 `Zone:Read` 和 `Cloudflare Pages:Edit`
- **Account ID**: Cloudflare Dashboard 右侧边栏可见

### 首次创建 Pages 项目

若 Cloudflare Pages 上尚未创建 `wwdc-quick-look` 项目，可通过 Wrangler CLI 创建：

```bash
npx wrangler pages project create wwdc-quick-look --production-branch=main
```

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
