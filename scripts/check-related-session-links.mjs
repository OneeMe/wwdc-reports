#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(__dirname);
const ARTICLES_DIR = join(PROJECT_ROOT, "web/src/content/articles");
const SESSIONS_PATH = join(PROJECT_ROOT, "web/sessions.json");
const LOCALES = [
  { id: "zh", directory: ARTICLES_DIR },
  { id: "en", directory: join(ARTICLES_DIR, "en") },
  { id: "ja", directory: join(ARTICLES_DIR, "ja") },
];

const STOP_WORDS = new Set(
  [
    "a",
    "an",
    "and",
    "app",
    "apps",
    "apple",
    "build",
    "bring",
    "code",
    "along",
    "create",
    "deep",
    "design",
    "discover",
    "dive",
    "enhance",
    "explore",
    "for",
    "from",
    "further",
    "get",
    "go",
    "great",
    "how",
    "improve",
    "in",
    "integrate",
    "into",
    "make",
    "meet",
    "more",
    "new",
    "of",
    "on",
    "optimize",
    "say",
    "session",
    "started",
    "support",
    "take",
    "the",
    "to",
    "use",
    "using",
    "what",
    "whats",
    "with",
    "your",
  ],
);

function parseArguments(argv) {
  const fix = argv.includes("--fix");
  const yearsArgument = argv.find((argument) => argument.startsWith("--years="));
  const years = new Set(
    (yearsArgument?.slice("--years=".length) ?? "2024,2025,2026")
      .split(",")
      .map((year) => year.trim())
      .filter(Boolean),
  );

  return { fix, years };
}

function normalizeTitle(title) {
  return title
    .normalize("NFKC")
    .replace(/^[0-9]+\s*[-–—.:]\s*/, "")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function topicTokens(title) {
  return new Set(
    title
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9+]+/g, " ")
      .split(/\s+/)
      .filter(
        (token) =>
          token.length > 2 &&
          !STOP_WORDS.has(token) &&
          !/^(?:20|[0-9])\d+$/.test(token),
      ),
  );
}

function sharesTopic(leftTitle, rightTitle) {
  const left = topicTokens(leftTitle);
  const right = topicTokens(rightTitle);
  return [...left].some((token) => right.has(token));
}

function loadSessionIndex() {
  const data = JSON.parse(readFileSync(SESSIONS_PATH, "utf8"));
  const sessions = data.s.map(
    ([year, code, title, description, topic, url]) => ({
      year,
      code,
      title,
      description,
      topic,
      url,
      titleKey: normalizeTitle(title),
    }),
  );
  const bySlug = new Map();
  const byTitle = new Map();

  for (const session of sessions) {
    bySlug.set(`${session.year}-${session.code}`, session);
    const matches = byTitle.get(session.titleKey) ?? [];
    matches.push(session);
    byTitle.set(session.titleKey, matches);
  }

  return { bySlug, byTitle };
}

function rootArticleExists(year, code) {
  return existsSync(join(ARTICLES_DIR, `wwdc${year}-${code}.mdx`));
}

function chooseExpectedSession(candidates, sourceYear) {
  const notFromFuture = candidates
    .filter((candidate) => Number(candidate.year) <= Number(sourceYear))
    .sort(
      (left, right) =>
        Number(right.year) - Number(left.year) ||
        Number(left.code) - Number(right.code),
    );
  const eligible = notFromFuture.length > 0 ? notFromFuture : candidates;

  return (
    eligible.find((candidate) =>
      rootArticleExists(candidate.year, candidate.code),
    ) ?? eligible[0]
  );
}

const RELATED_LINK_PATTERN =
  /\[([^\]]+)\]\(((?:\/articles\/wwdc(\d{4})-([^)]+))|(?:https:\/\/developer\.apple\.com\/videos\/play\/wwdc(\d{4})\/([^/)\s]+)\/?))\)/g;

function parseRelatedLinks(content) {
  const frontmatter = content.match(/^---\n[\s\S]*?\n---/)?.[0] ?? "";
  const bodyOffset = frontmatter.length;
  const body = content.slice(bodyOffset);
  const links = [];

  for (const match of body.matchAll(RELATED_LINK_PATTERN)) {
    const internal = Boolean(match[3]);
    const year = match[3] ?? match[5];
    const code = match[4] ?? match[6];
    const href = match[2];
    const hrefStart = bodyOffset + match.index + match[0].indexOf(href);

    links.push({
      label: match[1],
      href,
      hrefStart,
      hrefEnd: hrefStart + href.length,
      internal,
      year,
      code,
      fullStart: bodyOffset + match.index,
    });
  }

  return links;
}

function lineNumberAt(content, offset) {
  return content.slice(0, offset).split("\n").length;
}

