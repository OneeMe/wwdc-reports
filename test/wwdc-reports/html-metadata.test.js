import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEventConfig } from '../../src/wwdc-reports/event-config.js';
import { rawDataFromCollectionHtml } from '../../src/wwdc-reports/html-metadata.js';

const COLLECTION_HTML = `
<a href="/videos/play/wwdc2025/238/" class="vc-card tile">
  <h5 class="vc-card__title">Customize your app for Assistive Access</h5>
  <span class="vc-card__keywords hidden"
    data-filter-description-en="Assistive access is a focused iOS experience."
    data-filter-collectionid="wwdc25"
    data-filter-platform="ios|ipados"
    data-filter-topics="Accessibility &amp; Inclusion|Design"></span>
</a>`;

describe('Apple collection HTML metadata', () => {
  it('builds raw metadata from public collection cards', () => {
    const config = createEventConfig({ year: '2025' });
    const rawData = rawDataFromCollectionHtml(COLLECTION_HTML, config);
    assert.deepEqual(rawData.events.wwdc2025, {
      id: 'wwdc2025',
      name: 'WWDC25',
      eventShort: 'wwdc25'
    });
    assert.deepEqual(rawData.videos['wwdc2025-238'], {
      id: 'wwdc2025-238',
      eventId: 'wwdc2025',
      eventContentId: '238',
      title: 'Customize your app for Assistive Access',
      description: 'Assistive access is a focused iOS experience.',
      webPermalink: 'https://developer.apple.com/videos/play/wwdc2025/238/',
      primaryTopicID: 'accessibility-inclusion',
      topicIds: ['accessibility-inclusion', 'design']
    });
    assert.deepEqual(rawData.topics['accessibility-inclusion'], {
      id: 'accessibility-inclusion',
      title: 'Accessibility & Inclusion'
    });
  });
});
