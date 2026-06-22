import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const repoRoot = new URL("../..", import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("GitHub issue comments", () => {
  it("renders article comments through utterances", () => {
    const component = readProjectFile("web/src/components/GitHubComments.astro");

    assert.match(component, /https:\/\/utteranc\.es\/client\.js/);
    assert.match(component, /repo=\{utterancesRepo\}/);
    assert.match(component, /issue-term=\{articleSlug\}/);
    assert.match(component, /label=\{utterancesLabel\}/);
    assert.match(component, /theme="github-light"/);
    assert.match(component, /copy\.commentsTitle/);
    assert.match(component, /GitHub Issues · utterances/);
  });

  it("passes stable article identity into the comments component", () => {
    const page = readProjectFile("web/src/pages/articles/[slug].astro");
    const localizedPage = readProjectFile("web/src/pages/[lang]/articles/[slug].astro");
    const layout = readProjectFile("web/src/layouts/ArticleLayout.astro");

    assert.match(page, /articleSlug=\{entry\.id\}/);
    assert.match(localizedPage, /articleSlug: `\$\{lang\}\/\$\{slug\}`/);
    assert.match(localizedPage, /articleSlug=\{articleSlug\}/);
    assert.doesNotMatch(page, /articleUrl/);
    assert.match(layout, /import GitHubComments from "\.\.\/components\/GitHubComments\.astro"/);
    assert.match(layout, /articleSlug\?: string/);
    assert.doesNotMatch(layout, /articleUrl/);
    assert.match(layout, /<GitHubComments articleSlug=\{articleSlug\} lang=\{lang\}/);
  });

  it("does not ship a custom GitHub OAuth comments backend", () => {
    assert.equal(existsSync(join(repoRoot, "functions/api/comments/config.js")), false);
    assert.equal(existsSync(join(repoRoot, "functions/api/comments/auth/login.js")), false);
    assert.equal(existsSync(join(repoRoot, "functions-shared/comments.js")), false);

    const component = readProjectFile("web/src/components/GitHubComments.astro");
    assert.doesNotMatch(component, /\/api\/comments/);
    assert.doesNotMatch(component, /GITHUB_COMMENTS_CLIENT_SECRET/);
    assert.doesNotMatch(component, /sessionSecret/);
  });

  it("documents utterances setup instead of Cloudflare secrets", () => {
    const readme = readProjectFile("web/README.md");

    assert.match(readme, /utterances/);
    assert.match(readme, /https:\/\/github\.com\/apps\/utterances/);
    assert.match(readme, /article-comment/);
    assert.doesNotMatch(readme, /GITHUB_COMMENTS_CLIENT_SECRET/);
    assert.doesNotMatch(readme, /Functions directory/);
  });
});
