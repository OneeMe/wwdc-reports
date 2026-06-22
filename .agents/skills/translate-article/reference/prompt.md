# WWDC 文章翻译 Prompt

将中文 MDX 翻译为 EN 或 JA。只做翻译，不重写内容。

## 输入
- 中文源文：`web/src/content/articles/wwdc{YYYY}-{code}.mdx`
- 目标语言：`en` 或 `ja`

## 输出
- EN: `web/src/content/articles/en/wwdc{YYYY}-{code}.mdx`
- JA: `web/src/content/articles/ja/wwdc{YYYY}-{code}.mdx`

## 章节映射

| 中文 | English | 日本語 |
|------|---------|--------|
| Highlight | Highlight | ハイライト |
| 核心内容 | Core Content | 主要内容 |
| 详细内容 | Detailed Content | 詳細 |
| 核心启发 | Core Takeaways | 重要ポイント |
| 关联 Session | Related Sessions | 関連セッション |
| 关键点： | Key points: | キーポイント: |

## 必须保留不变
- frontmatter 的 `title`、`description`（Apple 官方英文）
- 所有 fenced code block 与 inline code
- `videoUrl`、`sessionId`、`thumbnail`、时间戳链接
- `relatedSessions` 的 `title`/`description`（已是英文 metadata）

## 必须翻译
- Highlight blockquote
- 所有正文段落、子标题、列表
- frontmatter `tags`（如有中文）
- 关联 Session 正文区的 description 与链接说明文字

## 验收
```bash
node web/scripts/check-translation.mjs --file en/wwdc{YYYY}-{code}.mdx
node web/scripts/check-translation.mjs --file ja/wwdc{YYYY}-{code}.mdx
```
PASS = 无中文章节标题、Highlight 非中文、正文 CJK 低于阈值。
