# Web Article MDX Angle Bracket Build Failure

## 基本信息

- 日期：2026-06-19
- 严重程度：中
- 状态：已修复
- 影响范围：Web 全量构建、WWDC 2023/2024 文章详情页
- 关联 Commit：待补充

## 问题描述

`npm --prefix web run build` 在处理文章 MDX 时失败，阻塞全量 Web 静态构建。最初暴露在 `web/src/content/articles/wwdc2023-10179.mdx`，修复后继续暴露出 `web/src/content/articles/wwdc2024-10066.mdx` 的同类问题。

## 复现路径

1. 在仓库根目录运行 `npm --prefix web run build`。
2. Astro 完成 content sync 后进入 Vite/MDX 构建。
3. 构建在 `web/src/content/articles/wwdc2023-10179.mdx:152:45` 报错。
4. 修复该文件后再次构建，继续在 `web/src/content/articles/wwdc2024-10066.mdx:126:3` 报错。

## 代码位置

- `web/src/content/articles/wwdc2023-10179.mdx`：正文列表项包含裸写的角括号距离表达。
- `web/src/content/articles/wwdc2024-10066.mdx`：正文列表项包含裸写的泛型表达。

## 根因分析

MDX 会把正文里的 `<...>` 解析为 JSX 标签。`wwdc2023-10179.mdx` 中 `（<1m）` 的 `<1m` 被当成 JSX 开始标签，但 `1` 不能作为标签名开头，因此 MDX 解析报错。

`wwdc2024-10066.mdx` 中的 `Promise<boolean>` 被解析成 `<boolean>` JSX 标签，但正文段落中没有对应闭合标签，因此 MDX 解析报错。

## 修复方案

- 将 `wwdc2023-10179.mdx` 中的 `<1m` 和 `>1m` 改为“小于 1m”和“大于 1m”。
- 将 `wwdc2024-10066.mdx` 中的 `Promise<boolean>` 改为“返回一个布尔结果的 Promise”。

## 测试策略

- 运行全量 `npm --prefix web run build` 验证 MDX 构建。
- 运行文章格式校验，确认文章结构没有被破坏。

## 验证结果

- `node scripts/check-article-format.mjs web/src/content/articles/wwdc2023-10179.mdx`：通过，`✅ wwdc2023-10179.mdx`。
- `node scripts/check-article-format.mjs web/src/content/articles/wwdc2024-10066.mdx`：通过，`✅ wwdc2024-10066.mdx`。
- `npm --prefix web run build` 在修复文章 MDX 后不再出现语法错误，但默认 Node heap 在后续静态构建阶段 OOM。
- 将 `web/package.json` 的 build 脚本加上 `NODE_OPTIONS=--max-old-space-size=8192` 后，`npm --prefix web run build` 通过，构建 1136 个页面。

## 经验总结

在 MDX 正文里写技术表达时，裸角括号会优先进入 JSX 解析路径；泛型、范围和 HTML-like 示例如果不在代码块中，应改为自然语言或转义实体。全量 Astro 构建会顺序暴露多个内容错误，修复第一个 MDX 报错后需要继续跑到构建完成。
