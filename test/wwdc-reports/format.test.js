import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDuration, formatTimestamp, parseTimestamp, sanitizeFilename, sessionCodeFromId } from '../../src/wwdc-reports/format.js';

describe('format utilities', () => {
  it('sanitizes filenames without dropping unicode titles', () => {
    assert.equal(sanitizeFilename('  Swift 的新功能  '), 'Swift 的新功能');
    assert.equal(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j'), 'a_b_c_d_e_f_g_h_i_j');
    assert.equal(sanitizeFilename('', 'fallback'), 'fallback');
    assert.equal(sanitizeFilename('x'.repeat(129)).length, 128);
  });

  it('extracts session code from event scoped ids', () => {
    assert.equal(sessionCodeFromId('wwdc2025-233'), '233');
    assert.equal(sessionCodeFromId('event-foo-233'), '233');
    assert.equal(sessionCodeFromId(233), '233');
    assert.equal(sessionCodeFromId(null), '');
  });

  it('formats timestamps', () => {
    assert.equal(formatTimestamp(0), '00:00');
    assert.equal(formatTimestamp(65.9), '01:05');
    assert.equal(formatTimestamp(3661), '01:01:01');
    assert.equal(formatTimestamp(-1), '00:00');
  });

  it('parses timestamps defensively', () => {
    assert.equal(parseTimestamp('65.9'), 65);
    assert.equal(parseTimestamp('01:05'), 65);
    assert.equal(parseTimestamp('01:02:03'), 3723);
    assert.equal(parseTimestamp('-1'), 0);
    assert.equal(parseTimestamp('-1:10'), 0);
    assert.equal(parseTimestamp('1:2:3:4'), 0);
    assert.equal(parseTimestamp('abc'), 0);
  });

  it('formats durations', () => {
    assert.equal(formatDuration(0), '0 s');
    assert.equal(formatDuration(59), '59 s');
    assert.equal(formatDuration(60), '1 min');
    assert.equal(formatDuration(61.9), '1 min 1 s');
    assert.equal(formatDuration('abc'), '');
  });
});
