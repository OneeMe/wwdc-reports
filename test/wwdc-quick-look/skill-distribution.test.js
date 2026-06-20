import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const repoRoot = new URL('../..', import.meta.url).pathname;
const skillRepo = 'SwiftGGTeam/wwdc-quick-look-skill';
const skillRepoUrl = 'https://github.com/SwiftGGTeam/wwdc-quick-look-skill.git';
const installCommand = `npx skills add ${skillRepo}`;
const skillsUrl = 'https://www.skills.sh/swiftggteam/wwdc-quick-look-skill';

function readProjectFile(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('skill distribution', () => {
  it('uses a standalone skill repository as the skill submodule', () => {
    const gitmodules = readProjectFile('.gitmodules');

    assert.match(gitmodules, /\[submodule "skills\/wwdc-quick-look"\]/);
    assert.match(gitmodules, /path = skills\/wwdc-quick-look/);
    assert.match(gitmodules, new RegExp(`url = ${skillRepoUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  it('documents the standalone skills.sh install command', () => {
    const readme = readProjectFile('README.md');
    const readmeCn = readProjectFile('README-CN.md');

    assert.match(readme, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(readmeCn, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(readme, new RegExp(skillsUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(readmeCn, new RegExp(skillsUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  it('shows the standalone install command on the landing page', () => {
    const page = readProjectFile('web/src/pages/index.astro');
    const landingCopy = readProjectFile('web/src/i18n/landing.ts');

    assert.match(page, new RegExp(skillsUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(page, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(landingCopy, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
