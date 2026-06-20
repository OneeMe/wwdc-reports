export const meta = {
  name: 'generate-wwdc-articles-v3',
  description: '每个 session 独立流水线：生成 → 校验 → 反馈 → 修改 → 重新校验',
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

  // 每个 session 的完整流水线（带反馈循环）
  async function processSession(code) {
    const filePath = `${ARTICLES_DIR}/wwdc${yy}-${code}.mdx`
    let finalStatus = 'unknown'
    let attempts = 0
    let lastErrors = []

    // 首次生成
    attempts = 1
    const initResult = await agent(
      `为 WWDC${year} session ${code} 生成中文技术文章。

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
4. ⚠️ **章节名称必须完全一致**：使用 \`## 核心内容\`、\`## 详细内容\`、\`## 核心启发\`、\`## 关联 Session\`

完成后只输出"已生成：wwdc${yy}-${code}.mdx"。`,
      { label: `gen:${code}` }
    )

    // 反馈循环：校验 → 修改 → 重新校验
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // 校验 Stage
      const checkResult = await agent(
        `检查文章 ${filePath} 的格式。

运行以下命令：
\`\`\`bash
node scripts/check-article-format.mjs ${filePath}
\`\`\`

**返回格式：**
- 如果通过（包含 ✅），只返回 "PASS"
- 如果失败（包含 ❌），提取所有错误信息，每行一个错误，格式为 "ERROR: 错误描述"`,
        { label: `check:${code}:${attempt}` }
      )

      if (checkResult?.includes('PASS')) {
        finalStatus = 'pass'
        lastErrors = []
        break
      }

      // 提取错误信息
      const errors = checkResult?.split('\n')
        .map(line => line.match(/ERROR:\s*(.+)/)?.[1] || line.match(/-\s*(.+)/)?.[1])
        .filter(Boolean) || []

      lastErrors = errors.slice(0, 5) // 只保留前 5 个错误
      log(`${code} 第 ${attempt + 1} 次校验失败: ${lastErrors.join('; ')}`)

      // 如果最后一次尝试都失败了，就不再修改
      if (attempt >= MAX_RETRIES) {
        break
      }

      // 修改 Stage：根据错误信息修改文章
      attempts++
      const fixResult = await agent(
        `文章 ${filePath} 格式检查失败，需要修改。

**错误信息：**
${lastErrors.map(e => `- ${e}`).join('\n')}

**修改要求：**
1. 读取当前文章内容
2. 根据上述错误信息，修改文章中对应的部分
3. 不要改变文章的核心内容和风格，只修复格式问题
4. 确保章节名称完全正确：\`## 核心内容\`、\`## 详细内容\`、\`## 核心启发\`、\`## 关联 Session\`
5. 如果错误是"缺少某个章节"，添加该章节（内容可以从 transcript 或文章其他部分提取）
6. 如果错误是"包含 AI 风格短语"，找到并替换这些短语
7. 修改完成后重新写入文件

完成后只输出"已修改：wwdc${yy}-${code}.mdx"。`,
        { label: `fix:${code}:${attempt}` }
      )

      if (!fixResult?.includes('已修改')) {
        log(`${code} 修改失败`)
      }
    }

    return {
      code,
      status: finalStatus,
      attempts,
      lastErrors: finalStatus === 'fail' ? lastErrors : []
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
  const failed = results.filter(r => r.status !== 'pass')

  log(`流水线完成：`)
  log(`  ✅ 通过: ${passed.length}`)
  log(`  ❌ 失败: ${failed.length}`)

  if (failed.length > 0) {
    log(`失败详情：`)
    for (const r of failed) {
      log(`  - ${r.code}: ${r.lastErrors.join(', ')} (尝试 ${r.attempts} 次)`)
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
