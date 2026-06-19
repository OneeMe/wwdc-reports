import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

test("web pages use tracked local session thumbnails", () => {
  const sessionBrowser = readFileSync("web/src/components/SessionBrowser.astro", "utf8");
  const articlePage = readFileSync("web/src/pages/articles/[slug].astro", "utf8");
  const sessionData = readFileSync("web/src/content/sessions/data.ts", "utf8");
  const staticArticleBuilder = readFileSync("scripts/build-articles.mjs", "utf8");
  const staticWebBuilder = readFileSync("scripts/build-web.mjs", "utf8");

  assert.match(sessionBrowser, /\/images\/sessions\/\$\{session\.year\}\/\$\{session\.contentId\}\.jpg/);
  assert.match(sessionData, /\/images\/sessions\/\$\{session\.year\}\/\$\{session\.contentId\}\.jpg/);
  assert.match(staticArticleBuilder, /\/images\/sessions\/\\\$\{session\.year\}\/\\\$\{session\.contentId\}\.jpg/);
  assert.match(staticWebBuilder, /\/images\/sessions\/\\\$\{session\.year\}\/\\\$\{session\.contentId\}\.jpg/);
  assert.match(articlePage, /thumbnail=\{entry\.data\.thumbnail\}/);

  assert.doesNotMatch(sessionBrowser, /devimages-cdn\.apple\.com/);
  assert.doesNotMatch(sessionData, /devimages-cdn\.apple\.com/);
  assert.doesNotMatch(staticArticleBuilder, /devimages-cdn\.apple\.com/);
  assert.doesNotMatch(staticWebBuilder, /devimages-cdn\.apple\.com/);
  assert.doesNotMatch(articlePage, /resolveSessionThumbnailUrl/);
  assert.ok(!existsSync("web/src/content/sessions/thumbnails.ts"));
});

test("representative local session thumbnails are present", () => {
  for (const thumbnailPath of [
    "web/public/images/sessions/2020/10004.jpg",
    "web/public/images/sessions/2024/101.jpg",
    "web/public/images/sessions/2026/369.jpg",
  ]) {
    assert.ok(existsSync(thumbnailPath), `${thumbnailPath} should exist`);
  }
});
