import fs from 'node:fs/promises';

import { timestampUrl } from './event-config.js';
import { formatTimestamp, parseTimestamp } from './format.js';

const TRANSCRIPT_LINE = /^(?<timestamp>(?:(?:\d+:)?\d{1,2}:\d{2})|\d+)\s+(?<text>.+)$/;

export function parseTranscriptText(content) {
  return String(content ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(TRANSCRIPT_LINE);
      if (!match?.groups) return null;
      const seconds = parseTimestamp(match.groups.timestamp);
      return {
        seconds,
        timestamp: formatTimestamp(seconds),
        text: match.groups.text.trim()
      };
    })
    .filter(Boolean);
}

export async function readTranscriptFile(filePath) {
  try {
    return parseTranscriptText(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') return [];
    throw error;
  }
}

export function renderTranscriptLines(lines, baseUrl = '') {
  if (!lines || lines.length === 0) return '';
  return lines
    .map((line) => {
      const label = line.timestamp ?? formatTimestamp(line.seconds);
      if (!baseUrl) return `- ${label}: ${line.text}`;
      const url = timestampUrl(baseUrl, line.seconds);
      return `- [${label}](${url}): ${line.text}`;
    })
    .join('\n');
}
