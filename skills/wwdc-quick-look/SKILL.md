---
name: wwdc-quick-look
description: |
  快速查询 Apple WWDC 历年 session 信息。当用户提到"WWDC"、"session"、"苹果开发者大会"、
  "WWDC 有什么新内容"、"找关于 Swift 的 session"、"某个 session 讲了什么"、
  "WWDC 视频"、"WWDC 演讲"、"Apple 新特性"、"今年的 WWDC"、"有没有示例代码"、
  "demo 工程"、"sample code"、"Code tab"、"Resources 链接"等任何与 WWDC session
  相关的查询时触发。从 jsDelivr CDN 获取公开的 metadata、资源链接、代码片段和逐字稿，
  支持按年份、主题、关键词过滤，并能查看单条 session 的示例代码与资源。不需要 API key，
  不需要 Apple Developer 账号。数据每天自动更新。
---

# WWDC Quick Look

让用户快速了解 Apple WWDC 发布了哪些 session，无需离开对话即可浏览主题、搜索关键词、
查看详情、Resources 链接、Code tab 代码片段和逐字稿。

## 数据来源

所有数据来自 `https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/`，
由 GitHub Actions 每日自动刷新：

- `index.json` — 可用年份目录
- `wwdc{YY}/raw_data.json` — 该年所有 session 的元数据，包含 `resources` 和 `codeSnippets`
- `wwdc{YY}/transcripts-{locale}/{code}.txt` — 单条逐字稿

`raw_data.json` 的单个 session 可能包含：

- `resources` — Apple session 页面 Resources 区域的链接，例如文档、GitHub 仓库、demo/project 页面。
- `codeSnippets` — Apple session 页面 Code tab 的时间点代码片段，包含标题、时间、跳转 URL 和代码正文。

## 核心能力

运行同目录下的 `scripts/query.mjs` 脚本来完成查询：

```bash
# 列出所有可用年份
node skills/wwdc-quick-look/scripts/query.mjs list-years

# 列出某年的所有主题分类
node skills/wwdc-quick-look/scripts/query.mjs list-topics --year 2025

# 列出某年的所有 session
node skills/wwdc-quick-look/scripts/query.mjs list-sessions --year 2025

# 按主题过滤 session
node skills/wwdc-quick-look/scripts/query.mjs filter-topic --year 2025 --topic "Swift"

# 关键词搜索（匹配标题、描述、资源标题/URL、代码片段标题/内容）
node skills/wwdc-quick-look/scripts/query.mjs search --year 2025 --keyword "privacy"

# 查看单个 session 详情
node skills/wwdc-quick-look/scripts/query.mjs show-session --year 2025 --code 238

# 查看单个 session 的 Resources 链接
node skills/wwdc-quick-look/scripts/query.mjs resources --year 2025 --code 238

# 查看单个 session 的 Code tab 代码片段（可加 --limit N 限制片段数）
node skills/wwdc-quick-look/scripts/query.mjs code --year 2025 --code 238 --limit 3

# 读取逐字稿（可加 --limit N 限制行数）
node skills/wwdc-quick-look/scripts/query.mjs transcript --year 2025 --code 238 --limit 20
```

## 交互策略

### 用户提到 WWDC 但没有指定年份
先运行 `list-years` 展示可用年份，然后询问用户想看哪一年。

### 用户提到具体主题（如 Swift、visionOS、AI）
用 `filter-topic` 或 `search` 找到相关 session，用 Markdown 表格呈现结果。
表格包含：Code | Title | Topic | Description（截断到 120 字符）。

### 用户想看某个 session 的详情
用 `show-session` 获取完整信息，包括标题、描述、主题、Apple Developer 视频链接，以及资源数量、
代码片段数量。若输出里显示有 `resources` 或 `codeSnippets`，再按用户意图调用 `resources`
或 `code` 展开。

### 用户想找示例代码、demo 工程、GitHub 仓库或 Resources 链接
先判断用户是否已经指定 session code：

- 已指定 code：用 `resources --year <year> --code <code>` 查看资源链接；如果用户明确要代码片段，
  用 `code --year <year> --code <code>`。
- 未指定 code：用 `search --year <year> --keyword <关键词>` 搜索标题、描述、资源和代码片段。
  找到候选 session 后，用 `show-session` 或 `resources`/`code` 展开。

示例：用户问“WWDC25 Foundation Models 有没有 demo 工程？”先运行
`search --year 2025 --keyword "Foundation Models"`，再对相关 session 运行 `resources`。

### 用户想看 Code tab 代码片段
用 `code --year <year> --code <code>` 拉取。代码片段通常比 transcript 短，可以直接展示；
如果片段很多，先加 `--limit 3` 展示前几段，并说明可继续展开全部。

### 用户想看逐字稿
用 `transcript` 拉取。默认展示全文；如果逐字稿很长（超过 50 行），先用 `--limit 30`
展示开头，询问用户是否需要继续看完整内容。

### 用户问"今年 WWDC 有什么值得关注的"
1. 运行 `list-topics` 了解主题分布
2. 根据用户兴趣领域（如 AI、空间计算、Swift）用 `filter-topic` 或 `search` 深入
3. 给出 3-5 个重点 session 的简要总结

## 输出格式

所有查询结果直接以 Markdown 返回给用户。表格用于列表视图，结构化文本用于单条详情，
表格用于 Resources 链接，代码块用于 Code tab 片段和逐字稿。

**注意：** 数据来自 Apple Developer 公开页面，session 描述可能不完整（Apple 只提供摘要）。
`resources` 和 `codeSnippets` 只在 Apple 页面公开提供时存在；某些 session 可能没有示例代码或
demo 工程。如需完整上下文，引导用户访问 `webPermalink` 对应的 Apple 视频页面。
