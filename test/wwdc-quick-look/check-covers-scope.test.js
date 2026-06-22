import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("check covers script", () => {
  it("only requires session card covers for sessions with local articles", () => {
    const script = readProjectFile("web/scripts/check-covers.mjs");

    assert.match(script, /const renderedArticleSlugs = new Set/);
    assert.match(script, /const referencedThumbnails = new Set/);
    assert.match(script, /referencedThumbnails\.add\(thumbnail\)/);
    assert.match(script, /path\.basename\(file, path\.extname\(file\)\)/);
    assert.match(script, /const articleSlug = `wwdc\$\{year\}-\$\{contentId\}`/);
    assert.match(script, /if \(!renderedArticleSlugs\.has\(articleSlug\)\) continue;/);
    assert.match(script, /!referencedThumbnails\.has\(imagePath\)/);
  });
});
