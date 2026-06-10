/**
 * Checker + fixer for ## Highlight format.
 *
 * Expected: ## Highlight followed by a blockquote (lines starting with >).
 *
 * Run:
 *   node scripts/check-highlight.mjs         # check only
 *   node scripts/check-highlight.mjs --fix   # check and auto-fix
 */

import fs from 'node:fs';
import path from 'node:path';

const ARTICLES_DIR = 'web/src/content/articles';
const FIX = process.argv.includes('--fix');

function getProjectRoot() {
  const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
  return path.resolve(scriptsDir, '..');
}

function isBlockquoteLine(line) {
  return /^\s*>/.test(line);
}

function checkFile(filePath) {
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

  // Find the paragraph boundary (first empty line after content starts)
  let paragraphEnd = firstContentIndex;
  for (let i = firstContentIndex; i < lines.length; i++) {
    if (lines[i].trim() === '') {
      paragraphEnd = i;
      break;
    }
    // Also stop at next section
    if (lines[i].trim().startsWith('## ') || lines[i].trim() === '---') {
      paragraphEnd = i;
      break;
    }
  }

  return {
    ok: false,
    reason: 'not-blockquote',
    firstLine: firstContentLine.slice(0, 60),
    lines: lines,
    firstContentIndex,
    paragraphEnd,
    content,
    highlightPos: idx,
  };
}

function fixFile(filePath, result) {
  const { content, highlightPos, firstContentIndex, paragraphEnd, lines } = result;

  // Build the fixed content:
  // - Everything before ## Highlight stays the same
  // - ## Highlight line stays
  // - Lines between ## Highlight and first content line stay
  // - Content lines get prefixed with '> '
  // - Everything after paragraph stays

  const prefix = content.slice(0, highlightPos + '## Highlight'.length);
  const linesAfterHighlight = lines.slice(0, firstContentIndex);
  const contentLines = lines.slice(firstContentIndex, paragraphEnd);
  const suffixLines = lines.slice(paragraphEnd);

  const fixedContentLines = contentLines.map((l) => {
    if (l.trim() === '') return l;
    return '> ' + l;
  });

  const newContent =
    prefix +
    '\n' +
    linesAfterHighlight.join('\n') +
    fixedContentLines.join('\n') +
    '\n' +
    suffixLines.join('\n');

  fs.writeFileSync(filePath, newContent, 'utf8');
}

const root = getProjectRoot();
const dir = path.join(root, ARTICLES_DIR);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx'));

const bad = [];
const fixed = [];

for (const f of files) {
  const filePath = path.join(dir, f);
  const result = checkFile(filePath);
  if (!result.ok) {
    bad.push({ file: f, firstLine: result.firstLine });
    if (FIX) {
      fixFile(filePath, result);
      fixed.push(f);
    }
  }
}

console.log(`Total MDX files: ${files.length}`);
console.log(`Bad highlight format: ${bad.length}`);

if (bad.length > 0) {
  console.log('\nFiles with incorrect highlight format:');
  for (const b of bad) {
    console.log(`  - ${b.file} => ${b.firstLine}...`);
  }
}

if (FIX && fixed.length > 0) {
  console.log(`\nFixed ${fixed.length} file(s).`);
}

if (bad.length > 0 && !FIX) {
  console.log('\nRun with --fix to auto-correct.');
  process.exit(1);
}
