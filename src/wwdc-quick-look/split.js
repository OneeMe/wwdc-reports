import path from 'node:path';

import { writeJson } from './fs-utils.js';

export function objectEntries(value) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.map((item, index) => [String(item?.id ?? index), item]);
  }
  return Object.entries(value);
}

export function splitRawData(rawData) {
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    throw new TypeError('rawData must be an object');
  }

  const files = [];
  for (const [key, value] of Object.entries(rawData)) {
    if (key === 'videos') {
      for (const [sessionId, session] of objectEntries(value)) {
        files.push({ relativePath: path.join('videos', `${sessionId}.json`), value: session });
      }
      continue;
    }
    files.push({ relativePath: `${key}.json`, value });
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function writeSplitData(rawData, splitDir) {
  const files = splitRawData(rawData);
  for (const file of files) {
    await writeJson(path.join(splitDir, file.relativePath), file.value);
  }
  return files.map((file) => path.join(splitDir, file.relativePath));
}
