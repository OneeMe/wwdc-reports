import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("Cloudflare Pages build configuration", () => {
  it("keeps Shiki syntax highlighting enabled for Markdown code blocks", () => {
    const config = readProjectFile("web/astro.config.mjs");

    assert.match(config, /markdown:\s*{/);
    assert.match(config, /syntaxHighlight:\s*"shiki"/);
    assert.doesNotMatch(config, /syntaxHighlight:\s*false/);
    assert.match(config, /concurrency:\s*1/);
    assert.match(config, /WWDC_ASTRO_CACHE_DIR/);
    assert.match(config, /cacheDir/);
  });

  it("builds localized article collections in separate Astro processes", () => {
    const packageJson = JSON.parse(readProjectFile("web/package.json"));
    const buildScript = packageJson.scripts.build;
    const contentConfig = readProjectFile("web/src/content.config.ts");
    const buildLocales = readProjectFile("web/scripts/build-locales.mjs");

    assert.match(buildScript, /scripts\/build-locales\.mjs/);
    assert.match(buildScript, /--max-old-space-size=6144/);
    assert.doesNotMatch(buildScript, /--max-old-space-size=8192/);

    assert.match(contentConfig, /WWDC_ARTICLE_BUILD_LANG/);
    assert.match(contentConfig, /articlePatternsByLang/);
    assert.match(buildLocales, /WWDC_ARTICLE_BUILD_LANG/);
    assert.match(buildLocales, /WWDC_ASTRO_CACHE_DIR/);
    assert.match(buildLocales, /mkdtemp/);
    assert.match(buildLocales, /tmpdir/);
    assert.match(buildLocales, /createBuildWorkspace/);
    assert.match(buildLocales, /symlink/);
    assert.match(buildLocales, /runAstroBuild/);
    assert.doesNotMatch(buildLocales, /path\.join\(webRoot,\s*["']\.astro["']\)/);
    assert.doesNotMatch(buildLocales, /localized-builds/);
  });
});
