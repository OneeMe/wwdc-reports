# 基本信息

- 日期：2026-07-03
- 严重程度：P2
- 状态：已修复
- 影响范围：`test/wwdc-quick-look/web-article-related-sessions.test.js`
- 关联 Commit：当前仓库本次提交

# 问题描述

完整 `npm test` 失败在 `web-article-related-sessions.test.js` 的 “renders the source video link from article frontmatter” 用例。测试仍断言 `ArticleLayout.astro` 内硬编码包含 `观看原视频`，但页面布局已经迁移到 i18n，通过 `copy.watchVideo` 输出视频按钮文案。

# 复现路径

```sh
npm test
```

失败断言：

```text
AssertionError: The input did not match the regular expression /观看原视频/
```

# 代码位置

- `test/wwdc-quick-look/web-article-related-sessions.test.js`
- `web/src/layouts/ArticleLayout.astro`
- `web/src/i18n/articles.ts`

# 根因分析

测试保护的行为是“文章页从 frontmatter 读取 `videoUrl` 并渲染原视频按钮”。i18n 改造后，`ArticleLayout.astro` 不再直接写中文文案，而是通过 `getArticlesLocale(lang)` 和 `copy.watchVideo` 读取对应语言文案。

测试没有随 i18n 结构更新，仍检查旧的硬编码中文，导致行为正常但测试失败。

# 修复方案

更新测试断言：

- 继续检查文章页把 `entry.data.videoUrl` 传给 layout。
- 继续检查 layout 声明 `videoUrl` 并绑定 `href={videoUrl}`。
- 新增检查 layout 使用 `copy.watchVideo`。
- 新增检查 `web/src/i18n/articles.ts` 仍包含中文 `watchVideo: "观看原视频"`。

# 测试策略

- 运行定向测试：`node --test test/wwdc-quick-look/web-article-related-sessions.test.js`
- 运行完整测试：`npm test`

# 验证结果

已通过：

```sh
node --test test/wwdc-quick-look/web-article-related-sessions.test.js
git diff --check
npm test
```

完整测试结果：79 个测试全部通过。

# 经验总结

i18n 改造后，测试不要继续断言 layout 内的具体语言文案。应该分别验证组件使用 locale key，以及 locale 文件保留目标语言文案。
