# Web Article Duplicate Title

## 基本信息

- 日期：2026-06-10
- 严重程度：中
- 状态：已修复
- 影响范围：Web 文章详情页、文章批量生成脚本
- 关联 Commit：待补充

## 问题描述

文章详情页顶部已经由页面布局根据 frontmatter `title` 渲染一次标题，但 MDX 正文开头又包含同名一级标题，导致用户看到重复标题。

## 复现路径

1. 打开任意文章详情页，例如 `/articles/wwdc2024-10087`。
2. 页面 header 显示文章标题、日期、标签和原视频按钮。
3. 进入正文后，MDX 内容开头再次显示同名 H1 标题。

## 代码位置

- `web/src/layouts/ArticleLayout.astro`：页面 header 渲染 frontmatter `title`。
- `scripts/batch-convert-articles.mjs`：生成 MDX 正文时额外写入 `# ${title}`。
- `web/src/content/articles/*.mdx`：已生成文章正文包含重复 H1。

## 根因分析

文章标题同时存在于两个渲染层：布局层使用 frontmatter `title` 生成页面标题；内容生成脚本又把同一个标题写入 MDX 正文。Astro 渲染时两者都会显示，造成重复。

## 修复方案

- 保留 `ArticleLayout.astro` 中基于 frontmatter `title` 的页面标题。
- 从 `scripts/batch-convert-articles.mjs` 移除正文开头的 `# ${title}` 生成逻辑，让正文直接从 `## Highlight` 开始。
- 批量迁移已生成的 `web/src/content/articles/*.mdx`，删除 frontmatter 后紧跟的重复一级标题和分隔线。

## 测试策略

- 扩展 `test/wwdc-quick-look/web-article-related-sessions.test.js`，覆盖生成脚本不再写 `# ${title}`，示例文章不再以正文 H1 开头。
- 扫描所有已生成 MDX，确认 frontmatter 后不再紧跟一级标题。
- 运行项目单元测试、语法检查和 Astro web build。
- 检查构建产物示例页面，确认页面中只剩一个 `<h1>`。

## 验证结果

- `npm --prefix /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look test`：通过，53 个测试全部通过。
- `npm --prefix /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look run check`：通过。
- MDX 扫描：`articles with duplicate leading H1: 0`。
- `npm --prefix /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look/web run build`：构建完成并生成静态页面。构建中仍有既有 Shiki/CSS warning，但命令成功。
- 构建产物检查：示例页面 `/articles/wwdc2026-369/` 中 `<h1>` 数量为 1。

## 经验总结

页面级标题应由布局层统一负责，正文内容不要重复写同一标题。生成脚本应把 frontmatter 作为展示元数据来源，正文从真正的内容小节开始，避免内容层和布局层职责重叠。
