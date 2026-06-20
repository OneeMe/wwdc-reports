# Plan Review Rounds

## Round 1

### Architecture Reviewer
Verdict: APPROVED

Comments:
- id: arch-1
  severity: NIT
  area: deployment
  target: Cloudflare Pages project root
  comment: The repo currently documents `cd web && npm run build` with output `web/dist`. Functions are safest when the Pages root is `web`.
  required_change: Document root directory `web`, build command `npm run build`, output `dist`, and functions directory `functions`.

### Test Strategy Reviewer
Verdict: APPROVED

Comments:
- id: test-1
  severity: NIT
  area: verification
  target: OAuth runtime
  comment: Live OAuth/GitHub API calls cannot be completed without secrets.
  required_change: Record this as residual risk and verify static/server integration instead.

### Product/Spec Reviewer
Verdict: APPROVED

Comments:
- id: product-1
  severity: NIT
  area: UX
  target: selection comments
  comment: Selection behavior should remain invisible until text is selected.
  required_change: Keep quote preview inside the composer instead of adding floating controls.

### Security Reviewer
Verdict: APPROVED

Comments:
- id: security-1
  severity: NIT
  area: auth
  target: session cookie
  comment: Do not expose access tokens to frontend code.
  required_change: Use HttpOnly signed cookie and server-side GitHub API calls only.

## Adjudication
All reviewer notes are valid and incorporated into the implementation plan. No blocker, important, or question items remain.
