import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { generateSeoFiles } from "../../web/scripts/generate-seo-files.mjs";

describe("generated SEO files", () => {
  it("builds sitemap and robots files from rendered canonical URLs", async () => {
    const distDir = await mkdtemp(join(tmpdir(), "wwdc-quick-look-seo-"));

    try {
      await mkdir(join(distDir, "en", "articles", "sample"), { recursive: true });
      await writeFile(
        join(distDir, "index.html"),
        '<link rel="canonical" href="https://wwdc-quick-look.swiftgg.team/" />',
      );
      await writeFile(
        join(distDir, "en", "articles", "sample", "index.html"),
        '<link rel="canonical" href="https://wwdc-quick-look.swiftgg.team/en/articles/sample/" />',
      );

      const result = await generateSeoFiles(distDir, "https://wwdc-quick-look.swiftgg.team");
      const sitemap = await readFile(join(distDir, "sitemap.xml"), "utf8");
      const robots = await readFile(join(distDir, "robots.txt"), "utf8");

      assert.equal(result.urlCount, 2);
      assert.match(sitemap, /<loc>https:\/\/wwdc-quick-look\.swiftgg\.team\/<\/loc>/);
      assert.match(
        sitemap,
        /<loc>https:\/\/wwdc-quick-look\.swiftgg\.team\/en\/articles\/sample\/<\/loc>/,
      );
      assert.match(robots, /User-agent: \*/);
      assert.match(robots, /Allow: \//);
      assert.match(robots, /Sitemap: https:\/\/wwdc-quick-look\.swiftgg\.team\/sitemap\.xml/);
    } finally {
      await rm(distDir, { recursive: true, force: true });
    }
  });
});
