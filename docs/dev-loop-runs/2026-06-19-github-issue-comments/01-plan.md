# Implementation Plan

## Goal and Architecture
Ship a first version of GitHub Issues-backed article comments with Cloudflare Pages Functions as the secure server boundary. The browser talks only to `/api/comments/*`; the function layer performs GitHub OAuth code exchange, validates signed cookies, finds or creates per-article issues, lists comments, and creates issue comments.

## Files and Modules
- Add `functions-shared/comments.js` for shared GitHub, OAuth, cookie, and response helpers.
- Add `functions/api/comments/config.js` for public runtime configuration.
- Add `functions/api/comments/session.js` for current session lookup.
- Add `functions/api/comments/logout.js` for clearing the session cookie.
- Add `functions/api/comments/[slug].js` for comment list and comment creation.
- Add `functions/api/comments/auth/login.js` and `functions/api/comments/auth/callback.js` for OAuth.
- Add `web/src/components/GitHubComments.astro` for article UI and browser interaction.
- Update `web/src/layouts/ArticleLayout.astro` to render the component and expose article context.
- Update `web/src/pages/articles/[slug].astro` to pass slug and canonical URL.
- Update `web/README.md` for Cloudflare Pages Functions and secret configuration.
- Add focused repository tests under `test/wwdc-quick-look/`.

## Task Order
1. Create process artifacts and record assumptions.
2. Implement Pages Functions shared helpers and API routes.
3. Implement article comments component and integrate it into article layout/page.
4. Add static tests for route/component integration and backend safety properties.
5. Update deployment docs.
6. Run verification: targeted node tests, `npm test`, `cd web && npm run build`, and `git diff --check`.

## Backend Contract
- `GET /api/comments/config` returns `{ enabled, loginUrl, repo }`.
- `GET /api/comments/session` returns `{ authenticated, user? }`.
- `POST /api/comments/logout` clears the session cookie.
- `GET /api/comments/:slug` returns `{ issue, comments }`.
- `POST /api/comments/:slug` accepts `{ body, articleTitle, articleUrl, selection? }` and creates a GitHub issue comment.
- `GET /api/comments/auth/login?returnTo=/articles/<slug>` redirects to GitHub OAuth.
- `GET /api/comments/auth/callback` exchanges code, sets signed session cookie, and redirects back.

## Security Notes
- OAuth client secret and session secret stay in Cloudflare env.
- Session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, and HMAC-signed.
- `returnTo` accepts only same-origin relative paths.
- Slug, body, title, URL, and selection payloads are length-limited before GitHub calls.
- Browser never receives the GitHub access token.

## Test Strategy
- Static tests assert article layout passes slug/title/URL and renders the comment component.
- Static tests assert Functions use server-side env variables, signed cookies, and GitHub issue/comment endpoints.
- Full `npm test` catches regressions in existing repo-level tests.
- `web` build verifies Astro/MDX integration still generates static pages.

## Risks and Assumptions
- Cloudflare Pages Functions must live in the Pages project root. The current deployment docs use the repository root with build command `cd web && npm run build`, so source files should live under root `functions/`.
- GitHub OAuth scope and repository permissions must be configured outside code.
- Users without repo issue permissions may fail to create issues/comments; API should surface GitHub's error message without leaking secrets.
- Markdown rendering in the UI uses GitHub-provided `body_html` when available; otherwise it falls back to escaped plain text.

## Acceptance Mapping
- Per-article bottom comments: `GitHubComments.astro` integrated through `ArticleLayout.astro`.
- GitHub login: `/api/comments/auth/login` and callback routes.
- GitHub Issues data source: `[slug].js` uses GitHub Issues and Issue Comments REST endpoints.
- Selected text comments: browser selection capture in `GitHubComments.astro`, stored in comment body as a quote block.
- No separate DB: all persisted comment data is GitHub issues/comments.
