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

// 主执行函数
async function main() {
  // 参数验证
  const year = args?.year || 2023
  const yy = String(year).slice(-2)

  // Phase 1: 格式检查，识别需要处理的文件
  phase('检查')

  log(`检查 WWDC${year} 现有文章格式...`)

  // 使用 agent 读取失败文件列表
  const checkResult = await agent(
    `读取文件 /tmp/wwdc${year}-failed.txt 的内容，每行是一个数字代码。

只输出数字代码列表，每行一个，如：
101
102
103

如果文件不存在或为空，输出"空"。`
  )

  // 解析检查结果
  let targetCodes = []
  let isFullGeneration = false

  if (checkResult !== '空' && checkResult.trim().length > 0) {
    targetCodes = checkResult
      .split('\n')
      .map(line => line.match(/^\d+/)?.[0])
      .filter(Boolean)
      .map(code => parseInt(code, 10))
      .filter(code => code > 0 && code < 8000)
    log(`需要重新生成 ${targetCodes.length} 篇文章`)
  } else {
    log(`没有需要处理的文件`)
    return { skipped: 0, year: year, status: 'no-work' }
  }

  // Phase 2: 读取 prompt 模板
  phase('读取模板')

  const templateResult = await agent(
    `读取文件 scripts/agent-prompt-template.md 的完整内容。

只输出文件原文，不要解释或修改。`
  )

  const promptBase = templateResult
    .replaceAll('{YEAR}', year)
    .replaceAll('{YY}', yy)

  // Phase 3: 并行生成文章（限制并发为 2）
  phase('生成')

  const results = []
  const CONCURRENCY = 2

  for (let i = 0; i < targetCodes.length; i += CONCURRENCY) {
    const batch = targetCodes.slice(i, i + CONCURRENCY)
    const batchResults = await pipeline(
      batch,
      code => agent(
        `为 WWDC${year} session ${code} 生成/重新生成中文技术文章。

**写作要求：**

${promptBase.replaceAll(/\{CODE\}/g, code)}

**数据获取（必须先执行）：**

\`\`\`bash
# session 元数据
node skills/wwdc-quick-look/scripts/query.mjs show-session --year ${year} --code ${code}

# 代码片段
node skills/wwdc-quick-look/scripts/query.mjs code --year ${year} --code ${code}

# Resources
node skills/wwdc-quick-look/scripts/query.mjs resources --year ${year} --code ${code}

# 逐字稿
node skills/wwdc-quick-look/scripts/query.mjs transcript --year ${year} --code ${code} --limit 100
\`\`\`

**任务：**

1. 运行上述命令获取数据
2. 生成 .mdx 文件
3. 写入 ${ARTICLES_DIR}/wwdc${yy}-${code}.mdx
4. 确保通过格式检查（检查脚本已能识别 Keynote/Overview/Design 等无代码 session）

完成后只输出"已生成：wwdc${yy}-${code}.mdx"。`,
        { label: `${code}` }
      )
    )
    const filteredResults = batchResults.filter(r => r)
    results.push(...filteredResults)
  }

  log(`已处理 ${results.length} 篇文章`)

  // Phase 4: 最终验证
  if (args.verify !== false) {
    phase('验证')

    const recheckResult = await agent(
      `运行格式检查验证 WWDC${year} 文章：

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
    year: year,
    mode: isFullGeneration ? 'full' : 'incremental',
    status: 'done'
  }
}

// 执行主函数
main()
