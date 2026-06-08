import { formatTimestamp } from './format.js';

function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function textFromHtml(fragment) {
  return decodeHtmlEntities(String(fragment ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim());
}

function codeFromHtml(fragment) {
  return decodeHtmlEntities(String(fragment ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n?/g, '\n'))
    .trim();
}

function attributeValue(attributes, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(?<value>[\\s\\S]*?)\\1`, 'i');
  return decodeHtmlEntities(String(attributes ?? '').match(pattern)?.groups?.value ?? '');
}

function absoluteUrl(href, baseUrl) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl || 'https://developer.apple.com').toString();
  } catch {
    return '';
  }
}

function firstClass(attributes) {
  return attributeValue(attributes, 'class').split(/\s+/).find(Boolean) ?? 'resource';
}

function resourcesListHtml(html) {
  const source = String(html ?? '');
  const resourcesHeading = source.search(/<h2\b[^>]*>\s*Resources\s*<\/h2>/i);
  if (resourcesHeading < 0) return '';
  const afterHeading = source.slice(resourcesHeading);
  return afterHeading.match(/<ul\b[^>]*class=["'][^"']*\blinks\b[^"']*\bsmall\b[^"']*["'][^>]*>(?<body>[\s\S]*?)<\/ul>/i)?.groups?.body ?? '';
}

export function extractSessionResourcesFromHtml(html, options = {}) {
  const resourcesHtml = resourcesListHtml(html)
    .replace(/<ul\b[^>]*class=["'][^"']*\boptions\b[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, '');
  if (!resourcesHtml) return [];

  const resources = [];
  const seen = new Set();
  const directLinkPattern = /<li\b(?<attributes>[^>]*)>\s*<a\b(?<linkAttributes>[^>]*)>(?<title>[\s\S]*?)<\/a>\s*<\/li>/gi;
  for (const match of resourcesHtml.matchAll(directLinkPattern)) {
    const title = textFromHtml(match.groups.title);
    const url = absoluteUrl(attributeValue(match.groups.linkAttributes, 'href'), options.pageUrl);
    if (!title || !url) continue;
    if (/^(HD|SD) Video$/i.test(title) || url.includes('devstreaming-cdn.apple.com/videos/')) continue;

    const key = `${title}\0${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    resources.push({
      type: firstClass(match.groups.attributes),
      title,
      url
    });
  }
  return resources;
}

export function extractCodeSnippetsFromHtml(html, options = {}) {
  const snippets = [];
  const seen = new Set();
  const snippetPattern = /<li\b(?<attributes>[^>]*class=["'][^"']*\bsample-code-main-container\b[^"']*["'][^>]*)>(?<body>[\s\S]*?)<\/li>/gi;

  for (const match of String(html ?? '').matchAll(snippetPattern)) {
    const body = match.groups.body;
    const label = body.match(/<p\b[^>]*>\s*(?<timestamp>\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*<a\b(?<linkAttributes>[^>]*)>(?<title>[\s\S]*?)<\/a>\s*<\/p>/i);
    const codeHtml = body.match(/<pre\b[^>]*class=["'][^"']*\bcode-source\b[^"']*["'][^>]*>\s*<code\b[^>]*>(?<code>[\s\S]*?)<\/code>\s*<\/pre>/i)?.groups?.code ?? '';
    const code = codeFromHtml(codeHtml);
    if (!code) continue;

    const title = textFromHtml(label?.groups?.title ?? '');
    const seconds = Math.max(0, Math.floor(Number(attributeValue(label?.groups?.linkAttributes ?? '', 'data-start-time')) || 0));
    const url = absoluteUrl(attributeValue(label?.groups?.linkAttributes ?? '', 'href'), options.pageUrl);
    const timestamp = label?.groups?.timestamp ?? formatTimestamp(seconds);
    const key = `${title}\0${seconds}\0${code}`;
    if (seen.has(key)) continue;
    seen.add(key);

    snippets.push({
      title,
      seconds,
      timestamp,
      url,
      code
    });
  }
  return snippets;
}

export function sessionSupplementMetadataFromHtml(html, options = {}) {
  return {
    resources: extractSessionResourcesFromHtml(html, options),
    codeSnippets: extractCodeSnippetsFromHtml(html, options)
  };
}
