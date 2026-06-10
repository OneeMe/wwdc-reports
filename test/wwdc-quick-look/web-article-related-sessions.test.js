import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const repoRoot = new URL('../..', import.meta.url).pathname;

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('web article related sessions', () => {
  it('does not append a second related sessions block in the article layout', () => {
    const layout = readProjectFile('web/src/layouts/ArticleLayout.astro');

    assert.doesNotMatch(layout, /RelatedSessions/);
    assert.doesNotMatch(layout, /article-footer/);
  });

  it('generates related session links to article detail pages', () => {
    const script = readProjectFile('scripts/batch-convert-articles.mjs');

    assert.match(script, /\/articles\/wwdc\$\{year\}-\$\{r\.code\}/);
    assert.doesNotMatch(script, /\/articles\?year=\$\{year\}&topic=all&search=\$\{r\.code\}/);
  });

  it('renders the source video link from article frontmatter', () => {
    const page = readProjectFile('web/src/pages/articles/[slug].astro');
    const layout = readProjectFile('web/src/layouts/ArticleLayout.astro');

    assert.match(page, /videoUrl=\{entry\.data\.videoUrl\}/);
    assert.match(layout, /videoUrl\?: string/);
    assert.match(layout, /href=\{videoUrl\}/);
    assert.match(layout, /观看原视频/);
  });

  it('keeps the article title in the layout instead of duplicating it in MDX', () => {
    const script = readProjectFile('scripts/batch-convert-articles.mjs');
    const article = readProjectFile('web/src/content/articles/wwdc2026-369.mdx');

    assert.doesNotMatch(script, /# \$\{title\}/);
    assert.doesNotMatch(article, /^---\n[\s\S]*?\n---\n\n# /);
    assert.match(article, /^---\n[\s\S]*?\n---\n\n## Highlight/);
  });
});
