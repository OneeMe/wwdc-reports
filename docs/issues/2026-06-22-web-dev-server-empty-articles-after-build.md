# Web Dev Server Empty Articles After Localized Build

## Status

Fixed.

## Symptom

Local preview at `/articles` can show the empty state with `0 个 Session`, even though `web/src/content/articles` still contains article files and thumbnails are available.

## Root Cause

`web/scripts/build-locales.mjs` previously used `web/.astro/localized-builds` as the temporary output directory and removed `web/.astro` before each language-specific build.

When the Astro dev server is running, it also reads and watches `web/.astro` for content collection data. Running the localized build from the same project root can delete or overwrite the dev server's content collection state, so the running preview may report an empty `articles` collection.

## Fix

- Run each language-specific build from an isolated temporary workspace under the system temp directory.
- Copy the real `src` and config files into the temporary workspace so Astro component compile metadata stays under the isolated root.
- Symlink `node_modules` and `public` into the temporary workspace so dependency resolution and static assets still use the real project data without copying bulky generated assets.
- Pass `WWDC_ASTRO_CACHE_DIR` per language build so build cache data is also isolated.
- Stop deleting `web/.astro` from the localized build script.

## Verification

- `curl http://127.0.0.1:4321/articles` reports `1116 个 Session` while the dev server is running.
- `npm run build` completes successfully while the dev server is still running.
- After the build, `/articles`, `/en/articles`, and `/ja/articles` report `1116 个 Session`, `1116 sessions`, and `1116 セッション`.
- `npm run check:i18n` passes.
- `npm run check:covers` passes and reports all `3402` articles and `1116` session cards have valid covers.
- `npm test` passes.
