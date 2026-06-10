import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ARTICLES_DIR = path.join(PROJECT_ROOT, 'web/src/content/articles');

function hasRelatedSessions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) {
    return { ok: false, reason: 'no-frontmatter' };
  }

  const frontMatter = frontMatterMatch[1];
  if (!frontMatter.includes('relatedSessions')) {
    return { ok: false, reason: 'missing-relatedSessions' };
  }

  return { ok: true };
}

describe('article relatedSessions field', () => {
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'));
  const missing = [];

  for (const f of files) {
    const filePath = path.join(ARTICLES_DIR, f);
    const result = hasRelatedSessions(filePath);
    if (!result.ok) {
      missing.push({ file: f, reason: result.reason });
    }
  }

  it('every MDX article has a relatedSessions field in frontmatter', () => {
    const msg = missing.length > 0
      ? `${missing.length} file(s) missing relatedSessions field:\n` +
        missing.map(m => `  - ${m.file} (${m.reason})`).join('\n')
      : undefined;
    assert.strictEqual(missing.length, 0, msg);
  });
});
