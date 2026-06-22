import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("Cloudflare Pages build configuration", () => {
  it("does not use Shiki for Markdown code blocks during the static build", () => {
    const config = readProjectFile("web/astro.config.mjs");

    assert.match(config, /markdown:\s*{/);
    assert.match(config, /syntaxHighlight:\s*false/);
  });

  it("keeps the Node heap below the Cloudflare build container boundary", () => {
    const packageJson = JSON.parse(readProjectFile("web/package.json"));
    const buildScript = packageJson.scripts.build;

    assert.match(buildScript, /astro build/);
    assert.match(buildScript, /--max-old-space-size=6144/);
    assert.doesNotMatch(buildScript, /--max-old-space-size=8192/);
  });
});
