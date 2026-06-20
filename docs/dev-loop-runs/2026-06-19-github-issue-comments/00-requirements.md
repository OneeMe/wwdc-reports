# Requirements Baseline

## Goal
Add a GitHub Issues-backed comment system to WWDC Quick Look article pages. Each article should have a discussion issue in GitHub, and users should be able to sign in with GitHub and post either general article comments or comments quoting selected article text.

## Non-goals
- Do not introduce a separate database.
- Do not migrate existing article content or generated MDX.
- Do not build moderation, threaded replies, editing, deleting, reactions, or admin dashboards in this first version.
- Do not expose GitHub OAuth client secrets or user access tokens to browser code.

## User-visible Behavior
- Article pages render a comments section at the bottom.
- Visitors can read existing comments for the current article.
- Visitors can start GitHub login from the article page.
- After GitHub login, visitors can post a comment to the article's GitHub issue.
- If visitors select text inside the article body, the composer captures that text as a quote for the new comment.
- Comment cards show author, avatar, timestamp, markdown-rendered body when available, and a link to the original GitHub comment.

## Acceptance Criteria
- Article pages pass the article slug, title, and canonical URL into a comment widget.
- The widget can load comments through an API route without requiring browser-side GitHub credentials.
- The widget can start OAuth login and recover the signed-in user session after callback.
- The widget can submit a general comment and a selected-text quote comment.
- The server-side API maps each article slug to one GitHub issue and creates it if missing during comment submission.
- Secrets are read only from Cloudflare Pages Functions environment variables.
- Missing configuration produces clear non-fatal UI/API errors.
- Existing static article build remains valid.

## Constraints
- Current site is an Astro static site deployed on Cloudflare Pages through Git integration.
- GitHub OAuth code exchange requires a server-side client secret.
- GitHub issue/comment write operations require a user access token with repository Issues write permission.
- GitHub label assignment on newly created issues may be silently ignored for users without push access, so slug markers must also be stored in issue body/title.
- No existing API route layer is present in the web app.

## Assumptions
- The target issue repository defaults to `SwiftGGTeam/wwdc-quick-look`.
- Cloudflare Pages Functions are acceptable because the current hosting is Cloudflare Pages.
- GitHub OAuth App will be configured externally with callback URL `/api/comments/auth/callback`.
- OAuth scope can default to `public_repo` for a public repository, while allowing override through env.
- First version stores the session in a signed, HttpOnly cookie containing a compact access token payload.

## Open Questions
- Exact production GitHub OAuth App client ID/secret are not available in the repo and must be configured in Cloudflare.
- If the comment issue should live in a different repository, `GITHUB_COMMENTS_REPO` must be changed.

## Source Request
User asked: "我希望给这个 Astral 的网站添加一个新的功能，就是基于 GitHub 的 Issue 来创建一个对每一个文章的评论系统，用户可以在文章的最下端通过 GitHub 登录直接评论，或者说选中某一行文本，然后进行评论。这个评论系统的数据就使用 GitHub 的 issue。"

## Repo Context
- Repo root: `/Users/onee/.codex/worktrees/5935/wwdc-quick-look`
- Base SHA: `8bf3abf42f43ced168a7b8c9715f89dceee5ff8c`
- Branch: detached HEAD
- Dirty state at start: no tracked changes
- Relevant files inspected:
  - `web/astro.config.mjs`
  - `web/package.json`
  - `web/README.md`
  - `web/src/pages/articles/[slug].astro`
  - `web/src/layouts/ArticleLayout.astro`
  - `web/src/layouts/BaseLayout.astro`
  - `test/wwdc-quick-look/web-article-related-sessions.test.js`
