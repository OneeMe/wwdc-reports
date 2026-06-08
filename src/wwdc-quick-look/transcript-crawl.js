import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

import { videoUrl } from './event-config.js';
import { formatTimestamp, sessionCodeFromId } from './format.js';

const DEFAULT_USER_AGENT = 'wwdc-quick-look/0.1 no-key transcript crawler';
const DOH_FALLBACK_HOSTS = new Set(['events-delivery.apple.com']);
const dohAddressCache = new Map();

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

function textFromWebVtt(fragment) {
  return decodeHtmlEntities(String(fragment ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function attributeValue(attributes, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(?<value>[\\s\\S]*?)\\1`, 'i');
  return decodeHtmlEntities(String(attributes ?? '').match(pattern)?.groups?.value ?? '');
}

function hlsAttributeValue(attributeList, name) {
  const pattern = new RegExp(`(?:^|,)${name}=((?<quoted>"(?:[^"\\\\]|\\\\.)*")|(?<bare>[^,]*))`, 'i');
  const match = String(attributeList ?? '').match(pattern);
  const value = match?.groups?.quoted ? match.groups.quoted.slice(1, -1).replace(/\\"/g, '"') : match?.groups?.bare;
  return decodeHtmlEntities(value ?? '');
}

function absoluteUrl(href, baseUrl) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl || 'https://developer.apple.com').toString();
  } catch {
    return '';
  }
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

function parseWebVttTimestamp(value) {
  const match = String(value ?? '').trim().match(/^(?:(?<hours>\d{1,2}):)?(?<minutes>\d{2}):(?<seconds>\d{2})(?:\.(?<millis>\d{1,3}))?$/);
  if (!match) return Number.NaN;
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes);
  const seconds = Number(match.groups.seconds);
  const millis = Number((match.groups.millis ?? '').padEnd(3, '0') || 0);
  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

export function extractTranscriptLinesFromWebVtt(vtt) {
  const blocks = String(vtt ?? '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const lines = [];
  const seen = new Set();

  for (const block of blocks) {
    const blockLines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (blockLines.length === 0 || /^WEBVTT\b/i.test(blockLines[0]) || /^NOTE\b/i.test(blockLines[0])) continue;

    const timingIndex = blockLines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) continue;

    const [startText] = blockLines[timingIndex].split(/\s+-->\s+/, 1);
    const startSeconds = parseWebVttTimestamp(startText);
    if (!Number.isFinite(startSeconds)) continue;

    const seconds = Math.max(0, Math.floor(startSeconds));
    const text = textFromWebVtt(blockLines.slice(timingIndex + 1).join('\n'));
    if (!text) continue;

    const key = `${seconds}\0${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({ seconds, timestamp: formatTimestamp(seconds), text });
  }

  return lines;
}

export function videoPlaylistUrlsFromHtml(html, pageUrl = 'https://developer.apple.com') {
  const source = String(html ?? '');
  const urls = [];
  const seen = new Set();
  const addUrl = (href) => {
    const url = absoluteUrl(href, pageUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  for (const match of source.matchAll(/<meta\b(?<attributes>[^>]*\bproperty=["']og:video(?:_secure_url)?["'][^>]*)>/gi)) {
    addUrl(attributeValue(match.groups.attributes, 'content'));
  }
  for (const match of source.matchAll(/<video\b(?<attributes>[^>]*)>/gi)) {
    addUrl(attributeValue(match.groups.attributes, 'src'));
  }
  for (const match of source.matchAll(/https:\/\/[^"'\s<>]+\.m3u8/gi)) {
    addUrl(match[0]);
  }

  return urls.filter((url) => /\.m3u8(?:[?#]|$)/i.test(url));
}

export function subtitlePlaylistUrlFromMasterPlaylist(masterPlaylist, masterUrl, options = {}) {
  const locale = String(options.locale ?? 'en').toLowerCase();
  const mediaLines = String(masterPlaylist ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^#EXT-X-MEDIA:/i.test(line) && /TYPE=SUBTITLES/i.test(line));

  const subtitleTracks = mediaLines.map((line) => {
    const attributes = line.slice(line.indexOf(':') + 1);
    return {
      language: hlsAttributeValue(attributes, 'LANGUAGE').toLowerCase(),
      name: hlsAttributeValue(attributes, 'NAME'),
      uri: hlsAttributeValue(attributes, 'URI'),
      defaultTrack: /^YES$/i.test(hlsAttributeValue(attributes, 'DEFAULT'))
    };
  }).filter((track) => track.uri);

  const matched = subtitleTracks.find((track) => track.language === locale)
    ?? subtitleTracks.find((track) => track.language.split('-')[0] === locale.split('-')[0])
    ?? subtitleTracks.find((track) => track.defaultTrack)
    ?? subtitleTracks[0];

  return matched ? absoluteUrl(matched.uri, masterUrl) : '';
}

export function mediaPlaylistSegmentUrls(mediaPlaylist, playlistUrl) {
  return String(mediaPlaylist ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => absoluteUrl(line, playlistUrl))
    .filter(Boolean);
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

async function countTextLines(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return text.split('\n').filter((line) => line.trim()).length;
}

function headersForFetch(options = {}) {
  return {
    'user-agent': options.userAgent ?? DEFAULT_USER_AGENT,
    'accept': options.accept ?? 'text/html,application/xhtml+xml'
  };
}

function isReservedResolverAddress(address) {
  return /^198\.18\./.test(String(address ?? '')) || /^198\.19\./.test(String(address ?? ''));
}

async function shouldUseDohFallback(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  if (!DOH_FALLBACK_HOSTS.has(hostname)) return false;

  try {
    const resolved = await dns.lookup(hostname, { family: 4 });
    return isReservedResolverAddress(resolved.address);
  } catch {
    return true;
  }
}

async function resolveHostWithDoh(hostname) {
  if (dohAddressCache.has(hostname)) return dohAddressCache.get(hostname);

  const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
    headers: { 'accept': 'application/dns-json' }
  });
  if (!response.ok) throw new Error(`DoH lookup failed for ${hostname}: ${response.status} ${response.statusText}`);

  const payload = await response.json();
  const addresses = (payload.Answer ?? [])
    .filter((answer) => answer.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(answer.data))
    .map((answer) => answer.data)
    .filter((address) => !isReservedResolverAddress(address));

  if (addresses.length === 0) throw new Error(`DoH lookup found no usable A records for ${hostname}`);
  dohAddressCache.set(hostname, addresses);
  return addresses;
}

function httpsGetTextWithAddress(url, headers, address) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      headers,
      lookup: (hostname, options, callback) => {
        if (options?.all) callback(null, [{ address, family: 4 }]);
        else callback(null, address, 4);
      },
      timeout: 30000
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        const redirected = absoluteUrl(response.headers.location, url);
        httpsGetTextWithAddress(redirected, headers, address).then(resolve, reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`${response.statusCode} ${response.statusMessage}`));
        return;
      }

      response.setEncoding('utf8');
      let text = '';
      response.on('data', (chunk) => { text += chunk; });
      response.on('end', () => resolve(text));
    });

    request.on('timeout', () => request.destroy(new Error(`Timed out fetching ${url}`)));
    request.on('error', reject);
    request.end();
  });
}

async function fetchTextWithDohFallback(url, headers) {
  const hostname = new URL(url).hostname;
  const addresses = await resolveHostWithDoh(hostname);
  const failures = [];

  for (const address of addresses) {
    try {
      return await httpsGetTextWithAddress(url, headers, address);
    } catch (error) {
      failures.push(`${address}: ${error.message}`);
    }
  }

  throw new Error(`DoH fallback failed for ${url}: ${failures.join('; ')}`);
}

export async function fetchTranscriptHtml(url, options = {}) {
  const attempts = Math.max(1, Math.floor(Number(options.fetchAttempts ?? 3) || 3));
  const headers = headersForFetch(options);
  let lastError;

  if (await shouldUseDohFallback(url)) {
    return fetchTextWithDohFallback(url, headers);
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  const cause = lastError?.cause?.code ?? lastError?.cause?.message ?? lastError?.message ?? 'unknown error';
  if (DOH_FALLBACK_HOSTS.has(new URL(url).hostname)) {
    return fetchTextWithDohFallback(url, headers);
  }
  throw new Error(`Failed to fetch ${url}: ${cause}`);
}

async function fetchText(url, options = {}) {
  return fetchTranscriptHtml(url, options);
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function transcriptLinesFromHls(html, pageUrl, options = {}) {
  const playlistUrls = videoPlaylistUrlsFromHtml(html, pageUrl);
  for (const playlistUrl of playlistUrls) {
    const masterPlaylist = await fetchText(playlistUrl, { ...options, accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*' });
    const subtitlePlaylistUrl = subtitlePlaylistUrlFromMasterPlaylist(masterPlaylist, playlistUrl, { locale: options.locale });
    if (!subtitlePlaylistUrl) continue;

    const subtitlePlaylist = await fetchText(subtitlePlaylistUrl, { ...options, accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*' });
    const segmentUrls = mediaPlaylistSegmentUrls(subtitlePlaylist, subtitlePlaylistUrl);
    const segmentConcurrency = Math.max(1, Math.floor(Number(options.segmentConcurrency ?? 8) || 8));
    const segments = await mapConcurrent(segmentUrls, segmentConcurrency, (segmentUrl) => (
      fetchText(segmentUrl, { ...options, accept: 'text/vtt,text/plain,*/*' })
    ));

    const lines = extractTranscriptLinesFromWebVtt(segments.join('\n\n'));
    if (lines.length > 0) return lines;
  }

  return [];
}

async function crawlOneTranscript(entry, options) {
  const outputPath = path.join(options.outputDir, `${entry.sessionCode}.txt`);
  if (!options.force && await isNonEmptyFile(outputPath)) {
    return { status: 'skipped', entry, outputPath, lineCount: await countTextLines(outputPath) };
  }

  const html = await fetchTranscriptHtml(entry.url, options);
  let lines = extractTranscriptLinesFromHtml(html);
  if (lines.length === 0) {
    lines = await transcriptLinesFromHls(html, entry.url, options);
  }
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
