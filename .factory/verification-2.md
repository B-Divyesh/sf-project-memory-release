# Independent verification 2 — FAIL

- **Candidate:** `c28e070885c998bd3b073386bc9b439227dcd300`
- **Live URL:** <https://project-memory-release.sociobot.in>
- **Verified:** 2026-09-02
- **Verdict:** **FAIL** — all executable quality checks pass, but the required claims contract is incomplete.

## Cold first read

The live first screen says this service releases trusted context for coding agents. It names product engineers whose agents need current decisions, architecture, and product language. The first action is **Try it with sample data**, with the immediate result, “A reviewable context pack opens next.” It is plain-language, answers what/who/first action, and satisfies the one-click demo requirement.

## Release-blocking finding

### High — visitor-facing claims are absent from `.factory/claims.json`

The claims policy requires every visitor-reliance claim on the landing page or README to have a matching, observable demo-entry-point test. These claims have no corresponding entry/test:

- “Repositories are never indexed automatically” (landing, privacy page, README).
- “One release is free” / “The free plan includes one release” (landing, terms, README).
- “Existing team licenses still work” and the stronger statement that they “enable recurring releases and shared workspace access” (landing and terms).
- “The product loads no third-party fonts, scripts, or trackers” (README).

The six listed claims all pass, but they do not prove the free-release entitlement, non-indexing behavior, recurring/team behavior, or the broad no-third-party assertion. Under the supplied claims contract, unlisted claims fail the review until each is tested from the demo entry point or removed/narrowed. This is a documentation/test-contract finding; it does not invalidate the otherwise successful observed flows below.

## Required resolution

1. Add one `claims.json` entry and one tagged sandbox test for each retained claim above (or remove the claim from every surface).
2. For license/team wording, test the actual second-release and shared-workspace behavior with a recorded valid verification response; otherwise state only the tested restore capability.
3. Re-run every listed claim command from a clean install and request verification again.

## Evidence

### Clean-checkout quality gates

`npm ci` succeeded with no reported vulnerabilities. The following all passed:

- Every command in `.factory/claims.json`, individually, against the Playwright demo server:
  - `@claim:reviewable-pack`
  - `@claim:stale-citations`
  - `@claim:markdown-download`
  - `@claim:demo-privacy`
  - `@claim:offline-demo`
  - `@claim:license-restore`
- `npm test`: **14/14** Playwright tests passed.
- `cargo test`: **3/3** passed.
- `cargo fmt --check` and `cargo clippy -- -D warnings` passed.
- `npm run build` passed and produced `dist/`: initial JS **8.94 KB gzip**, CSS **3.87 KB gzip**.
- `BUILD_SHA=c28e070885c998bd3b073386bc9b439227dcd300 cargo build --release --locked` passed.

Docker CLI is not installed in this verifier container, so the Docker image itself could not be built. The two Dockerfile build stages were validated directly above; the Dockerfile is multi-stage, uses `ARG BUILD_SHA=dev`, a non-root runtime user, and `PORT=8080`.

### Live deployment identity and backend checks

- `GET /health` returned `200 {"build_sha":"c28e070885c998bd3b073386bc9b439227dcd300","status":"ok"}`; the live deployment matches the candidate.
- A 100-request concurrent burst to `/api/state` from one client yielded **40 × 200** and **60 × 429**. Every sampled 429 had `Retry-After: 1`; observed allowance is **40 requests per client per second**.
- Live API boundary check: workspace A could create/read one source while workspace B read zero; malformed revision returned `400` with recovery text; no workspace key returned `401`.
- A fresh real workspace completed source creation and release `verify-second-2026`; its generated Markdown contained the source path, revision, and `project-memory://` reference.

### Browser, privacy, accessibility, and performance checks

- Live `/`, `/demo`, `/privacy`, and `/terms` returned 200 with one visible `h1` and `main`; `/missing` returned the designed 404 with one `h1` and `main`. Titles were route-specific.
- Demo opened with the persistent “Demo — sample data, nothing is saved” banner. Adding a representative source worked; **Reset demo** removed it.
- Desktop public-route loads had no console/page errors. The expected deliberately requested 404 navigation logs its failed network resource in Chromium and was not counted as a normal-load error.
- Keyboard Tab reaches the visible skip link (`transform: none`). The shipped keyboard-dialog test passed. Reduced-motion browser context reduced release-card animation to `0.00001s`.
- At 390 × 844, `/demo` had `scrollWidth = clientWidth = 390`; no horizontal overflow. Screenshot evidence: `/tmp/pmr-live-mobile.png`.
- Axe via `@axe-core/playwright` found **0 serious/critical** issues on live `/` and `/demo`; the repository suite also passed its Axe route checks.
- A fresh live demo context loaded the service worker, went offline, reloaded successfully, and retained the sample.
- Full live request log during the landing/demo flow contained only `https://project-memory-release.sociobot.in` (including self-hosted fonts/art/API); no third-party outgoing request was observed.
- Response headers: HTML and `/sw.js` use `Cache-Control: no-cache, max-age=0, must-revalidate`; hashed assets use `public, max-age=31536000, immutable`; API and health use `no-store`. CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, permissions policy, and response-header `frame-ancestors 'none'` are present.
- `/robots.txt`, `/sitemap.xml`, favicon, Apple touch icon, and OG image all returned 200.

## Scope and known limitation

No product code or deployment resources were modified. The test-created real-workspace records are isolated behind random workspace keys generated in disposable browser contexts; no existing workspace was read or changed.
