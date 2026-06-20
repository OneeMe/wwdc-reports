export const meta = {
  name: 'generate-wwdc-articles-pipeline',
  description: '为每个 WWDC session 独立运行生成-校验-重试流水线',
  phases: [
    { title: '流水线执行', detail: '并行处理每个 session 的完整流水线' },
    { title: '汇总', detail: '统计最终结果' },
  ],
}

const ARTICLES_DIR = 'web/src/content/articles'
const MAX_RETRIES = 2

async function main() {
  const year = args?.year || 2023
  const yy = String(year).slice(-2)
  const codes = args?.codes || []
  const promptBase = args?.prompt || ''

  if (codes.length === 0) {
    log('错误：没有提供需要生成的 session code 列表')
    return { status: 'error', reason: 'no-codes' }
  }

  if (!promptBase) {
    log('错误：没有提供 prompt 模板')
    return { status: 'error', reason: 'no-prompt' }
  }

  log(`开始处理 ${codes.length} 个 WWDC${year} session`)

  // 每个 session 的完整流水线
  async function processSession(code) {
    const filePath = `${ARTICLES_DIR}/wwdc${yy}-${code}.mdx`
    let finalStatus = 'unknown'
    let attempts = 0
    let lastError = ''

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      attempts = attempt + 1

      // Stage 1: 生成文章
      const generateResult = await agent(
        `为 WWDC${year} session ${code} 重新生成中文技术文章。

**写作要求：**

${promptBase}

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
        { label: `gen:${code}:${attempt}` }
      )

      // 检查是否生成成功
      if (!generateResult?.includes('已生成')) {
        lastError = '生成失败'
        continue
      }

      // Stage 2: 校验格式
      const checkResult = await agent(
        `检查文章 ${filePath} 的格式。

运行以下命令：
\`\`\`bash
node scripts/check-article-format.mjs ${filePath}
\`\`\`

如果输出包含 "✅"，返回 "PASS"。
如果输出包含 "❌"，返回 "FAIL" 后面跟具体的错误信息（从 "- " 开头的行提取）。`,
        { label: `check:${code}:${attempt}` }
      )

      if (checkResult?.includes('PASS')) {
        finalStatus = 'pass'
        lastError = ''
        break
      } else {
        // 提取错误信息
        const errorLines = checkResult?.match(/-\s*(.+)/g) || []
        lastError = errorLines.slice(0, 3).join('; ') || '格式检查失败'
        log(`${code} 第 ${attempt + 1} 次尝试失败: ${lastError}`)
      }
    }

    return {
      code,
      status: finalStatus,
      attempts,
      lastError: finalStatus === 'fail' ? lastError : ''
    }
  }

  // 并行执行所有 session 流水线
  phase('流水线执行')

  const CONCURRENCY = 5
  const results = []

  for (let i = 0; i < codes.length; i += CONCURRENCY) {
    const batch = codes.slice(i, i + CONCURRENCY)
    const batchResults = await parallel(
      batch.map(code => () => processSession(code))
    )
    results.push(...batchResults)
  }

  // 汇总结果
  phase('汇总')

  const passed = results.filter(r => r.status === 'pass')
  const failed = results.filter(r => r.status === 'fail' || r.status === 'unknown')

  log(`流水线完成：`)
  log(`  ✅ 通过: ${passed.length}`)
  log(`  ❌ 失败: ${failed.length}`)

  if (failed.length > 0) {
    log(`失败详情：`)
    for (const r of failed) {
      log(`  - ${r.code}: ${r.lastError || '未知错误'} (尝试 ${r.attempts} 次)`)
    }
  }

  return {
    total: results.length,
    passed: passed.length,
    failed: failed.length,
    failedCodes: failed.map(r => r.code),
    year,
    status: 'done'
  }
}

await main()
