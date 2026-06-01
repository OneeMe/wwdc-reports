# WWDC Reports

A no-key Node.js script for archiving each year's public WWDC raw metadata, session resources, code snippets, and video transcripts into the current directory.

The project is a small dependency-free CLI. Its primary job is to fetch public Apple Developer WWDC raw materials and archive them locally: a stable `raw_data.json`, timestamped metadata snapshots, per-session resource/code metadata, and per-session transcript text files. Existing Python scripts, prompts, reports, and historical data snapshots live under `legacy/` as references, not compatibility targets for the new implementation.

## Goals

- **No API keys by default**: the core workflow uses public Apple Developer URLs and local files only.
- **Crawl-first**: `crawl` fetches metadata from the public video collection page, enriches sessions from their detail pages, and writes transcript text files locally in one step.
- **Open-source friendly**: code, templates, docs, and tiny synthetic fixtures can be published without bundling full Apple transcripts or private credentials.
- **Local-first**: generated Markdown is written locally. No transcript or metadata is uploaded to third-party services by the core CLI.

## Install for local development

```sh
npm test
npm run check
node ./bin/wwdc-reports.js help
```

If npm is unavailable in a minimal environment, run the direct Node equivalents:

```sh
node --test
node --check bin/wwdc-reports.js && find src test -name '*.js' -print0 | xargs -0 -n1 node --check
```

The package currently has no runtime npm dependencies and requires Node.js 20 or newer.

## Main usage

```sh
# One command: fetch public metadata and crawl all transcripts into this directory.
node ./bin/wwdc-reports.js crawl --year 2025 --locale en

# WWDC25 shortcut for the same crawl flow.
node ./bin/wwdc-reports.js wwdc25

# The default command is also crawl, so this is equivalent.
node ./bin/wwdc-reports.js --year 2025 --locale en
```

The one-command crawl writes:

```text
./raw_data.json
./raw_data_wwdc25_en_<timestamp>.json
./transcripts-en/<session-code>.txt
./transcripts-en/_manifest.json
```

`raw_data.json` starts with the public collection cards, then enriches each
session from its Apple Developer video page. When available, a video entry now
includes:

- `resources`: top-level Resources links from the session page, such as docs,
  sample-code pages, GitHub repositories, or demo/project links. HD/SD video
  downloads are excluded.
- `codeSnippets`: the time-linked snippets from the page's Code tab, including
  title, timestamp, URL, and raw code text.

Use `--out-dir` if you want a different output directory:

```sh
node ./bin/wwdc-reports.js crawl --year 2025 --locale en --out-dir ./archives/wwdc25
```

## Crawl WWDC transcripts

If you want manual control, you can still run metadata fetching and transcript crawling as two separate steps:

```sh
# Step 1: fetch public metadata into ./raw_data.json
node ./bin/wwdc-reports.js archive --year 2025 --locale en

# Step 2: crawl all WWDC25 transcripts into ./transcripts-en/*.txt
node ./bin/wwdc-reports.js transcripts --year 2025 --raw-data raw_data.json
```

The transcript crawler uses static public HTML from Apple Developer video pages; when metadata provides a localized `webPermalink`, that URL is used directly. It does not use Selenium, browser cookies, API keys, or LLM services. Existing non-empty transcript files are skipped by default. Each run also writes `transcripts-<locale>/_manifest.json`, which records every attempted session plus `written`, `skipped`, `missing`, or `failed` status. Use `--force` to refresh existing transcript files:

```sh
node ./bin/wwdc-reports.js transcripts --year 2025 --raw-data raw_data.json --force
```

Use `--out-dir` for a different local output directory:

```sh
node ./bin/wwdc-reports.js transcripts --year 2025 --raw-data raw_data.json --out-dir ./archives/wwdc25/transcripts-en
```

For the combined `crawl` command, use `--transcripts-dir` when the transcript directory should differ from `<out-dir>/transcripts-<locale>`:

