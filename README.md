# WWDC Reports

A no-key Node.js script for archiving each year's public WWDC raw metadata and video transcripts into the current directory.

The project is being rebuilt around a small dependency-free CLI. Its primary job is to fetch public Apple Developer WWDC raw materials and archive them locally: a stable `raw_data.json`, timestamped metadata snapshots, and per-session transcript text files. Existing Python scripts, prompts, reports, and historical data snapshots live under `legacy/` as references, not compatibility targets for the new implementation.

## Goals

- **No API keys by default**: the core workflow uses public Apple Developer URLs and local files only.
- **Archive-first**: `archive` writes raw metadata into the current directory by default; `transcripts` writes raw transcript text files locally.
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

# WWDC25 shortcut for the same no-key local archive flow.
node ./bin/wwdc-reports.js wwdc25

# Fetch public WWDC metadata and archive it into the current directory.
node ./bin/wwdc-reports.js archive --year 2026 --locale en

# The default command is also archive, so this is equivalent.
node ./bin/wwdc-reports.js --year 2026 --locale en
```

The one-command crawl writes:

```text
./raw_data.json
./raw_data_wwdc25_en_<timestamp>.json
./transcripts-en/<session-code>.txt
./transcripts-en/_manifest.json
```

The metadata-only archive writes:

```text
./raw_data.json
./raw_data_wwdc26_en_<timestamp>.json
```

Use `--out-dir` if you want a different archive directory:

```sh
node ./bin/wwdc-reports.js crawl --year 2025 --locale en --out-dir ./archives/wwdc25
```

## Crawl WWDC transcripts

The `crawl` command is the recommended path. If you want manual control, you can still run metadata archiving and transcript crawling as two separate steps:

```sh
# Step 1: archive public metadata into ./raw_data.json
node ./bin/wwdc-reports.js archive --year 2025 --locale en

# Step 2: crawl all WWDC25 transcripts into ./transcripts-en/*.txt
node ./bin/wwdc-reports.js transcripts --year 2025 --raw-data raw_data.json
```

The transcript crawler uses static public HTML from Apple Developer video pages; when metadata provides a localized `webPermalink`, that URL is used directly. It does not use Selenium, browser cookies, API keys, or LLM services. Existing non-empty transcript files are skipped by default. Each run also writes `transcripts-<locale>/_manifest.json`, which records every attempted session plus `written`, `skipped`, `missing`, or `failed` status. Use `--force` to refresh existing transcript files:

By default, `crawl` derives the session list from the public Apple Developer video collection page, because older `https://developer.apple.com/wwdc25/services/data/` metadata endpoints may disappear after the event. If you explicitly want the legacy JSON service path, pass `--source json`; if you want `archive` to use the collection page instead of JSON, pass `--source html`.

```sh
node ./bin/wwdc-reports.js transcripts --year 2025 --raw-data raw_data.json --force
```

Use `--out-dir` for a different local archive directory:

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

## Data layout

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
