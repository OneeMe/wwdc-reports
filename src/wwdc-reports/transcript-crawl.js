import fs from 'node:fs/promises';
import path from 'node:path';

import { videoUrl } from './event-config.js';
import { formatTimestamp, sessionCodeFromId } from './format.js';

const DEFAULT_USER_AGENT = 'wwdc-reports/0.1 no-key transcript crawler';

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

function transcriptSection(html) {
  const start = String(html ?? '').search(/<section\b[^>]*id=["']transcript-content["'][^>]*>/i);
  if (start < 0) return '';
  const fromStart = html.slice(start);
  const openEnd = fromStart.indexOf('>');
  if (openEnd < 0) return '';
  const bodyStart = start + openEnd + 1;
  const close = html.slice(bodyStart).search(/<\/section>/i);
  return close < 0 ? html.slice(bodyStart) : html.slice(bodyStart, bodyStart + close);
}

export function extractTranscriptLinesFromHtml(html) {
  const section = transcriptSection(html);
  if (!section) return [];

  const lines = [];
  const seen = new Set();
  const sentencePattern = /<span\b[^>]*data-start=["'](?<start>\d+(?:\.\d+)?)["'][^>]*>(?<text>[\s\S]*?)<\/span>/gi;
  for (const match of section.matchAll(sentencePattern)) {
    const seconds = Math.max(0, Math.floor(Number(match.groups.start)));
    const text = textFromHtml(match.groups.text);
    if (!text) continue;
    const key = `${seconds}\0${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({ seconds, timestamp: formatTimestamp(seconds), text });
  }
  return lines;
}

export function renderTranscriptText(lines) {
  return (lines ?? [])
    .map((line) => `${line.timestamp ?? formatTimestamp(line.seconds)} ${line.text}`)
    .join('\n');
}

export function videoEntriesFromRawData(rawData, config) {
  const videos = Array.isArray(rawData?.videos) ? rawData.videos : Object.values(rawData?.videos ?? {});
  return videos
    .map((video) => {
      const id = video?.id ?? video?.identifier ?? video?.eventContentId;
      const sessionCode = String(video?.eventContentId ?? sessionCodeFromId(id)).trim();
      if (!sessionCode) return null;
      return {
        id: String(id ?? `${config.eventId}-${sessionCode}`),
        sessionCode,
        title: video?.title ?? '',
        url: String(video?.webPermalink ?? video?.url ?? '').trim() || videoUrl(config, sessionCode)
      };
    })
    .filter(Boolean);
}

async function isNonEmptyFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() && stat.size > 0;
  } catch (error) {
    if (error && error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function fetchTranscriptHtml(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'user-agent': options.userAgent ?? DEFAULT_USER_AGENT,
      'accept': 'text/html,application/xhtml+xml'
    }
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return response.text();
}

async function crawlOneTranscript(entry, options) {
  const outputPath = path.join(options.outputDir, `${entry.sessionCode}.txt`);
  if (!options.force && await isNonEmptyFile(outputPath)) {
    return { status: 'skipped', entry, outputPath };
  }

  const html = await fetchTranscriptHtml(entry.url, options);
  const lines = extractTranscriptLinesFromHtml(html);
  if (lines.length === 0) return { status: 'missing', entry, outputPath, message: `No timestamped transcript lines found at ${entry.url}` };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${renderTranscriptText(lines)}\n`, 'utf8');
  return { status: 'written', entry, outputPath, lineCount: lines.length };
}

export async function crawlTranscripts(rawData, config, options = {}) {
  const outputDir = path.resolve(options.outputDir ?? path.join(process.cwd(), 'transcripts-en'));
  const limit = Number(options.limit ?? 0);
  const entries = videoEntriesFromRawData(rawData, config).slice(0, limit > 0 ? limit : undefined);
  const concurrency = Math.max(1, Math.floor(Number(options.concurrency ?? 4) || 4));
  const manifestPath = path.join(outputDir, options.manifestName ?? '_manifest.json');
  const result = {
    total: entries.length,
    written: 0,
    skipped: 0,
    missing: 0,
    failed: 0,
    failures: [],
    missingTranscripts: [],
    sessions: [],
    outputDir,
    manifestPath
  };
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < entries.length) {
      const entry = entries[nextIndex];
      nextIndex += 1;
      try {
        const item = await crawlOneTranscript(entry, { ...options, outputDir });
        if (item.status === 'written') result.written += 1;
        if (item.status === 'skipped') result.skipped += 1;
        if (item.status === 'missing') {
          result.missing += 1;
          result.missingTranscripts.push({ sessionCode: entry.sessionCode, url: entry.url, message: item.message });
        }
        result.sessions.push({
          sessionCode: entry.sessionCode,
          title: entry.title,
          url: entry.url,
          status: item.status,
          file: path.basename(item.outputPath),
          lineCount: item.lineCount,
          message: item.message
        });
      } catch (error) {
        result.failed += 1;
        result.failures.push({ sessionCode: entry.sessionCode, url: entry.url, message: error.message });
        result.sessions.push({
          sessionCode: entry.sessionCode,
          title: entry.title,
          url: entry.url,
          status: 'failed',
          file: `${entry.sessionCode}.txt`,
          message: error.message
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()));
  result.sessions.sort((left, right) => entries.findIndex((entry) => entry.sessionCode === left.sessionCode) - entries.findIndex((entry) => entry.sessionCode === right.sessionCode));
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify({
    year: config.year,
    eventId: config.eventId,
    eventShort: config.eventShort,
    locale: config.locale,
    generatedAt: new Date().toISOString(),
    totals: {
      total: result.total,
      written: result.written,
      skipped: result.skipped,
      missing: result.missing,
      failed: result.failed
    },
    sessions: result.sessions
  }, null, 2)}\n`, 'utf8');
  return result;
}
