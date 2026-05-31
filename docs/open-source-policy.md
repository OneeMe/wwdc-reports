# Open Source Policy

## Safe to publish

- `bin/`, `src/`, `test/`, `docs/`, `data/sample/`
- Synthetic fixtures used by tests
- Templates and small examples that do not reproduce full Apple transcripts
- `package.json` and lockfiles

## Do not publish by default

- Full Apple transcript dumps
- Downloaded videos, audio, subtitles, images, or HTML page captures
- Cookies, browser profiles, credentials, API keys, `.env` files
- Large generated yearly workspaces under `years/`
- Local transcript crawl outputs such as `transcripts-en/`
- Local task state containing private paths or notes

## Apple-derived content

Generated Markdown can contain summaries, excerpts, links, timestamps, and code snippets derived from Apple Developer content. Treat those artifacts as Apple-derived materials, not as MIT-licensed project source. Keep source URLs and timestamps so readers can trace material back to Apple Developer pages.

## Samples and tests

Use synthetic, minimal data for tests. `test/fixtures/raw_data_minimal.json` intentionally mimics the shape of Apple metadata without copying Apple session text.
