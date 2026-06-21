#!/usr/bin/env node
/**
 * Verify EN/JA article translations no longer contain Chinese source content.
 * Does NOT review translation quality — only detects leftover Chinese prose/headers.
 *
 * Usage:
 *   node web/scripts/check-translation.mjs [--lang en|ja] [--year YYYY] [--file slug.mdx] [--changed]
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "src/content/articles");

const ZH_SECTION_HEADERS = [
  "## 核心内容",
  "## 详细内容",
  "## 核心启发",
  "## 关联 Session",
];

const CJK_THRESHOLD = 15;
const JA_MIN_KANA = 20;

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/g;
const KANA_RE = /[\u3040-\u309f\u30a0-\u30ff]/g;

function parseArgs(argv) {
  const opts = { langs: ["en", "ja"], year: null, file: null, changed: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--lang") {
      const lang = argv[++i];
      if (lang !== "en" && lang !== "ja") usage(`invalid --lang: ${lang}`);
      opts.langs = [lang];
    } else if (arg === "--year") {
      opts.year = argv[++i];
      if (!/^\d{4}$/.test(opts.year)) usage(`invalid --year: ${opts.year}`);
    } else if (arg === "--file") {
      opts.file = argv[++i];
    } else if (arg === "--changed") {
      opts.changed = true;
    } else if (arg === "-h" || arg === "--help") {
      usage();
    } else {
      usage(`unknown argument: ${arg}`);
    }
  }
  return opts;
}

function usage(message) {
  if (message) console.error(`${message}\n`);
  console.error(`Usage: node web/scripts/check-translation.mjs [options]

Options:
  --lang en|ja     Check one language (default: both)
  --year YYYY      Limit to articles from that year
  --file slug.mdx  Check a single article (with or without .mdx)
  --changed        Only check git-changed en/ or ja/ article files
`);
  process.exit(message ? 1 : 0);
}

function stripFrontmatter(content) {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  return end === -1 ? content : content.slice(end + 4).trimStart();
}

function stripCodeBlocks(content) {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");
}

function countMatches(text, re) {
  return (text.match(re) ?? []).length;
}

function extractYear(filename) {
  return filename.match(/^wwdc(\d{4})-/)?.[1] ?? null;
}

function normalizeFilename(fileArg) {
  const base = path.basename(fileArg);
  return base.endsWith(".mdx") ? base : `${base}.mdx`;
}

function listSourceFiles() {
  return readdirSync(articlesDir)
    .filter((f) => f.endsWith(".mdx"))
    .sort();
}

function getChangedArticleFiles() {
  const repoRoot = path.resolve(root, "..");
  let output = "";
  try {
    output = execSync("git diff --name-only HEAD", {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    try {
      output = execSync("git diff --name-only --cached", {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      return [];
    }
  }

  const changed = new Set();
  for (const line of output.split("\n")) {
    const normalized = line.replace(/\\/g, "/");
    const match = normalized.match(
      /(?:^|\/)web\/src\/content\/articles\/(en|ja)\/(.+\.mdx)$/,
    );
    if (match) changed.add(`${match[1]}/${match[2]}`);
  }
  return [...changed];
}

function extractHighlightSection(body) {
  const match = body.match(/^## Highlight\b[^\n]*\n([\s\S]*?)(?=^## |\Z)/m);
  return match ? match[1] : null;
}

function findChineseSectionHeaders(body) {
  return ZH_SECTION_HEADERS.filter((header) => body.includes(header));
}

function checkTranslation(lang, filename, content) {
  const reasons = [];
  const body = stripCodeBlocks(stripFrontmatter(content));
  const prose = body;

  const chineseHeaders = findChineseSectionHeaders(body);
  if (chineseHeaders.length > 0) {
    reasons.push(`Chinese section headers: ${chineseHeaders.join(", ")}`);
  }

  const highlight = extractHighlightSection(body);
  if (highlight) {
    const highlightProse = stripCodeBlocks(highlight);
    const highlightCjk = countMatches(highlightProse, CJK_RE);
    const highlightKana = countMatches(highlightProse, KANA_RE);
    const highlightIsChinese =
      lang === "en"
        ? highlightCjk > CJK_THRESHOLD
        : highlightCjk > CJK_THRESHOLD && highlightKana < JA_MIN_KANA;

    if (highlightIsChinese) {
      reasons.push(
        `Highlight section contains Chinese prose (${highlightCjk} CJK chars)`,
      );
    }
  }

  const cjkCount = countMatches(prose, CJK_RE);
  const kanaCount = countMatches(prose, KANA_RE);

  if (lang === "en") {
    if (cjkCount > CJK_THRESHOLD) {
      reasons.push(
        `Chinese characters in prose: ${cjkCount} (threshold ${CJK_THRESHOLD})`,
      );
    }
  } else if (cjkCount > CJK_THRESHOLD && kanaCount < JA_MIN_KANA) {
    reasons.push(
      `Chinese prose detected: ${cjkCount} CJK chars, ${kanaCount} kana (expected Japanese)`,
    );
  }

  return {
    pass: reasons.length === 0,
    reasons,
    stats: { cjkCount, kanaCount },
  };
}

function collectTargets(opts) {
  const targets = [];

  if (opts.changed) {
    for (const rel of getChangedArticleFiles()) {
      const [lang, filename] = rel.split("/");
      if (!opts.langs.includes(lang)) continue;
      if (opts.year && extractYear(filename) !== opts.year) continue;
      if (opts.file && normalizeFilename(opts.file) !== filename) continue;
      targets.push({ lang, filename });
    }
    return targets;
  }

  let filenames = listSourceFiles();
  if (opts.file) {
    filenames = [normalizeFilename(opts.file)];
  }
  if (opts.year) {
    filenames = filenames.filter((f) => extractYear(f) === opts.year);
  }

  for (const filename of filenames) {
    for (const lang of opts.langs) {
      targets.push({ lang, filename });
    }
  }

  return targets;
}

const opts = parseArgs(process.argv.slice(2));
const targets = collectTargets(opts);

if (targets.length === 0) {
  console.log("No files matched the given filters.");
  process.exit(0);
}

const results = [];
let failures = 0;
let missing = 0;

for (const { lang, filename } of targets) {
  const zhPath = path.join(articlesDir, filename);
  const locPath = path.join(articlesDir, lang, filename);
  const label = `${lang}/${filename}`;

  if (!existsSync(zhPath)) {
    results.push({ label, pass: false, reasons: ["missing Chinese source file"] });
    failures++;
    continue;
  }

  if (!existsSync(locPath)) {
    results.push({ label, pass: false, reasons: ["missing translation file"] });
    failures++;
    missing++;
    continue;
  }

  const content = readFileSync(locPath, "utf8");
  const result = checkTranslation(lang, filename, content);
  results.push({ label, ...result });
  if (!result.pass) failures++;
}

console.log("=== Translation Chinese-Content Check ===\n");
console.log(
  `Checked ${results.length} file(s) | pass ${results.length - failures} | fail ${failures}\n`,
);

for (const { label, pass, reasons, stats } of results) {
  const status = pass ? "PASS" : "FAIL";
  const statSuffix = stats
    ? ` (CJK ${stats.cjkCount}${stats.kanaCount ? `, kana ${stats.kanaCount}` : ""})`
    : "";
  console.log(`${status}  ${label}${statSuffix}`);
  if (!pass) {
    for (const reason of reasons) {
      console.log(`       - ${reason}`);
    }
  }
}

if (failures > 0) {
  console.log(`\n${failures} file(s) failed.`);
  process.exit(1);
}

console.log("\nAll checked files passed.");
process.exit(0);
