import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sessionSupplementMetadataFromHtml } from '../../src/wwdc-reports/session-metadata.js';

const SESSION_HTML = `
<h2>Resources</h2>
<ul class="links small">
  <li class="document"><a href="https://developer.apple.com/documentation/SwiftUI/AssistiveAccess" target="_blank">AssistiveAccess</a></li>
  <li class="download"><a href="https://github.com/apple/container" target="_blank">Container</a></li>
  <li class="guide"><a href="/documentation/FoundationModels/generate-dynamic-game-content-with-guided-generation-and-tools">Generate dynamic game content</a></li>
  <li class="download">
    <ul class="options">
      <li><a href="https://devstreaming-cdn.apple.com/videos/wwdc/2025/238/downloads/wwdc2025-238_hd.mp4?dl=1">HD Video</a></li>
      <li><a href="https://devstreaming-cdn.apple.com/videos/wwdc/2025/238/downloads/wwdc2025-238_sd.mp4?dl=1">SD Video</a></li>
    </ul>
  </li>
</ul>

<li class="supplement sample-code" data-supplement-id="sample-code">
  <section>
    <ul class="no-bullet padding-top-small margin-bottom">
      <li class="sample-code-main-container">
        <button class="btn-copy-code">Copy Code</button>
        <p>5:21 - <a class="jump-to-time-sample" href="/videos/play/wwdc2025/238/?time=321" data-start-time="321">Create a scene for Assistive Access</a></p>
        <pre class="code-source"><code><span class="syntax-comment">// Create a scene</span>

<span class="syntax-keyword">import</span> SwiftUI
<span class="syntax-keyword">struct</span> <span class="syntax-title class_">DemoView</span>: <span class="syntax-title class_">View</span> {
  <span class="syntax-keyword">var</span> body: <span class="syntax-keyword">some</span> <span class="syntax-type">View</span> {
    Text(<span class="syntax-string">&quot;Hello&quot;</span>)
  }
}</code></pre>
      </li>
    </ul>
  </section>
</li>`;

describe('Apple session supplement metadata', () => {
  it('extracts code snippets and top-level session resources', () => {
    const metadata = sessionSupplementMetadataFromHtml(SESSION_HTML, {
      pageUrl: 'https://developer.apple.com/videos/play/wwdc2025/238/'
    });

    assert.deepEqual(metadata.resources, [
      {
        type: 'document',
        title: 'AssistiveAccess',
        url: 'https://developer.apple.com/documentation/SwiftUI/AssistiveAccess'
      },
      {
        type: 'download',
        title: 'Container',
        url: 'https://github.com/apple/container'
      },
      {
        type: 'guide',
        title: 'Generate dynamic game content',
        url: 'https://developer.apple.com/documentation/FoundationModels/generate-dynamic-game-content-with-guided-generation-and-tools'
      }
    ]);

    assert.deepEqual(metadata.codeSnippets, [
      {
        title: 'Create a scene for Assistive Access',
        seconds: 321,
        timestamp: '5:21',
        url: 'https://developer.apple.com/videos/play/wwdc2025/238/?time=321',
        code: '// Create a scene\n\nimport SwiftUI\nstruct DemoView: View {\n  var body: some View {\n    Text("Hello")\n  }\n}'
      }
    ]);
  });
});
