# Web Article Related Sessions Duplicate and Wrong Links

## 基本信息

- 日期：2026-06-10
- 严重程度：中
- 状态：已修复
- 影响范围：Web 文章详情页、文章批量生成脚本
- 关联 Commit：待补充

## 问题描述

文章详情页出现两处相关 Session：MDX 正文里的「相关 Session」与页面底部的 `Related Sessions` 组件重复。用户希望保留 MDX 正文中的相关 Session。

同时，相关 Session 链接当前指向筛选页，例如 `/articles?year=2026&topic=all&search=242`，用户期望点击后跳转到具体对应 session 页面。

## 复现路径

1. 打开任意文章详情页，例如 `/articles/wwdc2026-369`。
2. 页面正文底部可看到 MDX 生成的「相关 Session」。
3. 页面更底部还会看到布局追加的 `Related Sessions` 卡片区域。
4. 点击相关 Session 链接会进入 `/articles?year=...&topic=all&search=...` 筛选页，而不是具体文章页。

## 代码位置

- `web/src/layouts/ArticleLayout.astro`：文章布局在 slot 后追加 `RelatedSessions`。
- `web/src/components/RelatedSessions.astro`：底部相关 Session 组件使用硬编码的 `year=2026` 查询链接。
- `scripts/batch-convert-articles.mjs`：生成 MDX 正文中的相关 Session 链接为查询页链接。
- `web/src/content/articles/*.mdx`：已生成文章正文包含查询页格式链接。

## 根因分析

文章生成脚本同时写入 `relatedSessions` frontmatter 与正文 `## 相关 Session` 区块；文章布局又消费 frontmatter 并追加 `RelatedSessions` 组件，导致同一信息渲染两次。

正文链接由生成脚本写死为 `/articles?year=${year}&topic=all&search=${code}`，这是列表页筛选 URL，不是文章详情页 URL。底部组件也使用类似查询 URL，且年份硬编码为 2026。

## 修复方案

- 从 `ArticleLayout.astro` 移除 `RelatedSessions` import、props 消费与 footer 渲染，只保留 MDX 正文中的「相关 Session」。
- 从文章页调用处移除 `relatedSessions` 传参。
- 删除已无引用的 `web/src/components/RelatedSessions.astro`，避免硬编码查询页链接继续误用。
- 将 `scripts/batch-convert-articles.mjs` 生成的相关 Session 链接改为 `/articles/wwdc${year}-${code}`。
- 批量迁移已生成 MDX 中的 `/articles?year=YYYY&topic=all&search=CODE` 链接到 `/articles/wwdcYYYY-CODE`。

## 测试策略

- 新增 `test/wwdc-quick-look/web-article-related-sessions.test.js`，覆盖：
  - 文章布局不再引用/追加 `RelatedSessions` 或 `article-footer`。
  - 文章生成脚本生成具体文章页链接，而不是查询页链接。
- 运行项目单元测试与语法检查。
- 扫描已生成 MDX，确认旧查询页链接数量为 0。
- 运行 Astro web build，并检查构建后的示例文章页面。

## 验证结果

- `npm --prefix /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look test`：通过，51 个测试全部通过。
- `npm --prefix /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look run check`：通过。
- MDX 扫描：`remaining query links in MDX: 0`。
- `npm --prefix /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look/web run build`：构建完成并生成 `web/dist/articles/wwdc2026-369/index.html`。构建过程中存在既有 Shiki/CSS warning，但命令成功产出页面。
- 构建产物检查：`Related Sessions` 英文组件标题出现 0 次；「相关 Session」出现 1 次；旧查询链接不存在；具体详情页链接 `/articles/wwdc2026-209` 存在。

## 经验总结

生成内容与布局组件不能同时渲染同一语义区块；如果内容源已经包含「相关 Session」，布局层就不应再根据 frontmatter 追加同类 UI。内部跳转应优先使用稳定详情页路由，而不是列表筛选页 URL。
