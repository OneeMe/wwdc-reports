import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ARTICLES_DIR = path.join(PROJECT_ROOT, 'web/src/content/articles');

function isBlockquoteLine(line) {
  return /^\s*>/.test(line);
}

function checkHighlight(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const idx = content.indexOf('## Highlight');
  if (idx === -1) return { ok: true, reason: 'no-highlight' };

  const after = content.slice(idx + '## Highlight'.length);
  const lines = after.split('\n');

  let firstContentLine = null;
  let firstContentIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '') continue;
    if (trimmed.startsWith('---')) break;
    firstContentLine = trimmed;
    firstContentIndex = i;
    break;
  }

  if (firstContentLine === null) {
    return { ok: true, reason: 'empty-highlight' };
  }

  if (isBlockquoteLine(lines[firstContentIndex])) {
    return { ok: true, reason: 'ok' };
  }

  return { ok: false, firstLine: firstContentLine.slice(0, 60) };
}

describe('highlight-format', () => {
  const files = fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.mdx'));
  const bad = [];

  for (const f of files) {
    const filePath = path.join(ARTICLES_DIR, f);
    const result = checkHighlight(filePath);
    if (!result.ok) {
      bad.push({ file: f, firstLine: result.firstLine });
    }
  }

  it('every MDX has a blockquote in ## Highlight', () => {
    const msg = bad.length > 0
      ? `${bad.length} file(s) have highlight that is not a blockquote:\n` +
        bad.map(b => `  - ${b.file} => ${b.firstLine}...`).join('\n')
      : undefined;
    assert.strictEqual(bad.length, 0, msg);
  });
});
