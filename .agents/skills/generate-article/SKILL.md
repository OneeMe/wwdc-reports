---
name: generate-article
description: |
  批量生成 WWDC session 中文技术文章。当用户说"生成文章""写 WWDC 文章"
  "生成 {year} 年文章""生成 wwdc{year}""批量生成 session""开始生成"
  "继续生成"时触发。按模板产出 `.mdx` 文件到 web/src/content/articles/。
---

# WWDC 文章生成器

批量生成指定年份所有 WWDC session 的中文技术文章，输出到 `web/src/content/articles/`。

## 触发条件

用户明确要求生成 WWDC session 文章时触发：

- "生成 2025 年 WWDC 文章"
- "写所有 2024 的 session"
- "继续生成"
- "批量生成 wwdc2026"
- "开始文章生成"

## 不支持的场景

- 查询单个 session 信息（用 wwdc-quick-look skill）
- 只想看代码片段（用 wwdc-quick-look `code` 命令）
- 搜索 session（用 wwdc-quick-look `search` 命令）

## 工作流

### Step 1: 确认年份

如果用户没有明确年份，询问确认。

### Step 2: 获取 session 列表

```bash
cd /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look
node skills/wwdc-quick-look/scripts/query.mjs list-sessions --year {YYYY}
```

排除 Group Lab（code >= 8000）。

### Step 3: 读取 prompt 模板

```bash
cat .agents/skills/generate-article/reference/prompt.md
```

将 `{YYYY}` 和 `{YY}` 替换为实际年份。

### Step 4: 批量生成（Session 级 Agent Workflow）

**必须每个 session 启动一个独立 writer agent**，不要让一个 agent 连续生成整年文章。年级别循环容易退化成模板套壳。

```
对每个 session code：
  1. 启动独立 writer agent，只处理这一个 session
  2. writer 运行 query.mjs 获取元数据、代码片段、resources、transcript
  3. writer 读取已有 web/src/content/articles/wwdc{YYYY}-{code}.mdx（如果存在）
  4. writer 按 prompt.md 模板生成/更新文章：基于 transcript/code 做 session-specific 写作，禁止模板套壳
  5. 如果已有 Highlight，默认保留；只有新 Highlight 明确更好并能说明原因才替换
  6. 写入 web/src/content/articles/wwdc{YYYY}-{code}.mdx（不要新建两位年份格式）
  7. writer 完成后，启动另一个独立 reviewer agent 审查该 session
  8. reviewer PASS 后才算该 session 完成；FAIL 则打回同一个 session writer 修复
```

并发可以按批次进行（例如 5-10 个 session 同时跑），但**职责粒度必须是单 session**。

### Step 5: 格式检查

```bash
node scripts/check-article-format.mjs web/src/content/articles/
```

### Step 6: 修复失败文件

- 运行 `scripts/fix-article-format.mjs` 自动修复
- 对剩余失败文件启动修复 agent
- 重复检查直到通过

### Step 7: 提交

```bash
git add web/src/content/articles/wwdc{YYYY}-*.mdx
git commit -m "feat(articles): 生成 WWDC{YYYY} session 文章"
```

## 输出路径

```
web/src/content/articles/wwdc{YYYY}-{code}.mdx
```

## 相关文件

| 文件 | 作用 |
|------|------|
| `reference/prompt.md` | Agent 写作模板 |
| `scripts/check-article-format.mjs` | 格式检查（8 项规则） |
| `scripts/fix-article-format.mjs` | 自动修复 AI 风格短语 |
| `scripts/migrate-articles.mjs` | 从 git 历史批量迁移 |
| `docs/article-generation-workflow.md` | 完整流程文档 |

## 质量检查清单

- [ ] Highlight 是 blockquote，一句话事实陈述；已有文章默认保留原 Highlight，除非新版本明确更好
- [ ] 核心内容有讲故事的代入感（≥2 段），且不是跨 session 复用的模板句
- [ ] 详细内容有代码示例（技术 session）或 transcript 中的具体工作流/设计原则（无代码 session）
- [ ] 每个代码示例后都有"关键点"解释
- [ ] 核心启发 ≥3 个可执行 feature 点，且必须来自该 session 的具体内容
- [ ] 关联 Session 3-5 个，必须是真正相关的同主题/前后置/共享框架 session
- [ ] 无 AI 风格短语
- [ ] 无编造技术细节或代码；代码块必须来自 query.mjs code 或 transcript 明确支持
- [ ] 文件名和 sessionId 使用 `wwdc{YYYY}-{code}` 四位年份格式
- [ ] 每篇文章由独立 writer agent 处理，并由另一个独立 reviewer agent PASS