function findIssues(content, fileName, sourceYear, index) {
  const links = parseRelatedLinks(content);
  const issues = [];

  links.forEach((link, bodyIndex) => {
    const candidates = index.byTitle.get(normalizeTitle(link.label)) ?? [];
    if (candidates.length === 0) {
      if (link.internal && !rootArticleExists(link.year, link.code)) {
        issues.push({
          type: "unresolved-internal-link",
          fileName,
          sourceYear,
          bodyIndex,
          line: lineNumberAt(content, link.fullStart),
          link,
          expected: undefined,
          replaceBody: false,
        });
      }
      return;
    }

    const target = index.bySlug.get(`${link.year}-${link.code}`);
    const targetMatchesTitle = candidates.some(
      (candidate) =>
        candidate.year === link.year && candidate.code === link.code,
    );

    if (targetMatchesTitle) {
      if (
        link.internal &&
        !rootArticleExists(link.year, link.code)
      ) {
        issues.push({
          type: "missing-article",
          fileName,
          sourceYear,
          bodyIndex,
          line: lineNumberAt(content, link.fullStart),
          link,
          expected: target,
        });
      }
      return;
    }

    if (target && sharesTopic(link.label, target.title)) return;

    issues.push({
      type: target ? "wrong-session" : "missing-session",
      fileName,
      sourceYear,
      bodyIndex,
      line: lineNumberAt(content, link.fullStart),
      link,
      expected: chooseExpectedSession(candidates, sourceYear),
    });
  });

  const frontmatterItems = parseFrontmatterItems(content);
  const matchedBodyIndexes = new Set();

  frontmatterItems.forEach((item, frontmatterItemIndex) => {
    const bodyIndex = links.findIndex(
      (link, index) =>
        !matchedBodyIndexes.has(index) &&
        normalizeTitle(link.label) === normalizeTitle(item.title),
    );
    if (bodyIndex < 0) return;
    matchedBodyIndexes.add(bodyIndex);

    const link = links[bodyIndex];
    const target = index.bySlug.get(`${link.year}-${link.code}`);
    if (!target) return;

    const itemYear = item.year ?? sourceYear;
    if (item.code === target.code && itemYear === target.year) return;
    if (issues.some((issue) => issue.bodyIndex === bodyIndex)) return;

    issues.push({
      type: "frontmatter-mismatch",
      fileName,
      sourceYear,
      bodyIndex,
      frontmatterItemIndex,
      line: lineNumberAt(content, item.start),
      link,
      expected: target,
      replaceBody: false,
    });
  });

  return issues;
}

function replaceRanges(content, replacements) {
  let next = content;

  for (const replacement of [...replacements].sort(
    (left, right) => right.start - left.start,
  )) {
    next =
      next.slice(0, replacement.start) +
      replacement.value +
      next.slice(replacement.end);
  }

  return next;
}

