import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import rawData from '../fixtures/raw_data_minimal.json' with { type: 'json' };
import { main, parseArgs } from '../../src/wwdc-reports/cli.js';
import { listJsonFiles, pathExists, readJson, writeJson } from '../../src/wwdc-reports/fs-utils.js';

function makeIo() {
  let output = '';
  return {
    stdout: { write: (chunk) => { output += chunk; } },
    stderr: { write: () => {} },
    get output() { return output; }
  };
}

async function withMockFetchRouter(handler, fn) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(String(url), options);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe('fs utilities', () => {
  it('writes pretty json and creates parent directories', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-fs-'));
    const file = path.join(tmp, 'nested', 'file.json');
    await writeJson(file, { title: '中文' });
    assert.equal(await fs.readFile(file, 'utf8'), '{\n  "title": "中文"\n}\n');
    assert.deepEqual(await readJson(file), { title: '中文' });
  });

  it('checks existence and lists json files only', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-fs-'));
    await fs.writeFile(path.join(tmp, 'b.json'), '{}');
    await fs.writeFile(path.join(tmp, 'a.json'), '{}');
    await fs.writeFile(path.join(tmp, 'c.txt'), 'no');
    await fs.mkdir(path.join(tmp, 'folder.json'));
    assert.equal(await pathExists(path.join(tmp, 'a.json')), true);
    assert.equal(await pathExists(path.join(tmp, 'missing.json')), false);
    assert.deepEqual((await listJsonFiles(tmp)).map((file) => path.basename(file)), ['a.json', 'b.json']);
  });
});

describe('cli', () => {
  it('parses repeated topic flags and booleans', () => {
    assert.deepEqual(parseArgs(['query-topic', '--topic', 'Swift', '--topic=Developer Tools', '--with-title']), {
      _: ['query-topic'],
      topic: ['Swift', 'Developer Tools'],
      'with-title': true
    });
  });

  it('prints help', async () => {
    const io = makeIo();
    assert.equal(await main(['help'], io), 0);
    assert.match(io.output, /No-key WWDC raw metadata and transcript archiver/);
  });

  it('runs crawl as one command: fetch metadata then crawl transcripts', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-cli-crawl-'));
    const io = makeIo();
    const html = '<section id="transcript-content"><span data-start="7">Hello WWDC</span></section>';

    const collectionHtml = `
      <a href="/videos/play/wwdc2026/101/" class="vc-card">
        <h5 class="vc-card__title">What's new in Swift</h5>
        <span class="vc-card__keywords hidden"
          data-filter-description-en="Learn about Swift language updates."
          data-filter-collectionid="wwdc26"
          data-filter-topics="Swift"></span>
      </a>`;

    await withMockFetchRouter(async (url) => {
      if (url === 'https://developer.apple.com/videos/wwdc2026/') {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => collectionHtml
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => html
      };
    }, async (calls) => {
      assert.equal(await main(['crawl', '--year', '2026', '--locale', 'en', '--out-dir', tmp, '--limit', '1'], io), 0);
      assert.equal(calls[0].url, 'https://developer.apple.com/videos/wwdc2026/');
      assert.equal(calls[1].url, 'https://developer.apple.com/videos/play/wwdc2026/101/');
      assert.equal('authorization' in calls[0].options.headers, false);
      assert.equal('cookie' in calls[1].options.headers, false);
      assert.equal(await pathExists(path.join(tmp, 'raw_data.json')), true);
      assert.equal(await fs.readFile(path.join(tmp, 'transcripts-en', '101.txt'), 'utf8'), '00:07 Hello WWDC\n');
      assert.equal(await pathExists(path.join(tmp, 'transcripts-en', '_manifest.json')), true);
      const manifest = await readJson(path.join(tmp, 'transcripts-en', '_manifest.json'));
      assert.deepEqual(manifest.totals, { total: 1, written: 1, skipped: 0, missing: 0, failed: 0 });
      assert.match(io.output, /Wrote .*raw_data\.json/);
      assert.match(io.output, /Transcript manifest: .*_manifest\.json/);
      assert.match(io.output, /Transcript output: .*transcripts-en/);
      assert.match(io.output, /Total: 1, written: 1, skipped: 0, missing: 0, failed: 0/);
    });
  });

  it('runs wwdc25 as a WWDC 2025 crawl shortcut', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-cli-crawl-'));
    const io = makeIo();

    await withMockFetchRouter(async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '<main>No videos posted yet.</main>'
      };
    }, async (calls) => {
      assert.equal(await main(['wwdc25', '--out-dir', tmp], io), 0);
      assert.equal(calls[0].url, 'https://developer.apple.com/videos/wwdc2025/');
      assert.equal(await pathExists(path.join(tmp, 'raw_data.json')), true);
      assert.equal((await listJsonFiles(tmp)).filter((file) => /^raw_data_wwdc25_en_\d{8}T\d{6}Z\.json$/.test(path.basename(file))).length, 1);
      assert.equal(await pathExists(path.join(tmp, 'transcripts-en', '_manifest.json')), true);
      assert.match(io.output, /Total: 0, written: 0, skipped: 0, missing: 0, failed: 0/);
    });
  });

  it('defaults to crawl when no command is provided', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-cli-default-'));
    const io = makeIo();

    await withMockFetchRouter(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '<main>No videos posted yet.</main>'
    }), async (calls) => {
      assert.equal(await main(['--year', '2026', '--out-dir', tmp], io), 0);
      assert.equal(calls[0].url, 'https://developer.apple.com/videos/wwdc2026/');
      assert.match(io.output, /Wrote .*raw_data\.json/);
      assert.equal(await pathExists(path.join(tmp, 'raw_data.json')), true);
    });
  });

  it('runs query-topic against a fixture raw data file', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-cli-'));
    const rawPath = path.join(tmp, 'raw_data.json');
    await writeJson(rawPath, rawData);
    const io = makeIo();
    assert.equal(await main(['query-topic', '--year', '2026', '--raw-data', rawPath, '--topic', 'Swift', '--with-title'], io), 0);
    assert.match(io.output, /Topic: Swift/);
    assert.match(io.output, /101\tWhat's new in Swift/);
  });

  it('initializes a yearly workspace', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-cli-'));
    const io = makeIo();
    assert.equal(await main(['init-year', '--year', '2026', '--data-root', tmp], io), 0);
    assert.equal(await pathExists(path.join(tmp, 'raw', 'jsons', 'videos')), true);
    assert.equal((await readJson(path.join(tmp, 'event.json'))).eventId, 'wwdc2026');
  });
});
