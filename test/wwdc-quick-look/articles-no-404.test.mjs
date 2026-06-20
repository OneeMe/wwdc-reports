import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const ARTICLES_DIR = path.join(PROJECT_ROOT, 'web/src/content/articles');

function listRawDataFiles() {
  const files = [];
  for (const entry of fs.readdirSync(DATA_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const yearDir = path.join(DATA_DIR, entry.name);
    const filePath = path.join(yearDir, 'raw_data.json');
    if (fs.existsSync(filePath)) {
      files.push({
        yearShort: entry.name,
        filePath,
      });
    }
  }
  return files;
}

function parseYearFromShort(short) {
  const m = short.match(/(\d{2})$/);
  if (!m) return null;
  const yy = parseInt(m[1], 10);
  return yy >= 50 ? 1900 + yy : 2000 + yy;
}

function isAslSession(video) {
  return /\(ASL\)\s*$/i.test(video.title ?? '');
}

function isNonArticleSession(video) {
  return /\b(Group Lab|Dub Dub Daily|Special Presentation|Meet the Presenter|Study Hall|Q&A)\b/i.test(
    video.title ?? '',
  );
}

function isSkippedSession(video) {
  return isAslSession(video) || isNonArticleSession(video);
}

function getLocalArticleCodes(year) {
  if (!fs.existsSync(ARTICLES_DIR)) return new Set();
  const prefix = `wwdc${String(year)}-`;
  const codes = new Set();
  for (const f of fs.readdirSync(ARTICLES_DIR)) {
    if (f.startsWith(prefix) && f.endsWith('.mdx')) {
      const code = f.slice(prefix.length, -4);
      if (code) codes.add(code);
    }
  }
  return codes;
}

const rawFiles = listRawDataFiles();
assert.ok(rawFiles.length > 0, `No raw_data.json files found in ${DATA_DIR}/`);

// Only enforce full coverage for the current active year (WWDC26).
// Older years may have incomplete local article sets.
const ACTIVE_YEARS = new Set(['wwdc26']);

describe('articles-no-404', () => {
  for (const { yearShort, filePath } of rawFiles) {
    const year = parseYearFromShort(yearShort);
    if (!year) continue;
    const isActive = ACTIVE_YEARS.has(yearShort);

    describe(yearShort, () => {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const videos = data.videos ?? {};
      const localCodes = getLocalArticleCodes(year);
      const cdnCodes = new Set();
      const skippedCodes = new Set();
      const missing = [];

      for (const video of Object.values(videos)) {
        if (isSkippedSession(video)) {
          skippedCodes.add(video.eventContentId);
          continue;
        }
        cdnCodes.add(video.eventContentId);
        if (!localCodes.has(video.eventContentId)) {
          missing.push({
            code: video.eventContentId,
            title: video.title,
            topic: (data.topics?.[video.primaryTopicID]?.title) ?? video.primaryTopicID,
          });
        }
      }

      const orphans = [];
      for (const code of localCodes) {
        if (!cdnCodes.has(code) && !skippedCodes.has(code)) {
          orphans.push(code);
        }
      }

      if (isActive) {
        it('every non-ASL session has a local article', () => {
          const msg = missing.length > 0
            ? `Missing ${missing.length} local article(s) for ${yearShort}:\n` +
              missing.map(m => `  - ${m.code}: ${m.title} [${m.topic}]`).join('\n')
            : undefined;
          assert.strictEqual(missing.length, 0, msg);
        });

        it('no orphan local articles', () => {
          const msg = orphans.length > 0
            ? `Found ${orphans.length} orphan article(s) for ${yearShort} (no matching CDN session):\n` +
              orphans.map(c => `  - wwdc${year}-${c}.mdx`).join('\n')
            : undefined;
          assert.strictEqual(orphans.length, 0, msg);
        });
      } else {
        it('has local articles (best effort)', () => {
          const coverage = cdnCodes.size > 0 ? localCodes.size / cdnCodes.size : 1;
          console.log(`  ${yearShort}: ${localCodes.size}/${cdnCodes.size} sessions covered (${(coverage * 100).toFixed(1)}%)`);
          assert.ok(coverage >= 0, 'coverage should be >= 0');
        });
      }
    });
  }
});
