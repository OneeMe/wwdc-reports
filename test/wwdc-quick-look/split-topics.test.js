import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import rawData from '../fixtures/raw_data_minimal.json' with { type: 'json' };
import { splitRawData } from '../../src/wwdc-quick-look/split.js';
import { findTopics, getTopicList, sessionsForTopics, topicsAndVideos } from '../../src/wwdc-quick-look/topics.js';

describe('split raw data', () => {
  it('splits videos into per-session files and keeps other top-level keys', () => {
    const files = splitRawData(rawData);
    assert.deepEqual(files.map((file) => file.relativePath), [
      'events.json',
      'topics.json',
      'videos/wwdc2026-101.json',
      'videos/wwdc2026-102.json'
    ]);
  });

  it('rejects invalid raw data', () => {
    assert.throws(() => splitRawData(null), /rawData must be an object/);
    assert.throws(() => splitRawData([]), /rawData must be an object/);
  });
});

describe('topic queries', () => {
  it('lists topics and finds exact or case-insensitive matches', () => {
    assert.deepEqual(getTopicList(rawData).map((topic) => topic.title), ['Developer Tools', 'Swift']);
    const found = findTopics(rawData, ['swift', 'Missing']);
    assert.deepEqual(found.matches.map((topic) => topic.title), ['Swift']);
    assert.deepEqual(found.unmatched, ['Missing']);
  });

  it('returns sessions grouped by matching topic', () => {
    const found = findTopics(rawData, ['Swift']);
    const grouped = sessionsForTopics(rawData, found.matches);
    assert.equal(grouped.Swift.length, 1);
    assert.equal(grouped.Swift[0].code, '101');
    assert.equal(grouped.Swift[0].title, "What's new in Swift");
  });

  it('materializes topic to video mapping', () => {
    const mapping = topicsAndVideos(rawData);
    assert.equal(mapping.length, 2);
    assert.equal(mapping.find((topic) => topic.name === 'Swift').videos[0].session_id, 'wwdc2026-101');
  });
});
