# 2026-06-06 GitHub Actions renamed CLI entrypoint

## 基本信息

- 日期: 2026-06-06
- 严重程度: P1
- 状态: 已修复
- 影响范围: `.github/workflows/refresh-data.yml` 定时数据刷新
- 关联 Commit: 本次修复提交 `fix(actions): use renamed CLI entrypoint`

## 问题描述

`Refresh WWDC data` GitHub Actions workflow 处于 active 状态，但 2026-06-02 到 2026-06-06 的定时运行连续失败，导致 WWDC 数据集无法自动刷新。

## 复现路径

1. 打开最近一次 `Refresh WWDC data` scheduled run。
2. 查看 `Refresh all years already under data/ (default)` step。
3. 运行在第一年数据刷新时失败，并报 `Cannot find module .../bin/wwdc-reports.js`。

## 代码位置

- `.github/workflows/refresh-data.yml`
- `bin/wwdc-quick-look.js`

## 根因分析

项目在 `chore: rename project to wwdc-quick-look` 中将 CLI 入口从 `bin/wwdc-reports.js` 重命名为 `bin/wwdc-quick-look.js`，但 GitHub Actions workflow 仍调用旧入口路径。Actions runner checkout 后找不到旧文件，因此在真正抓取 Apple 数据前立即失败。

## 修复方案

已将 workflow 中的两处 `node ./bin/wwdc-reports.js crawl` 更新为 `node ./bin/wwdc-quick-look.js crawl`，并增加一个回归测试，确认 workflow 引用的本地 `bin/*.js` 文件都存在。

## 测试策略

- `npm test`
- `npm run check`
- `node ./bin/wwdc-quick-look.js crawl --year 2020 --locale en --out-dir /tmp/wwdc-quick-look-actions-smoke --limit 1 --concurrency 1`

## 验证结果

通过。测试套件新增 `GitHub workflow configuration` 覆盖 workflow 中的本地 CLI 入口引用。真实 crawler smoke 成功写出 `raw_data.json`、时间戳归档文件、`transcripts-en/10970.txt` 和 `_manifest.json`，且 `failed: 0`。

## 经验总结

仓库级自动化配置应跟随 CLI 入口重命名一起被测试覆盖。对这类 GitHub Actions 配置，最小有效回归测试不是模拟完整 Actions runner，而是检查 workflow 中引用的本地脚本路径在当前仓库存在。
