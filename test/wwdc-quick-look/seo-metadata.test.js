import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path));
}

describe("SEO and social sharing metadata", () => {
  it("ships a localized 1200 by 630 default social image for every language", () => {
    const htmlSourcePath = join(repoRoot, "web/assets/wwdc-quick-look-social.html");
    const svgSourcePath = join(repoRoot, "web/assets/wwdc-quick-look-social.svg");

    for (const lang of ["zh", "en", "ja"]) {
      const imagePath = join(
        repoRoot,
        `web/public/assets/wwdc-quick-look-social-${lang}.png`,
      );

      assert.ok(existsSync(imagePath), `${lang} social image should exist`);

      const image = readFileSync(imagePath);
      assert.equal(image.toString("ascii", 1, 4), "PNG");
      assert.equal(image.readUInt32BE(16), 1200);
      assert.equal(image.readUInt32BE(20), 630);
    }

    assert.equal(
      existsSync(htmlSourcePath),
      false,
      "social images should not keep an HTML source",
    );
    assert.equal(
      existsSync(svgSourcePath),
      false,
      "social image should not keep an SVG source",
    );
  });

  it("renders canonical, Open Graph, and large Twitter Card metadata", () => {
    const layout = readProjectFile("web/src/layouts/BaseLayout.astro").toString("utf8");

    assert.match(layout, /<link rel="canonical" href=\{canonicalUrl\}/);
    assert.match(layout, /property="og:type" content=\{type\}/);
    assert.match(layout, /property="og:title" content=\{title\}/);
    assert.match(layout, /property="og:description" content=\{metaDescription\}/);
    assert.match(layout, /property="og:url" content=\{canonicalUrl\}/);
    assert.match(layout, /property="og:image" content=\{socialImageUrl\}/);
    assert.match(layout, /name="twitter:card" content="summary_large_image"/);
    assert.match(layout, /name="twitter:image" content=\{socialImageUrl\}/);
    assert.match(layout, /max-image-preview:large/);
    assert.match(layout, /zh: "\/assets\/wwdc-quick-look-social-zh\.png"/);
    assert.match(layout, /en: "\/assets\/wwdc-quick-look-social-en\.png"/);
    assert.match(layout, /ja: "\/assets\/wwdc-quick-look-social-ja\.png"/);
    assert.match(layout, /const resolvedImage = image \?\? defaultSocialImages\[lang\]/);
  });

  it("uses each article thumbnail and article-specific metadata", () => {
    const layout = readProjectFile("web/src/layouts/ArticleLayout.astro").toString("utf8");

    assert.match(layout, /image=\{thumbnail\}/);
    assert.match(layout, /imageAlt=\{title\}/);
    assert.match(layout, /type="article"/);
    assert.match(layout, /publishedTime=\{date\}/);
    assert.match(layout, /tags=\{tags\}/);
  });

  it("keeps full article descriptions available to client-side search", () => {
    const browser = readProjectFile("web/src/components/SessionBrowser.astro").toString("utf8");

    assert.match(browser, /getArticleDescription/);
    assert.doesNotMatch(browser, /getArticleMetaDescription/);
  });

  it("ships a noindex 404 page so Cloudflare does not serve the home page for missing URLs", () => {
    const page = readProjectFile("web/src/pages/404.astro").toString("utf8");

    assert.match(page, /<BaseLayout/);
    assert.match(page, /noindex/);
  });
});
