#!/usr/bin/env node
/**
 * Batch translate WWDC articles from Chinese to EN/JA.
 * Preserves MDX structure: frontmatter title/description, code blocks, URLs.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "src/content/articles");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const EN_HEADERS = {
  "## 核心内容": "## Core Content",
  "## 详细内容": "## Detailed Content",
  "## 核心启发": "## Core Takeaways",
  "## 关联 Session": "## Related Sessions",
  "关键点：": "Key points:",
  "**关键点：**": "**Key points:**",
  "**关键点:**": "**Key points:**",
};

const JA_HEADERS = {
  "## Highlight": "## ハイライト",
  "## 核心内容": "## 主要内容",
  "## 详细内容": "## 詳細",
  "## 核心启发": "## 重要ポイント",
  "## 关联 Session": "## 関連セッション",
  "关键点：": "キーポイント:",
  "**关键点：**": "**キーポイント:**",
  "**关键点:**": "**キーポイント:**",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { year: "2021", codes: [], langs: ["en", "ja"], force: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--year") opts.year = args[++i];
    else if (args[i] === "--codes") opts.codes = args[++i].split(",").map((c) => c.trim()).filter(Boolean);
    else if (args[i] === "--lang") opts.langs = [args[++i]];
    else if (args[i] === "--force") opts.force = true;
  }
  return opts;
}

function splitFrontmatter(content) {
  if (!content.startsWith("---")) return { fm: "", body: content };
  const end = content.indexOf("\n---", 3);
  if (end === -1) return { fm: "", body: content };
  return { fm: content.slice(0, end + 4), body: content.slice(end + 4).trimStart() };
}

function applyHeaders(text, headers) {
  let result = text;
  for (const [zh, localized] of Object.entries(headers)) {
    result = result.split(zh).join(localized);
  }
  return result;
}

function hasCjk(s) {
  return /[\u4e00-\u9fff]/.test(s);
}

function collectSegments(body) {
  const segments = {};
  const parts = body.split(/(```[\s\S]*?```|`[^`\n]+`)/);
  let idx = 0;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) continue;
    for (const line of parts[i].split("\n")) {
      if (!hasCjk(line)) continue;
      // Skip section headers already localized by applyHeaders
      if (/^#{1,6}\s/.test(line.trim()) || /^＃{1,6}\s/.test(line.trim())) continue;
      segments[`${idx++}`] = line;
    }
  }
  return { parts, segments };
}

function batchTranslate(segments, lang) {
  if (Object.keys(segments).length === 0) return {};
  const input = JSON.stringify(segments);
  const result = spawnSync("python3", [path.join(scriptDir, "translate-segments.py"), lang], {
    input,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    console.error(result.stderr);
    return segments;
  }
  return JSON.parse(result.stdout);
}

function reassembleBody(parts, translations) {
  let tIdx = 0;
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      out.push(parts[i]);
      continue;
    }
    const lines = parts[i].split("\n");
    out.push(
      lines
        .map((line) => {
          if (!hasCjk(line)) return line;
          if (/^#{1,6}\s/.test(line.trim()) || /^＃{1,6}\s/.test(line.trim())) return line;
          return translations[`${tIdx++}`] ?? line;
        })
        .join("\n"),
    );
  }
  return out.join("");
}

function translateFrontmatter(fm, lang) {
  return fm.replace(/description: "([^"]*[\u4e00-\u9fff][^"]*)"/g, (match, desc) => {
    const translated = batchTranslate({ d: desc }, lang).d ?? desc;
    return `description: "${translated.replace(/"/g, '\\"')}"`;
  });
}

function translateArticle(slug, lang) {
  const zhPath = path.join(articlesDir, `${slug}.mdx`);
  const outPath = path.join(articlesDir, lang, `${slug}.mdx`);
  const content = readFileSync(zhPath, "utf8");
  const { fm, body } = splitFrontmatter(content);
  const headers = lang === "en" ? EN_HEADERS : JA_HEADERS;
  const headerApplied = applyHeaders(body, headers);
  const { parts, segments } = collectSegments(headerApplied);
  const translations = batchTranslate(segments, lang);
  const translatedBody = reassembleBody(parts, translations);
  const translatedFm = translateFrontmatter(fm, lang);
  writeFileSync(outPath, `${translatedFm}\n${translatedBody}`, "utf8");
  console.log(`Wrote ${lang}/${slug}.mdx (${Object.keys(segments).length} segments)`);
}

function hasTranslatedHeaders(content, lang) {
  if (lang === "en") {
    return (
      content.includes("## Core Content") ||
      content.includes("## Detailed Content") ||
      content.includes("## Core Takeaways")
    );
  }
  if (lang === "ja") {
    return (
      content.includes("## 主要内容") ||
      content.includes("## 詳細") ||
      content.includes("## 重要ポイント")
    );
  }
  return false;
}

const opts = parseArgs();
let codes = opts.codes;
if (codes.length === 0) {
  const lang = opts.langs.length === 1 ? opts.langs[0] : "en";
  const out = execSync(
    `node ${path.join(scriptDir, "count-translation-status.mjs")} --list-remaining ${opts.year} ${lang}`,
    { encoding: "utf8" },
  );
  codes = out
    .split("\n")
    .filter((l) => l.includes("wwdc"))
    .map((l) => l.trim().split(" ")[0]);
}

console.log(`Translating ${codes.length} articles × ${opts.langs.length} langs`);
for (const code of codes) {
  const slug = code.startsWith("wwdc") ? code : `wwdc${opts.year}-${code}`;
  for (const lang of opts.langs) {
    const outPath = path.join(articlesDir, lang, `${slug}.mdx`);
    const zhPath = path.join(articlesDir, `${slug}.mdx`);
    if (!existsSync(zhPath)) continue;
    if (!opts.force && existsSync(outPath)) {
      const loc = readFileSync(outPath, "utf8");
      const hasZhHeaders =
        loc.includes("## 核心内容") ||
        loc.includes("## 详细内容") ||
        loc.includes("## 核心启发");
      if (!hasZhHeaders && hasTranslatedHeaders(loc, lang)) {
        console.log(`Skip ${lang}/${slug}.mdx (already translated)`);
        continue;
      }
    }
    translateArticle(slug, lang);
  }
}
console.log("Done.");
