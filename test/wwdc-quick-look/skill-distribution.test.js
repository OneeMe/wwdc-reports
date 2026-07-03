import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const repoRoot = new URL('../..', import.meta.url).pathname;
const skillRepo = 'SwiftGGTeam/wwdc-quick-look-skill';
const skillRepoUrl = 'https://github.com/SwiftGGTeam/wwdc-quick-look-skill.git';
const installCommand = `npx skills add ${skillRepo}`;

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

  it('exposes the installable submodule skill directory to agent runtimes', () => {
    const rootLink = join(repoRoot, '.agents/skills/wwdc-quick-look');
    const playgroundAgentsLink = join(repoRoot, 'playground/.agents/skills/wwdc-quick-look');
    const playgroundClaudeLink = join(repoRoot, 'playground/.claude/skills/wwdc-quick-look');

    assert.equal(lstatSync(rootLink).isSymbolicLink(), true);
    assert.equal(lstatSync(playgroundAgentsLink).isSymbolicLink(), true);
    assert.equal(lstatSync(playgroundClaudeLink).isSymbolicLink(), true);
    assert.equal(readlinkSync(rootLink), '../../skills/wwdc-quick-look/wwdc-quick-look');
    assert.equal(readlinkSync(playgroundAgentsLink), '../../../skills/wwdc-quick-look/wwdc-quick-look');
    assert.equal(readlinkSync(playgroundClaudeLink), '../../../skills/wwdc-quick-look/wwdc-quick-look');
  });

  it('keeps bundled skill resources in a nested installable directory when initialized', { skip: !existsSync(join(repoRoot, 'skills/wwdc-quick-look/README.md')) }, () => {
    assert.equal(existsSync(join(repoRoot, 'skills/wwdc-quick-look/SKILL.md')), false);
    assert.equal(existsSync(join(repoRoot, 'skills/wwdc-quick-look/wwdc-quick-look/SKILL.md')), true);
    assert.equal(existsSync(join(repoRoot, 'skills/wwdc-quick-look/wwdc-quick-look/scripts/query.mjs')), true);
    assert.equal(existsSync(join(repoRoot, 'skills/wwdc-quick-look/wwdc-quick-look/references/data-schema.md')), true);
  });

  it('documents the standalone skills.sh install command', () => {
    const readme = readProjectFile('README.md');
    const readmeCn = readProjectFile('README-CN.md');
    const readmeJp = readProjectFile('README-JP.md');

    assert.match(readme, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(readmeCn, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(readmeJp, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(readme, /https?:\/\/[^\s)\]]*skills\.sh/);
    assert.doesNotMatch(readmeCn, /https?:\/\/[^\s)\]]*skills\.sh/);
    assert.doesNotMatch(readmeJp, /https?:\/\/[^\s)\]]*skills\.sh/);
  });

  it('shows the standalone install command on the landing page without a skills.sh button', () => {
    const page = readProjectFile('web/src/templates/LandingPage.astro');
    const staticHomePage = readProjectFile('web/index.html');
    const landingCopy = readProjectFile('web/src/i18n/landing.ts');

    assert.doesNotMatch(page, /skills\.sh/);
    assert.doesNotMatch(page, /button-skill/);
    assert.doesNotMatch(staticHomePage, /https?:\/\/[^\s"')\]]*skills\.sh/);
    assert.doesNotMatch(staticHomePage, /data-i18n="navSkill"/);
    assert.match(page, /data\.installCmd/);
    assert.match(landingCopy, new RegExp(installCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
