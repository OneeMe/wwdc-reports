import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import rawData from '../fixtures/raw_data_minimal.json' with { type: 'json' };
import { main } from '../../src/wwdc-quick-look/cli.js';
import { createEventConfig } from '../../src/wwdc-quick-look/event-config.js';
import {
  crawlTranscripts,
  extractTranscriptLinesFromHtml,
  renderTranscriptText,
  videoEntriesFromRawData
} from '../../src/wwdc-quick-look/transcript-crawl.js';

const TRANSCRIPT_HTML = `<!doctype html>
<section id="transcript-content">
  <p>
    <span class="sentence"><span data-start="7.0">Hello &amp; welcome, </span></span>
    <span class="sentence"><span data-start="9.9">to <strong>WWDC</strong>.</span></span>
  </p>
</section>`;

function makeIo() {
  let output = '';
  return {
    stdout: { write: (chunk) => { output += chunk; } },
    stderr: { write: () => {} },
    get output() { return output; }
  };
}

async function withMockHtmlFetch(html, fn) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => html
    };
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe('transcript crawler', () => {
  it('extracts timestamped transcript lines from Apple video HTML', () => {
    assert.deepEqual(extractTranscriptLinesFromHtml(TRANSCRIPT_HTML), [
      { seconds: 7, timestamp: '00:07', text: 'Hello & welcome,' },
      { seconds: 9, timestamp: '00:09', text: 'to WWDC.' }
    ]);
  });

  it('renders transcript text in the local raw format', () => {
    assert.equal(renderTranscriptText([
      { seconds: 7, timestamp: '00:07', text: 'Hello' },
      { seconds: 75, text: 'Later' }
    ]), '00:07 Hello\n01:15 Later');
  });

  it('derives transcript crawl entries from raw metadata', () => {
    const config = createEventConfig({ year: '2026' });
    assert.deepEqual(videoEntriesFromRawData(rawData, config).map((entry) => ({ sessionCode: entry.sessionCode, url: entry.url })), [
      { sessionCode: '101', url: 'https://developer.apple.com/videos/play/wwdc2026/101/' },
      { sessionCode: '102', url: 'https://developer.apple.com/videos/play/wwdc2026/102/' }
    ]);
  });

  it('prefers metadata webPermalink for localized transcript pages', () => {
    const config = createEventConfig({ year: '2026' });
    const localizedRawData = {
      videos: {
        'wwdc2026-233': {
          id: 'wwdc2026-233',
          eventContentId: 233,
          webPermalink: 'https://developer.apple.com/cn/videos/play/wwdc2026/233/'
        }
      }
    };
    assert.deepEqual(videoEntriesFromRawData(localizedRawData, config).map((entry) => ({ sessionCode: entry.sessionCode, url: entry.url })), [
      { sessionCode: '233', url: 'https://developer.apple.com/cn/videos/play/wwdc2026/233/' }
    ]);
  });

  it('keeps raw metadata video order for smoke-test limits', () => {
    const config = createEventConfig({ year: '2026' });
    const unorderedRawData = {
      videos: {
        'wwdc2026-233': { id: 'wwdc2026-233', title: 'First in metadata' },
        'wwdc2026-101': { id: 'wwdc2026-101', title: 'Second in metadata' }
      }
    };
    assert.deepEqual(videoEntriesFromRawData(unorderedRawData, config).map((entry) => entry.sessionCode), ['233', '101']);
  });

  it('crawls transcript files and sends no credential headers', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-transcripts-'));
    const config = createEventConfig({ year: '2026' });

    await withMockHtmlFetch(TRANSCRIPT_HTML, async (calls) => {
      const result = await crawlTranscripts(rawData, config, { outputDir: tmp, limit: 1 });
      assert.equal(result.written, 1);
      assert.equal(result.skipped, 0);
      assert.equal(result.missing, 0);
      assert.equal(result.failed, 0);
      assert.equal(calls[0].url, 'https://developer.apple.com/videos/play/wwdc2026/101/');
      assert.equal('authorization' in calls[0].options.headers, false);
      assert.equal('x-api-key' in calls[0].options.headers, false);
      assert.equal('cookie' in calls[0].options.headers, false);
      assert.equal(await fs.readFile(path.join(tmp, '101.txt'), 'utf8'), '00:07 Hello & welcome,\n00:09 to WWDC.\n');
      const manifest = JSON.parse(await fs.readFile(path.join(tmp, '_manifest.json'), 'utf8'));
      assert.deepEqual(manifest.totals, { total: 1, written: 1, skipped: 0, missing: 0, failed: 0 });
      assert.equal(manifest.sessions[0].sessionCode, '101');
      assert.equal(manifest.sessions[0].status, 'written');
      assert.equal(manifest.sessions[0].file, '101.txt');
    });
  });

  it('treats pages without timestamped transcript lines as missing instead of failed', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-transcripts-'));
    const config = createEventConfig({ year: '2026' });
    const emptyTranscriptHtml = '<section id="transcript-content"></section>';

    await withMockHtmlFetch(emptyTranscriptHtml, async () => {
      const result = await crawlTranscripts(rawData, config, { outputDir: tmp, limit: 1 });
      assert.equal(result.written, 0);
      assert.equal(result.skipped, 0);
      assert.equal(result.missing, 1);
      assert.equal(result.failed, 0);
      assert.match(result.missingTranscripts[0].message, /No timestamped transcript lines found/);
      const manifest = JSON.parse(await fs.readFile(path.join(tmp, '_manifest.json'), 'utf8'));
      assert.equal(manifest.sessions[0].status, 'missing');
      assert.match(manifest.sessions[0].message, /No timestamped transcript lines found/);
    });
  });

  it('skips existing files unless forced', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-transcripts-'));
    await fs.writeFile(path.join(tmp, '101.txt'), 'existing\n', 'utf8');
    const config = createEventConfig({ year: '2026' });

    await withMockHtmlFetch(TRANSCRIPT_HTML, async (calls) => {
      const result = await crawlTranscripts(rawData, config, { outputDir: tmp, limit: 1 });
      assert.equal(result.written, 0);
      assert.equal(result.skipped, 1);
      assert.equal(calls.length, 0);
      assert.equal(await fs.readFile(path.join(tmp, '101.txt'), 'utf8'), 'existing\n');
    });

    await withMockHtmlFetch(TRANSCRIPT_HTML, async (calls) => {
      const result = await crawlTranscripts(rawData, config, { outputDir: tmp, limit: 1, force: true });
      assert.equal(result.written, 1);
      assert.equal(result.skipped, 0);
      assert.equal(calls.length, 1);
      assert.equal(await fs.readFile(path.join(tmp, '101.txt'), 'utf8'), '00:07 Hello & welcome,\n00:09 to WWDC.\n');
    });
  });

  it('runs the transcripts command against a raw metadata file', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-transcripts-'));
    const rawPath = path.join(tmp, 'raw_data.json');
    const outDir = path.join(tmp, 'out');
    await fs.writeFile(rawPath, JSON.stringify(rawData), 'utf8');
    const io = makeIo();

    await withMockHtmlFetch(TRANSCRIPT_HTML, async () => {
      assert.equal(await main(['transcripts', '--year', '2026', '--raw-data', rawPath, '--out-dir', outDir, '--limit', '1'], io), 0);
      assert.match(io.output, /Total: 1, written: 1, skipped: 0, missing: 0, failed: 0/);
      assert.equal(await fs.readFile(path.join(outDir, '101.txt'), 'utf8'), '00:07 Hello & welcome,\n00:09 to WWDC.\n');
    });
  });
});
