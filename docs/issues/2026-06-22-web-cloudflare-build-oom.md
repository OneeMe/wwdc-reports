# Web Cloudflare Build OOM

## 基本信息

- 日期：2026-06-22
- 严重程度：高
- 状态：已修复
- 影响范围：Cloudflare Pages 部署、Web 静态构建
- 关联 Commit：见包含本文档的修复提交

## 问题描述

Cloudflare Pages 在构建 Web 站点时触发 JavaScript heap out of memory。日志显示构建过程中大量 Shiki fallback warning，随后 V8 在约 8GB heap 附近连续 Mark-Compact 后失败，并以 code 134 退出。

## 复现路径

1. Cloudflare Pages 使用 `cd web && npm install && npm run build` 构建。
2. `web/package.json` 中 `build` 当前设置为 `NODE_OPTIONS=--max-old-space-size=8192 astro build`。
3. Astro 构建 3408 个静态页面，其中包含 3402 篇 MDX 文章。
4. Markdown 代码块默认由 Shiki 在构建期做语法高亮。
5. Cloudflare 构建环境在接近 8GB heap 时 OOM。

## 代码位置

- `web/package.json`：Web 构建脚本原本单进程构建全部语言内容。
- `web/scripts/build-locales.mjs`：新增分语言顺序构建入口。
- `web/astro.config.mjs`：显式保留 Markdown Shiki syntax highlighting，并固定页面渲染并发为 1。
- `web/src/content.config.ts`：根据 `WWDC_ARTICLE_BUILD_LANG` 限制本次 Astro 进程加载的文章集合。
- `web/src/pages/`：根据 `WWDC_ARTICLE_BUILD_LANG` 限制本次 Astro 进程生成的语言路由。
- `web/src/content/articles/`：大量 MDX 文章和代码块是构建内存压力的主要输入。

## 根因分析

这不是缺少 `NODE_OPTIONS` 的问题。当前构建脚本已经把 V8 heap 设置为 8192MB，而 Cloudflare 日志正是在约 8GB heap 附近 OOM。继续提高 heap 不适合 Cloudflare Pages 构建环境，还会把 V8 heap 和容器总内存挤得更近。

真正的压力来自静态构建规模和 Markdown 处理方式叠加：i18n 后文章页扩展到 3408 个静态页面，MDX 代码块默认使用 Shiki 在构建期高亮。Shiki 对大量代码块的构建期处理会增加内存占用，也产生大量不支持语言的 fallback warning。

单纯降低 Astro 页面构建并发不是充分修复。Astro 的 `build.concurrency` 默认已经是 1，主要控制页面渲染并行数；本次 OOM 的高压点更靠近 Vite/MDX 内容加载和 Markdown 高亮阶段，因此需要减少单个 Astro 进程一次性加载和处理的 MDX 规模。

## 修复方案

- 保留 Markdown 代码块的 Shiki 高亮，避免文章代码块退化成纯文本展示。
- 显式设置 `build.concurrency: 1`，把页面渲染并发固定在最低值，防止未来配置漂移。
- 新增 `web/scripts/build-locales.mjs`，把生产构建拆成 `en`、`ja`、`zh` 三个顺序执行的 Astro 子进程。
- 每个子进程通过 `WWDC_ARTICLE_BUILD_LANG` 只加载当前语言的文章集合，只生成当前语言对应的路由；构建产物先写入系统临时目录下的 isolated workspace，再合并到最终 `dist`。
- 将 build 脚本的 V8 heap 从 8192MB 下调到 6144MB，避免在 Cloudflare 8GB 级别环境中把 JS heap 顶到容器边界。
- 增加自动化测试，锁定 Cloudflare 构建继续保留 Shiki，同时必须走分语言构建入口。

## 测试策略

- 新增配置测试，确认 `astro.config.mjs` 保留 Markdown Shiki syntax highlighting，并固定 `build.concurrency: 1`。
- 新增配置测试，确认 `web/package.json` 的 build script 使用分语言构建入口和较低 heap。
- 新增配置测试，确认内容集合和构建脚本使用 `WWDC_ARTICLE_BUILD_LANG`。
- 运行 Cloudflare 相关构建测试和 Web 构建。

## 验证结果

- `node --test test/wwdc-quick-look/cloudflare-build-config.test.js`：通过，确认 Markdown 代码块继续使用 Shiki，构建入口切到分语言构建脚本，build script 不再使用 8192MB heap。
- `npm test`（`web/`）：通过，`check-i18n` 无回归。
- `node --test test/wwdc-quick-look/articles-no-404.test.mjs`：通过，文章覆盖检查无回归。
- `npm run build`（`web/`）：通过，使用 `NODE_OPTIONS=--max-old-space-size=6144 node scripts/build-locales.mjs` 分别构建英文、日文、中文产物后合并到 `dist`。构建日志仍出现 Shiki fallback warning，说明 Shiki 高亮仍处于启用状态；这些 warning 来自当前内容中的非标准语言标记。
- `find web/dist -name 'index.html' | wc -l`：输出 3408，确认合并后的静态页面数量完整。
- 检查 `web/dist/articles/wwdc2026-201/index.html`、`web/dist/en/articles/wwdc2026-201/index.html`、`web/dist/ja/articles/wwdc2026-201/index.html`：均包含 `astro-code github-dark` 和 Shiki token `span`，确认代码块高亮保留。
- `git diff --check`：通过。

## 经验总结

当静态内容规模达到数千个 MDX 页面时，构建期语法高亮要视为部署成本的一部分。Cloudflare Pages 上的 OOM 优先通过减少单个构建进程的内容规模解决，而不是继续扩大 Node heap 或牺牲用户可见的代码高亮体验。
