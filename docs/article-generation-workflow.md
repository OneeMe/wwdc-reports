# WWDC Session 文章生成工作流

本文档记录如何批量生成 WWDC session 中文技术文章。

## 前置条件

- 已安装 Node.js
- 已配置 `skills/wwdc-quick-look/scripts/query.mjs` 数据查询脚本
- 已配置 `scripts/check-article-format.mjs` 格式检查脚本

## 生成流程

### 1. 准备 prompt 模板

参考 `scripts/agent-prompt-template.md`，确保包含：
- Highlight (blockquote)
- 核心内容（讲故事，从痛点切入）
- 详细内容（技术点 + 代码示例 + 时间戳）
- 核心启发（3-5 个可执行 feature 点）
- 关联 Session（3-5 个）

### 2. 获取 session 列表

```bash
cd /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look
node skills/wwdc-quick-look/scripts/query.mjs list-sessions --year 2026
```

### 3. 批量生成（用 Claude Code Workflow）

启动并行 agent 生成所有文章：

```bash
# 每个 agent 处理一个 session：
# 1. 读取 prompt 模板
# 2. 运行 query.mjs 获取元数据、代码片段、resources、transcript
# 3. 按模板生成文章
# 4. 写入 projects/learning/wwdc/src/content/wwdc2026/{code}.md
```

参数：
- `--year {YYYY}`: WWDC 年份
- `--code {code}`: Session 编号
- `--limit 50`: Transcript 预览行数（超过则取完整版）

### 4. 格式检查

```bash
cd /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look
node scripts/check-article-format.mjs \
  /Users/onee/Code/onee-workspace/projects/learning/wwdc/src/content/wwdc2026
```

检查项：
- [x] frontmatter 完整
- [x] 5 个必需章节存在
- [x] Highlight 是 blockquote
- [x] 无 AI 风格短语
- [x] 核心内容有故事感
- [x] 详细内容有代码示例（技术 session）
- [x] 核心启发 ≥3 个 feature 点
- [x] 关联 Session 3-5 个

### 5. 自动修复

```bash
# 修复 AI 风格短语和 Highlight 格式
node scripts/fix-article-format.mjs \
  /Users/onee/Code/onee-workspace/projects/learning/wwdc/src/content/wwdc2026
```

### 6. 人工修复剩余问题

对检查失败的文件，启动修复 agent：
- 补充"核心启发"feature 点
- 补充"详细内容"代码示例
- 重写缺失章节

### 7. 验证

重复步骤 4，直到通过率为 100%。

## 特殊 Session 处理

| 类型 | 示例 | 处理方式 |
|------|------|----------|
| Keynote | 101, 121 | 无代码，聚焦产品特性 |
| ASL 版本 | 111, 112 | 占位文章，链接到主 session |
| Recap | 122 | 浓缩版，简要列出要点 |
| Design | 250, 251 | 无代码，聚焦设计原则 |
| Business | 391, 379 | 无代码，聚焦商业策略 |
| Group Lab | 8001+ | 无需生成 |

## 输出目录

```
projects/learning/wwdc/src/content/wwdc2026/
├── {code}.md      # 文章文件
└── ...
```

## 相关文件

- `scripts/agent-prompt-template.md` — Agent 生成提示模板
- `scripts/article-writer-prompt.md` — 文章写作规范
- `scripts/check-article-format.mjs` — 格式检查脚本
- `scripts/fix-article-format.mjs` — 自动修复脚本
