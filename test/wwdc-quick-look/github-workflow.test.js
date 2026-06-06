import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('GitHub workflow configuration', () => {
  it('references existing local CLI entrypoints', async () => {
    const workflowPath = path.resolve('.github/workflows/refresh-data.yml');
    const workflow = await fs.readFile(workflowPath, 'utf8');
    const referencedBins = [...workflow.matchAll(/node\s+\.\/(bin\/[^\s]+\.js)\b/g)].map(
      (match) => match[1],
    );

    assert.deepEqual([...new Set(referencedBins)], ['bin/wwdc-quick-look.js']);

    for (const binPath of referencedBins) {
      await assert.doesNotReject(() => fs.access(path.resolve(binPath)));
    }
  });
});
