---
name: wwdc-writer
description: |
  生成 WWDC session 深度分析文章。当用户说"写一篇文章""生成 WWDC 文章""写一篇 session 分析"
  "写 wwdc2026-xxx""写 {code}""写 {year} {code}""写 {session} 的解读""写一篇关于 {session} 的文章"
  时触发。用阮一峰风格（简洁、代码驱动、事实优先）产出可直接发布的 `.mdx` 文件。
---

# WWDC Writer

将 WWDC session 的原始资料（代码片段、Resources、逐字稿）转化为开发者可以直接阅读的中文技术文章。

## 触发条件

用户明确要求生成/撰写/写作 WWDC session 文章时触发：

- "写一篇文章关于 WWDC26 session 102"
- "生成 wwdc2026-203"
- "写一篇 121 的分析"
- "写 {year} {code}"
- "写 {session} 的解读"

**不要**在以下场景触发：
- 用户只是问 session 讲了什么（用 wwdc-quick-look 查询即可）
- 用户只是要代码片段（用 wwdc-quick-look `code` 命令）
- 用户只是搜索 session（用 wwdc-quick-look `search` 命令）

## 工作流

### Step 1: 确认目标

如果用户没有明确提供年份和 code，询问确认：
- 哪一年的 WWDC？
- 哪个 session code？

### Step 2: 收集资料

用当前项目下 skills 下的 `wwdc-quick-look` skill 的 query 脚本收集：

```bash
# session 元数据（标题、描述、主题、链接）
node .agents/skills/wwdc-quick-look/scripts/query.mjs show-session --year {YYYY} --code {code}

# 代码片段（Code tab）
node .agents/skills/wwdc-quick-look/scripts/query.mjs code --year {YYYY} --code {code}

# Resources 链接
node .agents/skills/wwdc-quick-look/scripts/query.mjs resources --year {YYYY} --code {code}

# 逐字稿（用于找时间戳和事实依据）
node .agents/skills/wwdc-quick-look/scripts/query.mjs transcript --year {YYYY} --code {code}
```

### Step 3: 读取写作 Prompt

读取 `reference/prompt.md` 获取完整的写作规则：

```bash
cat .agents/skills/wwdc-writer/reference/prompt.md
```

### Step 4: 生成文章（子 Agent）

将收集到的资料和 prompt 规则一起喂给子 agent，让它按规则生成文章。

子 agent 的输入：
- prompt.md 的完整内容（系统提示）
- session 元数据
- 代码片段
- Resources
- 逐字稿（用于找时间戳）

子 agent 的输出：完整的 `.mdx` 文件内容。

### Step 5: 质量检查

生成完成后，运行检查：

```bash
# 检查 highlight 格式
node scripts/check-highlight.mjs

# 检查是否有本地 article（如果是增量生成）
node --test test/wwdc-quick-look/highlight-format.test.mjs
```

### Step 6: 写入文件

写入路径：`web/src/content/articles/wwdc{YY}-{code}.mdx`

```bash
echo "$CONTENT" > web/src/content/articles/wwdc{YY}-{code}.mdx
```

## 文章风格

参考阮一峰博客风格：
- 语言简洁、段落短小
- 代码驱动叙述
- 事实优先于观点
- 每个技术点配完整代码 + 逐行解释

禁止：
- "不是...而是..." 等 AI 风格短语
- "众所周知""非常强大""革命性"等空洞修辞
- 编造 API 或技术细节
- 没有代码示例的空泛总结

## 输出格式

生成的文章必须是完整的 `.mdx` 文件，包含 frontmatter：

```mdx
---
title: "Session 英文标题"
description: "session 原始描述"
date: YYYY-MM-DD
tags: ["主题1", "主题2"]
thumbnail: "/images/sessions/{YY}/{code}.jpg"
videoUrl: "https://developer.apple.com/videos/play/wwdc{YY}/{code}/"
sessionId: "wwdc{YY}-{code}"
year: "{YYYY}"
relatedSessions:
  - title: "相关 session"
    code: "xxx"
    description: "描述"
---
```

## 质量检查清单

文章生成后必须满足：

- [ ] Highlight 是一句话事实陈述，blockquote 格式
- [ ] 每个核心技术点都有视频时间戳
- [ ] 每个代码示例后都有"关键点"逐行解释
- [ ] 没有 AI 风格短语（"不是...而是..."、"众所周知"等）
- [ ] 没有编造的技术细节（所有描述都能在逐字稿/代码片段中找到依据）
- [ ] relatedSessions 选择 3-5 个真正相关的 session
- [ ] 能通过 highlight-format 测试
