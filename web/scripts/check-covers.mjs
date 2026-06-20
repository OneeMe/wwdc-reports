import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const articlesDir = path.join(rootDir, "src/content/articles");
const publicDir = path.join(rootDir, "public");

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      result.push(full);
    }
  }
  return result;
}

function extractFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  return match ? match[1] : "";
}

function getThumbnail(frontmatter) {
  const match = frontmatter.match(/^thumbnail:\s*(.+)$/m);
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

const files = walk(articlesDir);
const missing = [];

for (const file of files) {
  const frontmatter = extractFrontmatter(file);
  const thumbnail = getThumbnail(frontmatter);
  const rel = path.relative(articlesDir, file);

  if (!thumbnail) {
    missing.push({ file: rel, reason: "missing thumbnail field" });
    continue;
  }

  const imagePath = path.join(publicDir, thumbnail);
  if (!fs.existsSync(imagePath)) {
    missing.push({ file: rel, reason: `missing image file: ${thumbnail}` });
  }
}

if (missing.length > 0) {
  console.error(`❌ ${missing.length} article(s) have missing covers:`);
  for (const item of missing) {
    console.error(`  - ${item.file}: ${item.reason}`);
  }
  process.exit(1);
}

console.log(`✅ All ${files.length} articles have valid covers.`);
