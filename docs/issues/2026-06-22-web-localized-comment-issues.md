# Web Localized Comment Issues

## 基本信息

- 日期：2026-06-22
- 严重程度：中
- 状态：已修复
- 影响范围：Web 多语言文章详情页、GitHub issue 评论
- 关联 Commit：见包含本文档的修复提交

## 问题描述

同一个 WWDC session 的不同语言文章需要创建不同的 GitHub issue 评论区。当前实现只有默认中文文章页传入评论 key，多语言文章页没有传入 `articleSlug`，因此英文和日文文章页不会渲染评论组件，也无法创建对应语言自己的 issue。

## 复现路径

1. 打开中文文章页 `/articles/wwdc2026-201`。
2. 页面底部会渲染 utterances 评论区，issue key 为 `wwdc2026-201`。
3. 打开英文或日文文章页 `/en/articles/wwdc2026-201`、`/ja/articles/wwdc2026-201`。
4. 页面底部没有评论区，也不会为对应语言创建独立 issue。

## 代码位置

- `web/src/pages/articles/[slug].astro`：默认语言文章页传入 `articleSlug`。
- `web/src/pages/[lang]/articles/[slug].astro`：多语言文章页缺少 `articleSlug`。
- `web/src/layouts/ArticleLayout.astro`：只有存在 `articleSlug` 时才渲染评论组件。
- `web/src/components/GitHubComments.astro`：utterances 使用 `issue-term={articleSlug}` 创建或匹配 issue。

## 根因分析

多语言路由为了支持内容 fallback，传给 layout 的是实际内容 entry，而不是路由上的语言和 session slug。若直接使用 `entry.id`，英文和日文内容存在时会得到 `en/slug`、`ja/slug`，但 fallback 到中文内容时会退回 `slug`，导致不同语言可能复用中文评论区。当前代码干脆没有传 `articleSlug`，所以多语言页面完全没有评论区。

## 修复方案

- 默认中文文章页继续使用原有 session slug，例如 `wwdc2026-201`。
- 多语言文章页使用路由语言和 session slug 组合成稳定 issue key，例如 `en/wwdc2026-201`、`ja/wwdc2026-201`。
- 评论组件标题接入现有文章 i18n，避免英文和日文页面显示中文评论标题。

## 测试策略

- 更新评论组件测试，确认 utterances 仍使用 `articleSlug` 作为 `issue-term`。
- 增加多语言路由断言，确认英文和日文页面传入 `${lang}/${slug}` 作为评论 key。
- 增加文案断言，确认评论标题通过 i18n 注入。

## 验证结果

- `node --test test/wwdc-quick-look/github-comments.test.js`：通过，确认 utterances 配置、多语言评论 key 和 i18n 评论标题。
- `npm test`（`web/`）：通过，`check-i18n` 无回归。
- `node --test test/wwdc-quick-look/articles-no-404.test.mjs`：通过，文章路由覆盖无回归。
- `git diff --check`：通过。
- `NODE_OPTIONS=--max-old-space-size=16384 ./node_modules/.bin/astro build`（`web/`）：通过，构建 3408 个页面；日志中仍有既有 Shiki fallback warning。
- 构建产物抽查：`/articles/wwdc2026-201` 使用 `issue-term="wwdc2026-201"`，`/en/articles/wwdc2026-201` 使用 `issue-term="en/wwdc2026-201"`，`/ja/articles/wwdc2026-201` 使用 `issue-term="ja/wwdc2026-201"`。

## 经验总结

评论区 identity 应基于用户看到的路由语境，而不是内容 fallback 后的实际 entry id。多语言页面如果需要独立讨论区，评论 key 必须显式包含语言维度。