```sh
node ./bin/wwdc-reports.js crawl --year 2025 --out-dir ./archives/wwdc25 --transcripts-dir ./archives/wwdc25/transcripts-en
```

## Secondary local commands

The repository also contains small local helpers for inspecting archived metadata. They are intentionally secondary; the primary script remains the raw archiver.

```sh
# Create a yearly workspace, if you prefer structured generated data.
node ./bin/wwdc-reports.js init-year --year 2026

# Split raw metadata into smaller JSON files and derive topic/session mapping
node ./bin/wwdc-reports.js split --year 2026

# Inspect topics and sessions
node ./bin/wwdc-reports.js topics --year 2026
node ./bin/wwdc-reports.js query-topic --year 2026 --topic Swift --with-title

# Generate local Markdown. Full transcripts are not embedded unless requested.
node ./bin/wwdc-reports.js materialize --year 2026
node ./bin/wwdc-reports.js materialize --year 2026 --include-transcript
```

For WWDC 2025 legacy metadata already in this repository, point the CLI at `legacy/` explicitly:

```sh
node ./bin/wwdc-reports.js topics --year 2025 --data-root legacy/data --raw-data legacy/data/raw/raw_data.json
node ./bin/wwdc-reports.js transcripts --year 2025 --raw-data legacy/data/raw/raw_data.json --out-dir transcripts-en
```

## Published dataset (jsDelivr CDN)

This repository also publishes the latest crawl output under `data/` so any
client can fetch it without running the CLI. A daily GitHub Action
(`.github/workflows/refresh-data.yml`) re-crawls every year already present
under `data/` and commits any diff. jsDelivr mirrors the public repository,
so the stable URLs are:

```text
# Catalog of every published year (schemaVersion, sessionCount, locales, …)
https://cdn.jsdelivr.net/gh/OneeMe/wwdc-reports/data/index.json

# Per-year session metadata (title, description, topics, webPermalink, resources, codeSnippets, …)
https://cdn.jsdelivr.net/gh/OneeMe/wwdc-reports/data/wwdc25/raw_data.json

# Transcript manifest (per-session status, line count, source URL)
https://cdn.jsdelivr.net/gh/OneeMe/wwdc-reports/data/wwdc25/transcripts-en/_manifest.json

# Single session transcript (timestamped lines, `MM:SS text` per line)
https://cdn.jsdelivr.net/gh/OneeMe/wwdc-reports/data/wwdc25/transcripts-en/238.txt
```

jsDelivr caches each path for ~12 hours by default. Pin a specific commit
SHA when you need byte-stable output for archival.

## Open the dataset for a new year

```sh
# Bootstrap an empty year directory, then crawl into it once.
mkdir -p data/wwdc26
node ./bin/wwdc-reports.js crawl --year 2026 --locale en --out-dir data/wwdc26
node scripts/build-index.mjs
git add data/wwdc26 data/index.json && git commit -m "feat(data): add WWDC26"
```

After the first manual commit, the daily Action will keep that year up to
date until you remove the directory.

The main archive command writes into the current directory by default. Optional generated data can live under yearly workspaces:

```text
years/<year>/
├── raw/
│   ├── raw_data.json
│   ├── jsons/
│   └── transcripts-en/
└── processed/
    ├── sessions/
    └── index.md
```

The repository includes `data/sample/` and `test/fixtures/` with synthetic minimal data for tests and examples. Avoid committing full raw transcripts, videos, downloaded media, cookies, or private local state.

## Apple content and trademarks

Apple, WWDC, Apple Developer, Swift, Xcode, iOS, macOS, watchOS, tvOS, and visionOS are trademarks of Apple Inc. Apple session metadata, transcripts, videos, images, code snippets, and related resources belong to Apple or their respective rights holders. The MIT license for this project covers this repository's original code and documentation only; it does not re-license Apple content.

This is not an official Apple project and is not endorsed by Apple. Use generated outputs according to Apple Developer website terms and applicable content usage rules.
