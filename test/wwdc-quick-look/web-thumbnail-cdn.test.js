import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("web pages use Apple CDN thumbnails instead of local session images", () => {
  const sessionBrowser = readFileSync("web/src/components/SessionBrowser.astro", "utf8");
  const articlePage = readFileSync("web/src/pages/articles/[slug].astro", "utf8");
  const thumbnails = readFileSync("web/src/content/sessions/thumbnails.ts", "utf8");

  assert.match(sessionBrowser, /devimages-cdn\.apple\.com/);
  assert.doesNotMatch(sessionBrowser, /\/images\/sessions\/\$\{session\.year\}/);
  assert.match(articlePage, /resolveThumbnailUrl\(entry\.data\.thumbnail\)/);
  assert.doesNotMatch(articlePage, /thumbnail=\{entry\.data\.thumbnail\}/);
  assert.match(thumbnails, /devimages-cdn\.apple\.com/);
  assert.doesNotMatch(thumbnails, /\?\? thumbnail/);
});
