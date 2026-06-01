import fs from 'node:fs/promises';
import path from 'node:path';

import { writeJson } from './fs-utils.js';
import { rawDataFromCollectionHtml } from './html-metadata.js';
import { sessionSupplementMetadataFromHtml } from './session-metadata.js';

export async function fetchHtml(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'user-agent': options.userAgent ?? 'wwdc-quick-look/0.1 no-key local pipeline',
      'accept': 'text/html,application/xhtml+xml'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function fetchRawData(config, options = {}) {
  const url = options.htmlUrl ?? config.collectionUrl;
  const data = rawDataFromCollectionHtml(await fetchHtml(url, options), config);
  if (options.enrichSessionDetails === false) return data;
  return enrichRawDataWithSessionDetails(data, options);
}

async function enrichOneSession(video, options) {
  const pageUrl = String(video?.webPermalink ?? '').trim();
  if (!pageUrl) return;

  try {
    const html = await fetchHtml(pageUrl, options);
    const metadata = sessionSupplementMetadataFromHtml(html, { pageUrl });
    if (metadata.resources.length > 0) video.resources = metadata.resources;
    if (metadata.codeSnippets.length > 0) video.codeSnippets = metadata.codeSnippets;
  } catch (error) {
    video.supplementFetchError = error.message;
  }
}

export async function enrichRawDataWithSessionDetails(rawData, options = {}) {
  const videos = Object.values(rawData?.videos ?? {});
  const concurrency = Math.max(1, Math.floor(Number(options.detailConcurrency ?? options.concurrency ?? 4) || 4));
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < videos.length) {
      const video = videos[nextIndex];
      nextIndex += 1;
      await enrichOneSession(video, options);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, videos.length) }, () => worker()));
  return rawData;
}

export async function ingestRawData(config, options = {}) {
  const data = await fetchRawData(config, options);
  const outputDir = path.resolve(options.outputDir ?? config.rawDir);
  const latestPath = path.join(outputDir, options.latestName ?? 'raw_data.json');

  await fs.mkdir(outputDir, { recursive: true });
  await writeJson(latestPath, data);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const snapshotPath = path.join(outputDir, `raw_data_${config.eventShort}_${config.locale}_${stamp}.json`);
  await writeJson(snapshotPath, data);
  return { rawDataPath: latestPath, snapshotPath, data };
}
