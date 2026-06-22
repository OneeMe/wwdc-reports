#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src/content/articles");

function stripFm(c) {
  if (!c.startsWith("---")) return c;
  const end = c.indexOf("\n---", 3);
  return end === -1 ? c : c.slice(end + 4);
}

function countJa(text) {
  return (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) ?? []).length;
}

function countZh(text) {
  return (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
}

function classifyJa(zh, loc) {
  if (zh === loc) return "placeholder";
  const body = stripFm(loc);
  const ja = countJa(body);
  const zhChars = countZh(body);
  const jaRatio = ja / Math.max(body.length, 1);
  const zhRatio = zhChars / Math.max(body.length, 1);

  if (jaRatio > 0.02 && zhRatio < 0.12) return "done";
  if (jaRatio > 0.005 && zhRatio < 0.25) return "partial-done"; // translated but mixed headers/leftover zh
  if (zhRatio > 0.3) return "partial-zh"; // mostly still Chinese
  return "unknown";
}

const files = readdirSync(dir).filter((f) => f.endsWith(".mdx") && !f.includes("/"));
const byYear = {};
for (const f of files) {
  const year = f.match(/^wwdc(\d{4})-/)?.[1] ?? "?";
  byYear[year] ??= { done: 0, partial: 0, placeholder: 0 };
  const zh = readFileSync(path.join(dir, f), "utf8");
  const loc = readFileSync(path.join(dir, "ja", f), "utf8");
  const s = classifyJa(zh, loc);
  if (s === "done" || s === "partial-done") byYear[year].done++;
  else if (s.startsWith("partial")) byYear[year].partial++;
  else byYear[year].placeholder++;
}

console.log("JA refined by year (ja kana heuristic):");
for (const [y, d] of Object.entries(byYear).sort()) {
  const t = d.done + d.partial + d.placeholder;
  console.log(`${y}: done~${d.done} partial~${d.partial} placeholder=${d.placeholder} total=${t}`);
}

// 2024 EN done list
console.log("\n2024 EN translated:");
for (const f of files.filter((f) => f.startsWith("wwdc2024"))) {
  const zh = readFileSync(path.join(dir, f), "utf8");
  const en = readFileSync(path.join(dir, "en", f), "utf8");
  if (zh === en) continue;
  const body = stripFm(en);
  const zhR = countZh(body) / body.length;
  if (zhR < 0.08) console.log(" ", f.replace(".mdx", ""), `zhRatio=${zhR.toFixed(3)}`);
}
