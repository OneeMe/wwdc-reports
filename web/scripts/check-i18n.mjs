import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredSourceFiles = [
  "src/i18n/routing.ts",
  "src/pages/[lang]/index.astro",
  "src/pages/[lang]/articles.astro",
  "src/pages/[lang]/articles/[slug].astro",
];

const requiredBuiltFiles = [
  "dist/index.html",
  "dist/articles/index.html",
  "dist/en/index.html",
  "dist/en/articles/index.html",
  "dist/en/articles/wwdc2025-204/index.html",
  "dist/ja/index.html",
  "dist/ja/articles/index.html",
  "dist/ja/articles/wwdc2025-204/index.html",
];

function fail(message) {
  console.error(`i18n check failed: ${message}`);
  process.exit(1);
}

function assertFile(relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`missing ${relativePath}`);
  }
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

for (const file of requiredSourceFiles) {
  assertFile(file);
}

for (const file of requiredBuiltFiles) {
  assertFile(file);
}

const zhHome = read("dist/index.html");
const enHome = read("dist/en/index.html");
const jaHome = read("dist/ja/index.html");
const enArticles = read("dist/en/articles/index.html");
const jaArticle = read("dist/ja/articles/wwdc2025-204/index.html");

if (!/<html[^>]*lang="zh-CN"/.test(zhHome)) {
  fail("default home should render zh-CN html lang");
}

if (!/<html[^>]*lang="en"/.test(enHome) || !enHome.includes("Install it into your agent")) {
  fail("English home should render English html lang and copy");
}

if (!/<html[^>]*lang="ja"/.test(jaHome) || !jaHome.includes("1コマンドでAgentにインストール")) {
  fail("Japanese home should render Japanese html lang and copy");
}

if (!enArticles.includes("Search sessions") || !enArticles.includes('data-article-base-path="/en/articles"')) {
  fail("English session browser should render English copy and localized article base path");
}

if (
  !jaArticle.includes("Go further with MapKit") ||
  !jaArticle.includes("MapKit は 2025 年に") ||
  jaArticle.includes("MapKit 在 2025 推出")
) {
  fail("Japanese article route should render translated Japanese MDX article content");
}

console.log("i18n check passed");
