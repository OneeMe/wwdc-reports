![WWDC Quick Look banner](assets/wwdc-quick-look-banner.png)

# WWDC Quick Look Skill

[中文说明](README-CN.md)
[![skills.sh](https://skills.sh/b/SwiftGGTeam/wwdc-quick-look)](https://www.skills.sh/swiftggteam/wwdc-quick-look)
[Landing Page](https://wwdc-quick-look.swiftgg.team)

WWDC Quick Look is a local agent skill for fast access to Apple WWDC session metadata, transcripts, Code tab snippets, and Resources links.

Install it through skills.sh with one command, then let your agent use `wwdc-quick-look` whenever a WWDC question needs concrete session evidence. The repository also contains the crawler and published dataset that power the skill. The default path is local-first and no-key: it reads public Apple Developer pages, writes structured JSON and transcript text, and serves the latest archive from jsDelivr.

## Install With skills.sh

```sh
npx skills add SwiftGGTeam/wwdc-quick-look
```

The skills CLI discovers `skills/wwdc-quick-look/SKILL.md` in this repository and installs it into your local agent skill directory. This is the recommended distribution path for Codex, Claude Code, Cursor, and other agent runtimes supported by skills.sh.

## What This Skill Does

Use `wwdc-quick-look` when a user asks about WWDC sessions, Apple platform announcements, sample code, demo projects, Code tab snippets, Resources links, or transcripts.

The skill can:

- list available WWDC years and topics
- search session titles, descriptions, Resources, and Code snippets
- show a session summary with resource and snippet counts
- display Resources links such as documentation, sample-code pages, GitHub repositories, and demo projects
- display Code tab snippets with timestamps and jump links
- read local or CDN-backed transcript text

## Repository Layout

```text
skills/
└── wwdc-quick-look/          # Canonical skill source
    ├── SKILL.md
    ├── scripts/query.mjs
    └── references/data-schema.md

playground/
├── .agents/skills -> ../../skills
└── .claude/skills -> ../../skills

data/
├── index.json
├── wwdc20/
├── wwdc21/
├── wwdc22/
├── wwdc23/
├── wwdc24/
└── wwdc25/
```

`skills/` is the single source of truth. The playground links expose the same skill to agent runtimes that expect either `.agents/skills` or `.claude/skills`. The repository root intentionally does not keep a `.agents/skills` copy.

## Use The Query Script Directly

After installing the skill, agents call this script for you. For local testing or debugging, you can also run queries from the repository root:

```sh
node skills/wwdc-quick-look/scripts/query.mjs list-years
node skills/wwdc-quick-look/scripts/query.mjs search --year 2025 --keyword "visionOS"
node skills/wwdc-quick-look/scripts/query.mjs show-session --year 2025 --code 290
node skills/wwdc-quick-look/scripts/query.mjs resources --year 2025 --code 290
node skills/wwdc-quick-look/scripts/query.mjs code --year 2025 --code 290 --limit 3
node skills/wwdc-quick-look/scripts/query.mjs transcript --year 2025 --code 290 --limit 20
```

By default the query script reads the published CDN dataset:

```text
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/
```

For local testing, point it at another base URL:

```sh
WWDC_QUICK_LOOK_BASE_URL=http://127.0.0.1:8765 \
  node skills/wwdc-quick-look/scripts/query.mjs list-years
```

## Dataset Coverage

The committed local dataset covers WWDC 2020 through WWDC 2025.

| Year | Sessions | Transcript files | Sessions with Resources | Sessions with Code snippets |
|------|----------|------------------|--------------------------|-----------------------------|
| 2020 | 209 | 206 | 150 | 124 |
| 2021 | 207 | 204 | 176 | 127 |
| 2022 | 316 | 184 | 142 | 118 |
| 2023 | 316 | 181 | 122 | 100 |
| 2024 | 123 | 123 | 117 | 78 |
| 2025 | 122 | 120 | 113 | 80 |

Some Apple Developer entries are Q&A, Meet the Presenter, Study Hall, keynote, ASL, or community activity pages. When Apple publishes no timestamped transcript on the page, the manifest records that entry as `missing` instead of inventing text.

## Refresh The Archive

The crawler remains available for maintaining the dataset:

```sh
# Crawl one year into the published data directory.
node ./bin/wwdc-quick-look.js crawl --year 2025 --locale en --out-dir data/wwdc25

# Rebuild the public year catalog.
node scripts/build-index.mjs
```

The combined crawl fetches public Apple Developer collection cards, enriches each session from its detail page, extracts Resources and Code tab snippets, and writes transcript text files plus a manifest.

## Published URLs

```text
# Catalog of every published year
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/index.json

# Per-year session metadata
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc25/raw_data.json

# Transcript manifest
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc25/transcripts-en/_manifest.json

# Single transcript
https://cdn.jsdelivr.net/gh/SwiftGGTeam/wwdc-quick-look@main/data/wwdc25/transcripts-en/290.txt
```

jsDelivr caches paths. Use a commit-pinned URL when byte-stable archival output matters.

## Development

```sh
npm test
npm run check
node ./bin/wwdc-quick-look.js help
```

The package has no runtime npm dependencies and requires Node.js 20 or newer.

## Legal

Apple, WWDC, Apple Developer, Swift, Xcode, iOS, macOS, watchOS, tvOS, and visionOS are trademarks of Apple Inc. Apple session metadata, transcripts, videos, images, code snippets, and related resources belong to Apple or their respective rights holders. This repository's MIT license covers only the original code and documentation in this project.

The banner artwork is WWDC-inspired project branding generated for this repository. It is not an official Apple or WWDC logo.
