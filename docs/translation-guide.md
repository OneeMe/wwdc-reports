# WWDC 文章翻译指南

本文说明如何将中文 WWDC session 文章翻译为英文和日文，并通过自动化检查验收。

## 目录结构

```
web/src/content/articles/
├── wwdc{YYYY}-{code}.mdx      # 中文源文（默认 zh）
├── en/wwdc{YYYY}-{code}.mdx   # 英文
└── ja/wwdc{YYYY}-{code}.mdx   # 日文
```

- 命名固定为 `wwdc{四位年份}-{sessionCode}.mdx`，例如 `wwdc2024-10065.mdx`
- 站点路由：`/articles/{slug}`（中文）、`/en/articles/{slug}`、`/ja/articles/{slug}`

## 单篇翻译流程

```
读取中文源文 → 翻译 EN / JA → 运行 check-translation → PASS 后提交
```

### 1. 读取源文

```bash
# 中文源文
web/src/content/articles/wwdc2024-10065.mdx
```

### 2. 写入译文

| 语言 | 输出路径 |
|------|----------|
| 英文 | `web/src/content/articles/en/wwdc2024-10065.mdx` |
| 日文 | `web/src/content/articles/ja/wwdc2024-10065.mdx` |

### 3. 验收（必须通过）

```bash
# 单篇
node web/scripts/check-translation.mjs --file en/wwdc2024-10065.mdx
node web/scripts/check-translation.mjs --file ja/wwdc2024-10065.mdx

# 按年份
node web/scripts/check-translation.mjs --year 2024 --lang en

# 仅 git 变更的文件
node web/scripts/check-translation.mjs --changed

# 或使用 npm script
npm run check:translation --prefix web
```

**退出码 0 = 全部 PASS；退出码 1 = 存在 FAIL。**

## 章节标题映射

| 中文（源） | English | 日本語 |
|-----------|---------|--------|
| Highlight | Highlight | ハイライト |
| 核心内容 | Core Content | 主要内容 |
| 详细内容 | Detailed Content | 詳細 |
| 核心启发 | Core Takeaways | 重要ポイント |
| 关联 Session | Related Sessions | 関連セッション |
| 关键点： | Key points: | キーポイント: |

## 翻译规则

### 必须保留不变

- frontmatter 的 `title`、`description`（Apple 官方英文）
- 所有 \`\`\` 代码块与 inline code 内容
- `videoUrl`、`sessionId`、`thumbnail`、时间戳链接 `[MM:SS](url)`
- `relatedSessions` 中 frontmatter 的 `title` / `description`（Apple metadata）

### 必须翻译

- `## Highlight` 下的 blockquote
- 所有正文段落、子标题（`###`）、列表
- frontmatter `tags`（若含中文）
- 正文区「关联 Session」列表中的说明文字

### 禁止事项

- 不要重写或增删技术内容，只做翻译
- 不要翻译代码块内的代码
- 不要用 Machine Translation 批量处理整文件（会破坏 MDX 结构）

## 验收标准（简化 review）

**不做翻译质量审校**，只检查译文中是否残留中文：

| 规则 | 说明 |
|------|------|
| 占位检测 | 译文正文与中文 hash 相同 → FAIL |
| 中文章节标题 | 出现 `## 核心内容` 等 → FAIL |
| Highlight | blockquote 内为中文摘要 → FAIL |
| EN 正文 | 去掉 frontmatter 和代码块后，CJK 字符 > 15 → FAIL |
| JA 正文 | CJK 过多且假名不足 → FAIL（日文汉字与中文重叠，用假名密度辅助判断） |

## 参考样例

已完成且通过检查的文章可作为风格参考：

| 语言 | 样例 |
|------|------|
| EN | `web/src/content/articles/en/wwdc2024-10060.mdx` |
| EN | `web/src/content/articles/en/wwdc2026-322.mdx` |
| JA | `web/src/content/articles/ja/wwdc2026-322.mdx` |

Agent 翻译 prompt 模板：`.agents/skills/translate-article/reference/prompt.md`

## 进度查看

```bash
# 总览
node web/scripts/count-translation-status.mjs

# JSON 输出
node web/scripts/count-translation-status.mjs --json

# 列出某年待译清单
node web/scripts/count-translation-status.mjs --list-remaining 2023 en
node web/scripts/count-translation-status.mjs --list-remaining 2023 ja
```

## 批量翻译建议

| 参数 | 建议 |
|------|------|
| 每批 session 数 | 5–10 篇 |
| 并发 agent 数 | 5–8 个 |
| 单篇职责 | 1 agent 处理 1 session 的 EN + JA |
| 提交粒度 | 按年+批次，如 `feat(i18n): translate WWDC2023 articles batch 1 to EN and JA` |
| 批次门禁 | 每批完成后运行 `check-translation --changed` |

## 推进顺序

按年份倒序（新 → 旧）：

1. 2026 JA 收尾 → 2025 JA 收尾
2. **2023** → **2022** → **2021** → **2020**（EN + JA 同步推进）

## 相关文件

| 文件 | 用途 |
|------|------|
| `docs/translation-plan.md` | 分阶段计划与进度概览 |
| `web/scripts/check-translation.mjs` | 单篇/批次验收 |
| `web/scripts/count-translation-status.mjs` | 宏观进度统计 |
| `.agents/skills/translate-article/reference/prompt.md` | Agent 翻译 prompt |