function parseFrontmatterItems(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  const frontmatterStart = 4;
  const frontmatter = match[1];
  const relatedStart = frontmatter.search(/^relatedSessions:\s*$/m);
  if (relatedStart < 0) return [];

  const related = frontmatter.slice(relatedStart);
  const itemPattern = /^  - title:\s*["']?(.*?)["']?\s*$/gm;
  const matches = [...related.matchAll(itemPattern)];
  const items = [];

  matches.forEach((itemMatch, index) => {
    const absoluteStart =
      frontmatterStart + relatedStart + itemMatch.index;
    const relativeEnd = matches[index + 1]?.index ?? related.length;
    const block = related.slice(itemMatch.index, relativeEnd);
    const code = block.match(/^    code:\s*["']?(.*?)["']?\s*$/m)?.[1];
    const year = block.match(/^    year:\s*["']?(.*?)["']?\s*$/m)?.[1];
    items.push({
      title: itemMatch[1],
      code,
      year,
      start: absoluteStart,
      end: absoluteStart + block.length,
      block,
    });
  });

  return items;
}

function updateFrontmatterItem(content, itemIndex, expected, sourceYear) {
  if (itemIndex === undefined) return content;

  const items = parseFrontmatterItems(content);
  const item = items[itemIndex];
  if (!item) return content;

  let block = item.block.replace(
    /^    code:\s*["']?.*?["']?\s*$/m,
    `    code: "${expected.code}"`,
  );
  const yearLine = /^    year:\s*["']?.*?["']?\s*$/m;

  if (expected.year !== sourceYear) {
    if (yearLine.test(block)) {
      block = block.replace(yearLine, `    year: "${expected.year}"`);
    } else {
      block = block.replace(
        /^    code:.*$/m,
        (codeLine) => `${codeLine}\n    year: "${expected.year}"`,
      );
    }
  } else {
    block = block.replace(/\n    year:\s*["']?.*?["']?\s*$/m, "");
  }

  return content.slice(0, item.start) + block + content.slice(item.end);
}

function findFrontmatterItemIndexes(content, issues) {
  const items = parseFrontmatterItems(content);
  const used = new Set();
  const indexes = new Map();

  for (const issue of issues) {
    if (issue.frontmatterItemIndex !== undefined) {
      used.add(issue.frontmatterItemIndex);
      indexes.set(issue.bodyIndex, issue.frontmatterItemIndex);
      continue;
    }
    const expectedKey = normalizeTitle(issue.link.label);
    const itemIndex = items.findIndex(
      (item, index) =>
        !used.has(index) && normalizeTitle(item.title) === expectedKey,
    );
    if (itemIndex >= 0) {
      used.add(itemIndex);
      indexes.set(issue.bodyIndex, itemIndex);
    }
  }

  return indexes;
}

function fixedHref(expected) {
  if (rootArticleExists(expected.year, expected.code)) {
    return `/articles/wwdc${expected.year}-${expected.code}`;
  }
  return `https://developer.apple.com/videos/play/wwdc${expected.year}/${expected.code}/`;
}

function applyIssuesToLocale(
  content,
  issues,
  sourceYear,
  frontmatterItemIndexes,
) {
  const links = parseRelatedLinks(content);
  const replacements = [];

  for (const issue of issues) {
    if (issue.replaceBody === false) continue;
    const localeLink = links[issue.bodyIndex];
    if (!localeLink) {
      throw new Error(
        `${issue.fileName}: localized article has no related link at index ${issue.bodyIndex}`,
      );
    }
    replacements.push({
      start: localeLink.hrefStart,
      end: localeLink.hrefEnd,
      value: fixedHref(issue.expected),
    });
  }

  let next = replaceRanges(content, replacements);
  for (const issue of issues) {
    next = updateFrontmatterItem(
      next,
      frontmatterItemIndexes.get(issue.bodyIndex),
      issue.expected,
      sourceYear,
    );
  }
  return next;
}

function main() {
  const { fix, years } = parseArguments(process.argv.slice(2));
  const index = loadSessionIndex();
  const rootFiles = readdirSync(ARTICLES_DIR)
    .filter((fileName) => /^wwdc(\d{4})-.+\.mdx$/.test(fileName))
    .filter((fileName) => years.has(fileName.slice(4, 8)))
    .sort();
  const allIssues = [];
  let changedFiles = 0;

  for (const fileName of rootFiles) {
    const sourceYear = fileName.slice(4, 8);
    const rootPath = join(ARTICLES_DIR, fileName);
    const rootContent = readFileSync(rootPath, "utf8");
    const issues = findIssues(
      rootContent,
      fileName,
      sourceYear,
      index,
    );
    allIssues.push(...issues);

    const repairableIssues = issues.filter((issue) => issue.expected);
    if (!fix || repairableIssues.length === 0) continue;

    const frontmatterItemIndexes = findFrontmatterItemIndexes(
      rootContent,
      repairableIssues,
    );

    for (const locale of LOCALES) {
      const localePath = join(locale.directory, fileName);
      if (!existsSync(localePath)) continue;

      const content = readFileSync(localePath, "utf8");
      const next = applyIssuesToLocale(
        content,
        repairableIssues,
        sourceYear,
        frontmatterItemIndexes,
      );
      if (next !== content) {
        writeFileSync(localePath, next);
        changedFiles += 1;
      }
    }
  }

  const counts = Object.fromEntries(
    [...years]
      .sort()
      .map((year) => [
        year,
        allIssues.filter((issue) => issue.sourceYear === year).length,
      ]),
  );

  if (fix) {
    const unresolved = allIssues.filter((issue) => !issue.expected);
    console.log(
      `Fixed ${allIssues.length - unresolved.length} high-confidence related-session link issue(s) in ${changedFiles} localized file(s).`,
    );
    console.log(`By source year: ${JSON.stringify(counts)}`);
    if (unresolved.length > 0) {
      console.error(
        `${unresolved.length} unresolved internal link(s) still require a verified target.`,
      );
      process.exitCode = 1;
    }
    return;
  }

  if (allIssues.length === 0) {
    console.log(
      `No high-confidence related-session identity errors found for ${[...years].sort().join(", ")}.`,
    );
    return;
  }

  for (const issue of allIssues) {
    const expected = issue.expected
      ? `; expected wwdc${issue.expected.year}-${issue.expected.code}`
      : "";
    console.error(
      `${issue.fileName}:${issue.line} ${issue.type}: "${issue.link.label}" points to wwdc${issue.link.year}-${issue.link.code}${expected}`,
    );
  }
  console.error(`\nBy source year: ${JSON.stringify(counts)}`);
  process.exitCode = 1;
}

main();
