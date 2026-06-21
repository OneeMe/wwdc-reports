# WWDC 文章翻译计划

## 进度概览

中文源文章共 1134 篇。查看实时进度请运行 `node web/scripts/count-translation-status.mjs`。

**翻译操作指南见 [translation-guide.md](./translation-guide.md)。**

已完成年份：2024 EN、2025 EN+JA、2026 EN。进行中：2023、2022、2021、2020。

查看实时进度：

```bash
node web/scripts/count-translation-status.mjs
# 或 JSON 输出
node web/scripts/count-translation-status.mjs --json
# 列出某年某语言待译文件
node web/scripts/count-translation-status.mjs --list-remaining 2024 en
```

## 分阶段顺序

按年份倒序推进，优先较新的 session：

1. **2024** → 2. **2023** → 3. **2022** → 4. **2021** → 5. **2020**

## 工作流程

1. 从中文源 `web/src/content/articles/wwdcYYYY-NNN.mdx` 翻译
2. 写入对应语言目录：
   - `web/src/content/articles/en/wwdcYYYY-NNN.mdx`
   - `web/src/content/articles/ja/wwdcYYYY-NNN.mdx`
3. 运行中文残留检查（**不做翻译质量审校**）：

```bash
# 检查全部
npm run check:translation --prefix web

# 只查英文 / 日文
node web/scripts/check-translation.mjs --lang en
node web/scripts/check-translation.mjs --lang ja

# 按年份
node web/scripts/check-translation.mjs --year 2024 --lang en

# 单篇
node web/scripts/check-translation.mjs --file wwdc2024-10149.mdx

# 仅 git 变更的文件
node web/scripts/check-translation.mjs --changed
```

检查规则（简单）：

- 正文不得保留中文小节标题（`## 核心内容`、`## 详细内容` 等）
- `## Highlight` 下不得是中文摘要
- 正文中 CJK 字符不得超过少量残留（如 API 名称）；超出即 FAIL

退出码 1 表示存在未通过的文件。
