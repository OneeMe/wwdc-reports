import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function findIndexFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findIndexFiles(entryPath));
    } else if (entry.isFile() && entry.name === "index.html") {
      files.push(entryPath);
    }
  }

  return files;
}

function getCanonicalUrl(html, filePath) {
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/i)?.[1];
  if (!canonical) {
    throw new Error(`Missing canonical URL in ${filePath}`);
  }
  return canonical;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function generateSeoFiles(distDir, site) {
  const siteUrl = new URL(site);
  const indexFiles = await findIndexFiles(distDir);
  const canonicalUrls = await Promise.all(
    indexFiles.map(async (filePath) => getCanonicalUrl(await readFile(filePath, "utf8"), filePath)),
  );
  const urls = [...new Set(canonicalUrls)]
    .filter((url) => new URL(url).origin === siteUrl.origin)
    .sort((left, right) => left.localeCompare(right));

  if (urls.length === 0) {
    throw new Error(`No canonical pages found in ${distDir}`);
  }

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
  const robots = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("/sitemap.xml", siteUrl).toString()}`,
    "",
  ].join("\n");

  await Promise.all([
    writeFile(path.join(distDir, "sitemap.xml"), sitemap),
    writeFile(path.join(distDir, "robots.txt"), robots),
  ]);

  return { urlCount: urls.length };
}
