export const meta = {
  name: 'generate-wwdc-articles',
  description: '批量生成 WWDC session 中文技术文章（智能跳过已通过检查的文件）',
  phases: [
    { title: '检查', detail: '格式检查，识别需要生成的文件' },
    { title: '生成', detail: '并行生成待处理文章' },
    { title: '验证', detail: '最终验证' },
  ],
}

const ARTICLES_DIR = 'web/src/content/articles'

// Phase 1: 格式检查，识别需要处理的文件
phase('检查')

log(`检查 WWDC${args.year} 现有文章格式...`)

const checkResult = await agent(
  `运行格式检查，统计 WWDC${args.year} 文章的通过/失败情况：

\`\`\`bash
node scripts/check-article-format.mjs ${ARTICLES_DIR} 2>&1 | grep -E 'wwdc${args.year.slice(-2)}-'
\`\`\`

输出格式：
- 如果全部通过：输出"全部通过，数量：N"
- 如果有失败：输出"需要修复：N 个"，然后列出文件名（每行一个，格式：wwdc${args.year.slice(-2)}-101.mdx）

**注意：**
- 如果目录为空（没有该年份文章），输出"目录为空"
- 只统计 WWDC${args.year} 的文件`
)

// 解析检查结果
let targetCodes = []
let isFullGeneration = false

if (checkResult.includes('目录为空')) {
  isFullGeneration = true
  log('目录为空，需要生成所有文章')

  // 获取所有 session code
  const listResult = await agent(
    `列出 WWDC${args.year} 所有 session 的 code 编号：

\`\`\`bash
node skills/wwdc-quick-look/scripts/query.mjs list-sessions --year ${args.year}
\`\`\`

只输出 code 列表，每行一个数字，如：
101
102

排除 code >= 8000（Group Lab）。`
  )

  targetCodes = listResult
    .split('\n')
    .map(line => line.match(/^(\d+)/)?.[1])
    .filter(Boolean)
    .map(code => parseInt(code, 10))
    .filter(code => code < 8000)

} else if (checkResult.includes('全部通过')) {
  const match = checkResult.match(/数量：(\d+)/)
  const count = match ? parseInt(match[1]) : 0
  log(`现有 ${count} 篇文章，格式检查全部通过，无需重新生成`)
  return { skipped: count, year: args.year, status: 'already-ok' }

} else if (checkResult.includes('需要修复')) {
  // 解析失败文件列表
  const fileMatch = checkResult.match(/(wwdc${args.year.slice(-2)}-\d+\.mdx)/g)
  if (fileMatch) {
    targetCodes = fileMatch
      .map(f => parseInt(f.match(/-(\d+)\.mdx/)?.[1] || '0', 10))
      .filter(code => code < 8000)
    log(`需要重新生成 ${targetCodes.length} 篇文章`)
  }
}

if (targetCodes.length === 0) {
  log('没有需要处理的文件')
  return { skipped: 0, year: args.year, status: 'no-work' }
}

// Phase 2: 读取 prompt 模板
phase('读取模板')

const templateResult = await agent(
  `读取文件 scripts/agent-prompt-template.md 的完整内容。

只输出文件原文，不要解释或修改。`
)

const promptBase = templateResult
  .replaceAll('{YEAR}', args.year)
  .replaceAll('{YY}', args.year.slice(-2))

// Phase 3: 并行生成文章
phase('生成')

const results = await pipeline(
  targetCodes,
  code => agent(
    `为 WWDC${args.year} session ${code} 生成/重新生成中文技术文章。

**写作要求：**

${promptBase.replaceAll(/\{CODE\}/g, code)}

**数据获取（必须先执行）：**

\`\`\`bash
# session 元数据
node skills/wwdc-quick-look/scripts/query.mjs show-session --year ${args.year} --code ${code}

# 代码片段
node skills/wwdc-quick-look/scripts/query.mjs code --year ${args.year} --code ${code}

# Resources
node skills/wwdc-quick-look/scripts/query.mjs resources --year ${args.year} --code ${code}

# 逐字稿
node skills/wwdc-quick-look/scripts/query.mjs transcript --year ${args.year} --code ${code} --limit 100
\`\`\`

**任务：**

1. 运行上述命令获取数据
2. 生成 .mdx 文件
3. 写入 ${ARTICLES_DIR}/wwdc${args.year.slice(-2)}-${code}.mdx
4. 确保通过格式检查（检查脚本已能识别 Keynote/Overview/Design 等无代码 session）

完成后只输出"已生成：wwdc${args.year.slice(-2)}-${code}.mdx"。`,
    { label: `${code}` }
  )
).filter(Boolean)

log(`已处理 ${results.length} 篇文章`)

// Phase 4: 最终验证
if (args.verify !== false) {
  phase('验证')

  const recheckResult = await agent(
    `运行格式检查验证 WWDC${args.year} 文章：

\`\`\`bash
node scripts/check-article-format.mjs ${ARTICLES_DIR} 2>&1 | tail -5
\`\`\`

只输出统计信息。`
  )

  if (recheckResult.includes('失败: 0') || recheckResult.includes('失败：0')) {
    log('格式验证：全部通过')
  } else {
    log(`验证结果：${recheckResult.trim()}`)
  }
}

return {
  processed: results.length,
  year: args.year,
  mode: isFullGeneration ? 'full' : 'incremental',
  status: 'done'
}
