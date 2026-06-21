#!/usr/bin/env node
/**
 * Count article translation status for EN and JA vs Chinese source.
 * Usage: node web/scripts/count-translation-status.mjs [--json] [--list-remaining YEAR LANG]
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.join(root, "src/content/articles");

const EN_SECTIONS = ["## Core Ideas", "## Details", "## Key Takeaways", "## Related Sessions"];
const JA_SECTIONS = ["## 主要内容", "## 詳細", "## 重要ポイント", "## 関連セッション"];
const ZH_SECTIONS = ["## 核心内容", "## 详细内容", "## 核心启发", "## 关联 Session"];

function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function stripFrontmatter(content) {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  return end === -1 ? content : content.slice(end + 4).trimStart();
}

function countCjk(text) {
  return (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
}

function extractYear(filename) {
  const m = filename.match(/^wwdc(\d{4})-/);
  return m ? m[1] : "unknown";
}

function classifyStatus(zhContent, locContent, lang) {
  if (!locContent) return "missing";

  const zhHash = hash(zhContent);
  const locHash = hash(locContent);
  if (zhHash === locHash) return "placeholder";

  const zhBody = stripFrontmatter(zhContent);
  const locBody = stripFrontmatter(locContent);
  if (hash(zhBody) === hash(locBody)) return "placeholder";

  const bodyCjk = countCjk(locBody);
  const bodyLen = locBody.length;
  const cjkRatio = bodyLen > 0 ? bodyCjk / bodyLen : 0;

  const translatedSections =
    lang === "en"
      ? EN_SECTIONS.filter((s) => locBody.includes(s)).length
      : JA_SECTIONS.filter((s) => locBody.includes(s)).length;

  const hasTranslatedHeaders = translatedSections >= 2;

  // Partial: some English/Japanese headers but still heavy Chinese body
  if (cjkRatio > 0.08 && !hasTranslatedHeaders) return "partial";
  if (cjkRatio > 0.15 && translatedSections < 3) return "partial";

  // Done: low Chinese ratio OR proper localized section headers
  if (cjkRatio <= 0.08 || (hasTranslatedHeaders && cjkRatio <= 0.2)) return "done";

  return "partial";
}

function listMdx(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort();
}

const zhFiles = listMdx(articlesDir);
const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const listIdx = args.indexOf("--list-remaining");

const byYear = {};
const details = { en: {}, ja: {} };

for (const file of zhFiles) {
  const year = extractYear(file);
  if (!byYear[year]) {
    byYear[year] = {
      total: 0,
      en: { done: 0, partial: 0, placeholder: 0, missing: 0 },
      ja: { done: 0, partial: 0, placeholder: 0, missing: 0 },
    };
  }
  byYear[year].total++;

  const zhPath = path.join(articlesDir, file);
  const zhContent = readFileSync(zhPath, "utf8");

  for (const lang of ["en", "ja"]) {
    const locPath = path.join(articlesDir, lang, file);
    const locContent = existsSync(locPath) ? readFileSync(locPath, "utf8") : null;
    const status = classifyStatus(zhContent, locContent, lang);
    byYear[year][lang][status]++;
    details[lang][file] = status;
  }
}

function summarize(lang) {
  const totals = { done: 0, partial: 0, placeholder: 0, missing: 0 };
  for (const file of zhFiles) {
    totals[details[lang][file]]++;
  }
  const total = zhFiles.length;
  const remaining = totals.placeholder + totals.partial + totals.missing;
  return { total, ...totals, remaining, pctDone: ((totals.done / total) * 100).toFixed(1) };
}

const enSummary = summarize("en");
const jaSummary = summarize("ja");

if (listIdx !== -1) {
  const year = args[listIdx + 1];
  const lang = args[listIdx + 2];
  if (!year || !lang) {
    console.error("Usage: --list-remaining YEAR LANG (en|ja)");
    process.exit(1);
  }
  const remaining = zhFiles.filter((f) => {
    if (extractYear(f) !== year) return false;
    const s = details[lang][f];
    return s !== "done";
  });
  console.log(`Remaining ${lang.toUpperCase()} for ${year} (${remaining.length}):`);
  for (const f of remaining) console.log(`  ${f.replace(".mdx", "")} [${details[lang][f]}]`);
  process.exit(0);
}

const report = {
  generatedAt: new Date().toISOString(),
  sourceTotal: zhFiles.length,
  en: enSummary,
  ja: jaSummary,
  byYear: Object.fromEntries(
    Object.entries(byYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, data]) => [
        year,
        {
          total: data.total,
          en: {
            ...data.en,
            remaining: data.en.placeholder + data.en.partial + data.en.missing,
            pctDone: ((data.en.done / data.total) * 100).toFixed(1),
          },
          ja: {
            ...data.ja,
            remaining: data.ja.placeholder + data.ja.partial + data.ja.missing,
            pctDone: ((data.ja.done / data.total) * 100).toFixed(1),
          },
        },
      ]),
  ),
};

const outPath = path.join(root, "scripts/translation-status.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log("=== WWDC Article Translation Status ===\n");
console.log(`Chinese source articles: ${zhFiles.length}\n`);

for (const [label, s] of [
  ["English (en/)", enSummary],
  ["Japanese (ja/)", jaSummary],
]) {
  console.log(`${label}:`);
  console.log(`  Done:        ${s.done} (${s.pctDone}%)`);
  console.log(`  Partial:     ${s.partial}`);
  console.log(`  Placeholder: ${s.placeholder} (identical to Chinese)`);
  console.log(`  Missing:     ${s.missing}`);
  console.log(`  Remaining:   ${s.remaining}\n`);
}

console.log("By year:");
console.log(
  "Year  | Total | EN done | EN remain | EN %  | JA done | JA remain | JA %",
);
console.log("-".repeat(72));
for (const [year, data] of Object.entries(report.byYear)) {
  console.log(
    `${year} | ${String(data.total).padStart(5)} | ${String(data.en.done).padStart(7)} | ${String(data.en.remaining).padStart(9)} | ${String(data.en.pctDone).padStart(5)}% | ${String(data.ja.done).padStart(7)} | ${String(data.ja.remaining).padStart(9)} | ${String(data.ja.pctDone).padStart(5)}%`,
  );
}

console.log(`\nFull report: ${outPath}`);
