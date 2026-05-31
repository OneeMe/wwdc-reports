import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import rawData from '../fixtures/raw_data_minimal.json' with { type: 'json' };
import { createEventConfig } from '../../src/wwdc-reports/event-config.js';
import { writeJson } from '../../src/wwdc-reports/fs-utils.js';
import { materializeIndex, materializeSessions, renderSessionMarkdown, sessionFilename } from '../../src/wwdc-reports/materialize.js';
import { parseTranscriptText, renderTranscriptLines } from '../../src/wwdc-reports/transcript.js';

const session = rawData.videos['wwdc2026-101'];

describe('transcripts', () => {
  it('parses supported transcript line formats and skips malformed lines', () => {
    const lines = parseTranscriptText('00:00 Hello\n01:05 World\nbad line\n75 Again');
    assert.deepEqual(lines.map((line) => line.seconds), [0, 65, 75]);
    assert.equal(lines[1].text, 'World');
  });

  it('renders timestamp links safely', () => {
    const markdown = renderTranscriptLines([{ seconds: 65, timestamp: '01:05', text: 'World' }], 'https://example.com/video?locale=en');
    assert.equal(markdown, '- [01:05](https://example.com/video?locale=en&time=65): World');
  });
});

describe('materialize markdown', () => {
  it('renders session markdown without embedding transcript by default', () => {
    const config = createEventConfig({ year: 2026, projectRoot: '/repo' });
    const markdown = renderSessionMarkdown(session, { config, transcriptLines: parseTranscriptText('00:00 Hello') });
    assert.match(markdown, /# What's new in Swift/);
    assert.match(markdown, /## Outline/);
    assert.match(markdown, /Transcript is intentionally not embedded by default/);
    assert.doesNotMatch(markdown, /Hello/);
  });

  it('renders transcript when explicitly requested', () => {
    const config = createEventConfig({ year: 2026, projectRoot: '/repo' });
    const markdown = renderSessionMarkdown(session, {
      config,
      includeTranscript: true,
      transcriptLines: parseTranscriptText('00:00 Hello')
    });
    assert.match(markdown, /\[00:00\]\(https:\/\/developer\.apple\.com\/videos\/play\/wwdc2026\/101\/\?time=0\): Hello/);
  });

  it('uses stable session filenames', () => {
    assert.equal(sessionFilename(session), "101-What's new in Swift.md");
  });

  it('writes session files and index in a temporary yearly workspace', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wwdc-reports-'));
    const config = createEventConfig({ year: 2026, dataRoot: tmp });
    await writeJson(config.rawDataPath, rawData);
    await writeJson(path.join(config.videoJsonDir, 'wwdc2026-101.json'), session);
    await writeJson(path.join(config.videoJsonDir, 'wwdc2026-102.json'), rawData.videos['wwdc2026-102']);
    await fs.mkdir(config.transcriptsDir, { recursive: true });
    await fs.writeFile(path.join(config.transcriptsDir, '101.txt'), '00:00 Hello', 'utf8');

    const sessionFiles = await materializeSessions(config, { includeTranscript: true });
    const indexPath = await materializeIndex(config, rawData);

    assert.equal(sessionFiles.length, 2);
    assert.match(await fs.readFile(sessionFiles[0], 'utf8'), /Hello/);
    assert.match(await fs.readFile(indexPath, 'utf8'), /WWDC26 Sessions by Topic/);
  });
});
