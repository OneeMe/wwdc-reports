import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("AdSense placement", () => {
  it("loads the AdSense runtime only from the component that renders an ad slot", () => {
    const baseLayout = readProjectFile("web/src/layouts/BaseLayout.astro");
    const articleAdSlot = readProjectFile("web/src/components/ArticleAdSlot.astro");

    assert.doesNotMatch(baseLayout, /pagead2\.googlesyndication\.com/);
    assert.doesNotMatch(baseLayout, /googleAdsenseConfig/);
    assert.match(articleAdSlot, /config\.enabled/);
    assert.match(articleAdSlot, /pagead2\.googlesyndication\.com/);
    assert.match(articleAdSlot, /class="adsbygoogle"/);
  });
});
