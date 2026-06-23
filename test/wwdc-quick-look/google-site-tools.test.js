import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("Google site tooling", () => {
  it("wires Google Analytics and Search Console through public build-time env vars", () => {
    const layout = readProjectFile("web/src/layouts/BaseLayout.astro");

    assert.match(layout, /PUBLIC_GOOGLE_ANALYTICS_ID/);
    assert.match(layout, /PUBLIC_GA_MEASUREMENT_ID/);
    assert.match(layout, /PUBLIC_GOOGLE_SITE_VERIFICATION/);
    assert.match(layout, /google-site-verification/);
    assert.match(layout, /https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=\$\{googleAnalyticsId\}/);
    assert.match(layout, /gtag\("config", googleAnalyticsId\)/);
  });
});
