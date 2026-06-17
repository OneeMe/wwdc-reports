#!/usr/bin/env node
/**
 * 检查 WWDC 文章是否符合模板格式要求
 * 用法: node check-article-format.mjs [--fix] <file-or-dir>
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = dirname(__dirname);

const AI_PHRASES = [
  /不是.+而是/,
  /不仅.+而且/,
  /一方面.+另一方面/,
  /总而言之/,
  /综上所述/,
  /总的来说/,
  /换言之/,
  /换句话说/,
  /也就是说/,
  /不难发现/,
  /显而易见/,
  /毫无疑问/,
  /毋庸置疑/,
  /可以看出/,
];

function findFiles(input) {
  const stats = statSync(input);
  if (stats.isFile()) return [input];
  if (stats.isDirectory()) {
    return readdirSync(input)
      .filter((f) => extname(f) === ".md" || extname(f) === ".mdx")
      .map((f) => join(input, f));
  }
  return [];
}

function checkFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const issues = [];
  const lines = content.split("\n");

  // 判断 session 类型
  const filename = basename(filePath).replace(".mdx", "").replace(".md", "");
  const sessionCode = filename.match(/\d+$/)?.[0] || "";
  const isASL = content.includes('title:') && content.match(/title:\s*".*ASL.*"/);
  const isRecap = content.includes("recapOf:") || content.includes('title:') && content.match(/title:\s*".*Recap.*"/i);
  const isGroupLab = parseInt(sessionCode) >= 8000;
  const isGetReady = content.includes('"Get ready') || content.includes('"Get Ready');
  const isDesign = content.includes('"Design"') || content.includes('"Design');
  const isBusiness = content.includes('"Business');
  const isGraphics = content.includes('Graphics');
  const isKeynote = content.includes('"Keynote"') || (content.includes('title:') && content.match(/title:\s*".*Keynote.*"/));
  const isStateOfTheUnion = content.includes('title:') && content.match(/title:\s*".*State of the Union.*"/i);
  const isOverview = content.includes('title:') && content.match(/title:\s*".*Overview.*"/i);
  const isNoCodeSession = isASL || isRecap || isGroupLab || isGetReady || isDesign || isBusiness || isGraphics || isKeynote || isStateOfTheUnion || isOverview;

  // 1. 检查 frontmatter
  if (!content.startsWith("---")) {
    issues.push("缺少 frontmatter");
  }

  // 2. 检查各章节存在（ASL 版本放宽要求）
  const requiredSections = [
    "## Highlight",
    "## 核心内容",
    "## 详细内容",
    "## 核心启发",
    "## 关联 Session",
  ];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      // ASL 版本允许缺少部分章节
      if (isASL && section !== "## Highlight") {
        continue;
      }
      issues.push(`缺少 ${section}`);
    }
  }

  // 3. 检查 Highlight 后是 blockquote
  const highlightIdx = lines.findIndex((l) => l.trim() === "## Highlight");
  if (highlightIdx >= 0) {
    const nextNonEmpty = lines
      .slice(highlightIdx + 1)
      .find((l) => l.trim() !== "");
    if (!nextNonEmpty || !nextNonEmpty.trim().startsWith("> ")) {
      issues.push("Highlight 后不是 blockquote (> )");
    }
  }

  // 4. 检查禁止的 AI 风格短语
  for (const phrase of AI_PHRASES) {
    const match = content.match(phrase);
    if (match) {
      issues.push(`包含 AI 风格短语: "${match[0]}"`);
      break; // 只报第一个
    }
  }

  // 5. 检查核心内容是否有讲故事的感觉（有"###"子标题或至少 2 段）
  const coreContentMatch = content.match(
    /## 核心内容([\s\S]*?)(?=## 详细内容)/
  );
  if (coreContentMatch) {
    const coreContent = coreContentMatch[1];
    const paragraphs = coreContent
      .split("\n\n")
      .filter((p) => p.trim().length > 20);
    if (paragraphs.length < 2) {
      issues.push("核心内容段落太少，缺少讲故事的感觉");
    }
  }

  // 6. 检查详细内容是否有代码块（特殊 session 放宽要求）
  const detailMatch = content.match(
    /## 详细内容([\s\S]*?)(?=## 核心启发)/
  );
  if (detailMatch && !isNoCodeSession) {
    const detail = detailMatch[1];
    if (!detail.includes("```")) {
      issues.push("详细内容缺少代码示例");
    }
  }

  // 7. 检查核心启发是否有具体 feature 点（至少有 3 个）
  const inspireMatch = content.match(
    /## 核心启发([\s\S]*?)(?=## 关联 Session)/
  );
  if (inspireMatch) {
    const inspire = inspireMatch[1];
    // 支持多种格式：- bullet、* bullet、**加粗标题**、### 子标题、**1. 数字标题**
    const bulletPoints = inspire.match(
      /^\s*(?:[-*]\s+|#{1,3}\s+|\*\*(?:\d+\.\s+)?[^*]+\*\*|\d+\.\s+\*\*[^*]+\*\*).*$/gm
    );
    if (!bulletPoints || bulletPoints.length < 3) {
      issues.push("核心启发缺少足够的可执行 feature 点（至少 3 个）");
    }
  }

  // 8. 检查关联 Session 数量
  const relatedMatch = content.match(
    /## 关联 Session([\s\S]*?)(?=\n## |\n---|\n*$)/
  );
  if (relatedMatch) {
    const related = relatedMatch[1];
    const links = related.match(/\[.+\]\(.+\)/g);
    if (!links || links.length < 3) {
      issues.push(`关联 Session 数量不足（只有 ${links?.length || 0} 个，需要 3-5 个）`);
    }
  }

  return { file: filePath, issues, ok: issues.length === 0 };
}

function main() {
  const args = process.argv.slice(2);
  const target =
    args.find((a) => !a.startsWith("-")) ||
    join(PROJECT_ROOT, "web/src/content/articles");

  const files = findFiles(target);
  console.log(`检查 ${files.length} 个文件...\n`);

  let okCount = 0;
  let failCount = 0;
  const failed = [];

  for (const file of files) {
    const result = checkFile(file);
    const displayName = basename(file);
    if (result.ok) {
      console.log(`✅ ${displayName}`);
      okCount++;
    } else {
      console.log(`❌ ${displayName}:`);
      for (const issue of result.issues) {
        console.log(`   - ${issue}`);
      }
      failCount++;
      failed.push(result);
    }
  }

  console.log(`\n--- 统计 ---`);
  console.log(`通过: ${okCount}`);
  console.log(`失败: ${failCount}`);
  console.log(`总计: ${files.length}`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
