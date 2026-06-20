export const meta = {
  name: 'generate-wwdc-articles',
  description: '批量生成 WWDC session 中文技术文章',
  phases: [
    { title: '生成', detail: '并行生成待处理文章' },
    { title: '校验', detail: '检查文章格式并重试' },
  ],
}

const ARTICLES_DIR = 'web/src/content/articles'

async function main() {
  const year = args?.year || 2023
  const yy = String(year).slice(-2)

  // 从 args 获取失败文件列表和 prompt 模板
  const targetCodes = args?.codes || []
  const promptBase = args?.prompt || ''

  if (targetCodes.length === 0) {
    log('错误：没有提供需要生成的 session code 列表')
    return { status: 'error', reason: 'no-codes' }
  }

  if (!promptBase) {
    log('错误：没有提供 prompt 模板')
    return { status: 'error', reason: 'no-prompt' }
  }

  log(`需要生成 ${targetCodes.length} 篇 WWDC${year} 文章`)

  // 并行生成文章
  phase('生成')

  const results = []
  const CONCURRENCY = 5

  for (let i = 0; i < targetCodes.length; i += CONCURRENCY) {
    const batch = targetCodes.slice(i, i + CONCURRENCY)
    const batchResults = await pipeline(
      batch,
      code => agent(
        `为 WWDC${year} session ${code} 重新生成中文技术文章。

**写作要求：**

${promptBase.replaceAll(/\{CODE\}/g, code)}

**数据获取（必须先执行）：**

\`\`\`bash
node skills/wwdc-quick-look/scripts/query.mjs show-session --year ${year} --code ${code}
node skills/wwdc-quick-look/scripts/query.mjs code --year ${year} --code ${code}
node skills/wwdc-quick-look/scripts/query.mjs resources --year ${year} --code ${code}
node skills/wwdc-quick-look/scripts/query.mjs transcript --year ${year} --code ${code} --limit 100
\`\`\`

**任务：**
1. 运行上述命令获取数据
2. 按模板格式生成完整 .mdx 文件
3. 写入 ${ARTICLES_DIR}/wwdc${yy}-${code}.mdx
4. ⚠️ **章节名称必须完全一致**：使用 \`## 核心内容\`、\`## 详细内容\`、\`## 核心启发\`、\`## 关联 Session\`（不要用编号或自定义名称）
5. 禁止 AI 风格短语（"不是...而是..."、"不仅...而且..."、"总而言之"等）

完成后只输出"已生成：wwdc${yy}-${code}.mdx"。`,
        { label: `${code}` }
      )
    )
    results.push(...batchResults.filter(r => r))
  }

  log(`已生成 ${results.length}/${targetCodes.length} 篇文章`)

  // 校验格式
  phase('校验')
  const checkResults = []
  const MAX_RETRIES = 2

  for (const code of targetCodes) {
    const filePath = `${ARTICLES_DIR}/wwdc${yy}-${code}.mdx`
    let retries = 0
    let passed = false

    while (retries <= MAX_RETRIES && !passed) {
      // 运行格式检查
      const checkResult = await agent(
        `检查文章 ${filePath} 的格式，运行：
\`\`\`bash
node scripts/check-article-format.mjs ${filePath}
\`\`\`
如果检查通过（输出 ✅），返回 "PASS"。
如果检查失败（输出 ❌），分析失败原因，然后重新生成这篇文章。
重新生成时使用相同的写作要求，但确保修复失败的问题。
完成后返回 "REGENERATED" 或 "FAIL"。`,
        { label: `check:${code}` }
      )

      if (checkResult?.includes('PASS')) {
        passed = true
        checkResults.push({ code, status: 'pass', retries })
      } else if (retries < MAX_RETRIES) {
        retries++
        log(`${code} 格式检查失败，重试 ${retries}/${MAX_RETRIES}`)
      } else {
        checkResults.push({ code, status: 'fail', retries })
        log(`${code} 格式检查失败，已达最大重试次数`)
      }
    }
  }

  const passCount = checkResults.filter(r => r.status === 'pass').length
  const failCount = checkResults.filter(r => r.status === 'fail').length

  log(`校验完成：通过 ${passCount}/${targetCodes.length}，失败 ${failCount}`)

  return {
    processed: results.length,
    total: targetCodes.length,
    year,
    passed: passCount,
    failed: failCount,
    status: 'done'
  }
}

await main()
