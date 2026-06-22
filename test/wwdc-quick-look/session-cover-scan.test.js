import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("session cover scanning", () => {
  it("resolves public session covers from the Astro project root", () => {
    const component = readProjectFile("web/src/components/SessionBrowser.astro");

    assert.match(component, /process\.cwd\(\)/);
    assert.match(component, /public\/images\/sessions/);
    assert.doesNotMatch(component, /fileURLToPath\(import\.meta\.url\)/);
  });
});
