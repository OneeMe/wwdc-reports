import fs from 'node:fs/promises';
import path from 'node:path';

import { writeJson } from './fs-utils.js';
import { rawDataFromCollectionHtml } from './html-metadata.js';

export async function fetchHtml(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'user-agent': options.userAgent ?? 'wwdc-reports/0.1 no-key local pipeline',
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
  return rawDataFromCollectionHtml(await fetchHtml(url, options), config);
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
