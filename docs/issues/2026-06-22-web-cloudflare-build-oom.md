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

- `web/package.json`：Web 构建脚本设置了 8GB V8 heap。
- `web/astro.config.mjs`：未显式配置 Markdown syntax highlighting，使用 Astro 默认 Shiki。
- `web/src/layouts/ArticleLayout.astro`：文章页已有代码块基础样式，可承接无语法高亮的代码块展示。
- `web/src/content/articles/`：大量 MDX 文章和代码块是构建内存压力的主要输入。

## 根因分析

这不是缺少 `NODE_OPTIONS` 的问题。当前构建脚本已经把 V8 heap 设置为 8192MB，而 Cloudflare 日志正是在约 8GB heap 附近 OOM。继续提高 heap 不适合 Cloudflare Pages 构建环境，还会把 V8 heap 和容器总内存挤得更近。

真正的压力来自静态构建规模和 Markdown 处理方式叠加：i18n 后文章页扩展到 3408 个静态页面，MDX 代码块默认使用 Shiki 在构建期高亮。Shiki 对大量代码块的构建期处理会增加内存占用，也产生大量不支持语言的 fallback warning。

## 修复方案

- 在 Astro 配置里显式设置 `markdown.syntaxHighlight: false`，关闭 Markdown 代码块的构建期 Shiki 高亮。
- 保留文章页现有 `pre/code` 基础样式，确保代码块仍有深色背景、等宽字体和横向滚动。
- 将 build 脚本的 V8 heap 从 8192MB 下调到 6144MB，避免在 Cloudflare 8GB 级别环境中把 JS heap 顶到容器边界。实测 4096MB 仍不足以完成当前 3408 页构建。
- 增加自动化测试，锁定 Cloudflare 构建不再依赖 Shiki 默认高亮，也不再使用 8GB heap。

## 测试策略

- 新增配置测试，确认 `astro.config.mjs` 关闭 Markdown syntax highlighting。
- 新增配置测试，确认 `web/package.json` 的 build script 使用较低 heap。
- 运行 Cloudflare 相关构建测试和 Web 构建。

## 验证结果

- `node --test test/wwdc-quick-look/cloudflare-build-config.test.js`：通过，确认 Markdown 代码块不再使用 Shiki 构建期高亮，build script 不再使用 8192MB heap。
- `npm test`（`web/`）：通过，`check-i18n` 无回归。
- `git diff --check`：通过。
- `npm run build`（`web/`）：通过，使用 `NODE_OPTIONS=--max-old-space-size=6144 astro build` 构建 3408 个页面，用时 1m35s，构建日志没有再出现 Shiki fallback warning。
- 对照验证：`NODE_OPTIONS=--max-old-space-size=4096 astro build` 仍会在约 4GB heap OOM，因此当前内容规模下 4096MB 不足，6144MB 是更合适的 Cloudflare Pages 构建上限。

## 经验总结

当静态内容规模达到数千个 MDX 页面时，构建期语法高亮要视为部署成本的一部分。Cloudflare Pages 上的 OOM 优先通过减少构建期工作量解决，而不是继续扩大 Node heap。
