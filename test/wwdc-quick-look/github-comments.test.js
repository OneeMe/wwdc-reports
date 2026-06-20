import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("GitHub issue comments", () => {
  it("passes article identity into the comments component", () => {
    const page = readProjectFile("web/src/pages/articles/[slug].astro");
    const layout = readProjectFile("web/src/layouts/ArticleLayout.astro");

    assert.match(page, /const articleUrl = new URL\(Astro\.url\.pathname, Astro\.site \?\? Astro\.url\.origin\)\.toString\(\)/);
    assert.match(page, /articleSlug=\{entry\.id\}/);
    assert.match(page, /articleUrl=\{articleUrl\}/);
    assert.match(layout, /import GitHubComments from "\.\.\/components\/GitHubComments\.astro"/);
    assert.match(layout, /articleSlug\?: string/);
    assert.match(layout, /<GitHubComments articleSlug=\{articleSlug\} articleTitle=\{title\} articleUrl=\{articleUrl\}/);
  });

  it("renders a bottom-of-article UI with selection-based quoting", () => {
    const component = readProjectFile("web/src/components/GitHubComments.astro");

    assert.match(component, /data-github-comments/);
    assert.match(component, /data-quote-tooltip/);
    assert.match(component, /data-selection-box/);
    assert.match(component, /function selectedArticleSelection\(root\)/);
    assert.match(component, /function showQuoteTooltip\(selection\)/);
    assert.match(component, /document\.addEventListener\("selectionchange"/);
    assert.match(component, /selection: quote/);
    assert.match(component, /\/api\/comments\/auth\/login/);
  });

  it("keeps GitHub OAuth and issue writes behind Pages Functions", () => {
    const lib = readProjectFile("functions-shared/comments.js");
    const articleRoute = readProjectFile("functions/api/comments/[slug].js");
    const loginRoute = readProjectFile("functions/api/comments/auth/login.js");
    const callbackRoute = readProjectFile("functions/api/comments/auth/callback.js");

    assert.match(lib, /GITHUB_COMMENTS_CLIENT_SECRET/);
    assert.match(lib, /GITHUB_COMMENTS_SESSION_SECRET/);
    assert.match(lib, /HttpOnly/);
    assert.match(lib, /AES-GCM/);
    assert.match(lib, /https:\/\/github\.com\/login\/oauth\/access_token/);
    assert.match(lib, /https:\/\/api\.github\.com/);
    assert.match(loginRoute, /code_challenge_method", "S256"/);
    assert.match(callbackRoute, /sessionCookie\(request, config, \{ token, user \}\)/);
    assert.match(articleRoute, /ensureArticleIssue/);
    assert.match(articleRoute, /createIssueComment/);
    assert.match(articleRoute, /readSession/);
  });

  it("documents Cloudflare Pages Functions and required secrets", () => {
    const readme = readProjectFile("web/README.md");

    assert.match(readme, /Functions directory/);
    assert.match(readme, /GITHUB_COMMENTS_CLIENT_ID/);
    assert.match(readme, /GITHUB_COMMENTS_CLIENT_SECRET/);
    assert.match(readme, /GITHUB_COMMENTS_SESSION_SECRET/);
    assert.match(readme, /\/api\/comments\/auth\/callback/);
  });
});
