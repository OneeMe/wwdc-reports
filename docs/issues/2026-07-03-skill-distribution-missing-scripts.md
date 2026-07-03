# 基本信息

- 日期：2026-07-03
- 严重程度：P1
- 状态：已修复
- 影响范围：`SwiftGGTeam/wwdc-quick-look-skill` standalone skill 分发；当前仓库 `skills/wwdc-quick-look` submodule
- 关联 Commit：standalone repo `c49f26c`；当前仓库本次提交

# 问题描述

用户通过 `npx skills add SwiftGGTeam/wwdc-quick-look-skill` 安装 `wwdc-quick-look` 后，安装目录只有 `SKILL.md`，缺少 `scripts/query.mjs` 和 `references/data-schema.md`。Skill 文档要求 agent 运行同目录下的 `scripts/query.mjs`，因此安装后的 skill 无法正常查询 WWDC 数据。

# 复现路径

```sh
HOME=/tmp/skills-install-repro npx -y skills add SwiftGGTeam/wwdc-quick-look-skill -g -a codex -y
find /tmp/skills-install-repro/.agents/skills/wwdc-quick-look -maxdepth 3 -print
```

实际结果：

```text
/tmp/skills-install-repro/.agents/skills/wwdc-quick-look
/tmp/skills-install-repro/.agents/skills/wwdc-quick-look/SKILL.md
```

期望结果：安装目录应同时包含 `scripts/query.mjs` 与 `references/data-schema.md`。

# 代码位置

- Standalone repo 根目录：`SKILL.md`
- Standalone repo 根目录：`scripts/query.mjs`
- Standalone repo 根目录：`references/data-schema.md`
- 当前仓库：`.gitmodules`
- 当前仓库：`skills/wwdc-quick-look` submodule

# 根因分析

`skills@1.5.14` 从 GitHub 安装时，如果 clone 后发现 skill 的 `SKILL.md` 位于仓库根目录，会走单文件 skill 的安装路径，只把 `SKILL.md` 写入目标目录。该路径不会递归复制同级 `scripts/` 或 `references/`。

本地路径安装不会触发同一分支，因此从本地 clone 安装可以复制完整目录；但公开安装命令使用 GitHub source，会稳定复现缺资源问题。

# 修复方案

将 standalone repo 的 installable skill 从仓库根目录移动到子目录：

```text
wwdc-quick-look/
  SKILL.md
  scripts/query.mjs
  references/data-schema.md
```

仓库根目录保留 README。这样 `skills add SwiftGGTeam/wwdc-quick-look-skill` 发现的是子目录 skill，安装时会递归复制整个 skill 目录。

当前仓库继续通过 `skills/wwdc-quick-look` 关联 standalone repo。为了保留原有本地 workflow 路径，standalone repo 根目录保留 `scripts/query.mjs` 兼容 wrapper，实际安装本体位于 `wwdc-quick-look/` 子目录。

# 测试策略

- 用临时 `HOME` 执行 `npx skills add`，确认安装目录包含 `scripts/query.mjs` 与 `references/data-schema.md`。
- 运行安装后的 `scripts/query.mjs list-years`，确认脚本可读取 CDN 数据。
- 运行当前仓库与 skill 分发相关的测试。

# 验证结果

已完成：

```sh
HOME=/tmp/skills-install-repro-fixed-github npx -y skills add SwiftGGTeam/wwdc-quick-look-skill -g -a codex -y
find /tmp/skills-install-repro-fixed-github/.agents/skills/wwdc-quick-look -maxdepth 3 -print
node /tmp/skills-install-repro-fixed-github/.agents/skills/wwdc-quick-look/scripts/query.mjs list-years
```

安装目录已包含：

```text
SKILL.md
references/data-schema.md
scripts/query.mjs
```

同时验证了当前仓库的兼容 wrapper：

```sh
node skills/wwdc-quick-look/scripts/query.mjs list-years
```

定向测试通过：

```sh
node --test test/wwdc-quick-look/skill-distribution.test.js
node --test test/wwdc-quick-look/wwdc-quick-look-query.test.js
git diff --check
```

完整 `npm test` 已运行，仍有一个既有的非本次范围失败：`test/wwdc-quick-look/web-article-related-sessions.test.js` 断言旧中文文案 `观看原视频`，但当前 article layout 使用 `copy.watchVideo` i18n 文案。

# 经验总结

带 bundled resources 的 GitHub skills 不应把 `SKILL.md` 放在 repo 根目录，除非安装工具确认会递归复制同级资源。更稳妥的分发结构是 repo 根目录放 README 和兼容工具，真正的 skill 放在命名子目录下。
