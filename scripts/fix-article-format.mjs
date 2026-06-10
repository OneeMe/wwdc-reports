#!/usr/bin/env node
/**
 * 自动修复 WWDC 文章中的常见格式问题
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const AI_REPLACEMENTS = [
  [/不是([^。]+?)而是([^。]+?)/g, "用$2代替$1"],
  [/不仅([^。]+?)而且([^。]+?)/g, "既$1又$2"],
  [/一方面([^。]+?)另一方面([^。]+?)/g, "$1同时$2"],
  [/总而言之/g, "综上所述"],
  [/换句话说/g, "也就是说"],
  [/显而易见/g, "显然"],
  [/毋庸置疑/g, "毫无疑问"],
  [/可以看出/g, "可以看出"],
];

function fixAIStylePhrases(content) {
  let fixed = content;
  for (const [pattern, replacement] of AI_REPLACEMENTS) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

function ensureHighlightBlockquote(content) {
  const lines = content.split("\n");
  const highlightIdx = lines.findIndex((l) => l.trim() === "## Highlight");
  if (highlightIdx >= 0) {
    // 检查下一行是否是 blockquote
    let nextIdx = highlightIdx + 1;
    while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
      nextIdx++;
    }
    if (nextIdx < lines.length && !lines[nextIdx].trim().startsWith("> ")) {
      // 插入 blockquote 标记
      lines[nextIdx] = "> " + lines[nextIdx].trimStart();
    }
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const target = args[0] || "/Users/onee/Code/onee-workspace/projects/learning/wwdc/src/content/wwdc2026";

  const files = readdirSync(target)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => join(target, f));

  let fixedCount = 0;
  for (const file of files) {
    let content = readFileSync(file, "utf-8");
    const original = content;

    content = fixAIStylePhrases(content);
    content = ensureHighlightBlockquote(content);

    if (content !== original) {
      writeFileSync(file, content);
      fixedCount++;
      console.log(`✅ 修复: ${file.split("/").pop()}`);
    }
  }

  console.log(`\n修复了 ${fixedCount} 个文件`);
}

main();
