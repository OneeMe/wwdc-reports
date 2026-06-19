import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('GitHub Actions configuration', () => {
  const workflowPath = path.resolve('.github/workflows/refresh-data.yml');

  it('does not include a data refresh workflow', async () => {
    await assert.rejects(() => fs.access(workflowPath), { code: 'ENOENT' });
  });
});
