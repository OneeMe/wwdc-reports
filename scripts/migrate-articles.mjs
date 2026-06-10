#!/usr/bin/env node
/**
 * 迁移 WWDC26 文章从 learning/wwdc 到 wwdc-quick-look
 * 从 git commit bd6c9b2 提取新格式内容，转换 frontmatter 后写入目标位置
 */

import { execSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const SRC_DIR = "src/content/wwdc2026";
const TARGET_DIR = "/Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look/web/src/content/articles";
const GIT_COMMIT = "bd6c9b2";
const YEAR = "2026";

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) {
      let key = m[1].trim();
      let val = m[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("[") && val.endsWith("]")) {
        try { val = JSON.parse(val.replace(/'/g, '"')); } catch {}
      }
      fm[key] = val;
    }
  }
  return fm;
}

function parseRelatedSessions(body) {
  const match = body.match(/## 关联 Session\n\n([\s\S]*?)(?=\n## |\n---|$)/);
  if (!match) return [];
  const lines = match[1].trim().split("\n");
  const sessions = [];
  for (const line of lines) {
    const m = line.match(/-\s*\[([^\]]+)\]\(\/articles\/wwdc\d{4}-(\d+)\)\s*[-—]\s*(.+)/);
    if (m) {
      sessions.push({
        title: m[1],
        code: m[2],
        description: m[3].trim(),
      });
    }
  }
  return sessions;
}

function getSessionDescription(code) {
  try {
    const out = execSync(
      `cd /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look && node skills/wwdc-quick-look/scripts/query.mjs show-session --year ${YEAR} --code ${code}`,
      { encoding: "utf-8", timeout: 10000 }
    );
    const m = out.match(/discover[^\n]+|learn[^\n]+|explore[^\n]+|get[^\n]+/i);
    if (m) return m[0].trim().substring(0, 200);
  } catch {}
  return "";
}

function convertArticle(code, content) {
  const fm = extractFrontmatter(content);
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, "");
  const relatedSessions = parseRelatedSessions(body);
  const description = getSessionDescription(code) || fm.description || "";

  const newFm = {
    title: fm.title || "",
    description: description,
    date: fm.date || "2026-06-10",
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    thumbnail: fm.thumbnail || `/images/sessions/${YEAR}/${code}.jpg`,
    videoUrl: fm.videoUrl || `https://developer.apple.com/videos/play/wwdc${YEAR}/${code}/`,
    sessionId: `wwdc${YEAR}-${code}`,
    year: YEAR,
    relatedSessions: relatedSessions.length > 0 ? relatedSessions : undefined,
  };

  // YAML serialize
  let yaml = "---\n";
  for (const [key, val] of Object.entries(newFm)) {
    if (val === undefined) continue;
    if (key === "relatedSessions" && Array.isArray(val)) {
      yaml += "relatedSessions:\n";
      for (const s of val) {
        yaml += `  - title: "${s.title}"\n`;
        yaml += `    code: "${s.code}"\n`;
        yaml += `    description: "${s.description}"\n`;
      }
    } else if (Array.isArray(val)) {
      yaml += `${key}: [${val.map(v => `"${v}"`).join(", ")}]\n`;
    } else {
      yaml += `${key}: "${val}"\n`;
    }
  }
  yaml += "---\n";

  return yaml + body;
}

function getFilesFromGit() {
  const out = execSync(
    `git -C /Users/onee/Code/onee-workspace/projects/learning/wwdc ls-tree --name-only ${GIT_COMMIT} ${SRC_DIR}/`,
    { encoding: "utf-8" }
  );
  return out.trim().split("\n").filter(Boolean);
}

function main() {
  const files = getFilesFromGit();
  console.log(`迁移 ${files.length} 篇文章...\n`);

  let success = 0;
  for (const file of files) {
    const code = file.replace(`${SRC_DIR}/`, "").replace(".md", "");
    try {
      const content = execSync(
        `git -C /Users/onee/Code/onee-workspace/projects/learning/wwdc show ${GIT_COMMIT}:${file}`,
        { encoding: "utf-8" }
      );
      const converted = convertArticle(code, content);
      const targetPath = `${TARGET_DIR}/wwdc${YEAR}-${code}.mdx`;
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, converted);
      success++;
      process.stdout.write(`.`);
    } catch (e) {
      console.error(`\n❌ ${code}: ${e.message}`);
    }
  }

  console.log(`\n\n完成: ${success}/${files.length}`);
}

main();
