# Independent verification — FAIL

- **Candidate:** `c0d6da0fa6dfd468328c36220cc0a9cea5f52cc8`
- **Live URL:** `https://project-memory-release.sociobot.in`
- **Verified:** 2026-09-02
- **Verdict:** **FAIL**

## First read (cold live page)

The first screen says that Project Memory Release releases trusted context for coding agents. It identifies product engineers whose agents need current decisions, architecture, and product language as its audience. The clear first action is **Try it with sample data**, and it says that a reviewable context pack opens next. This satisfies the plain-language and one-click-demo requirement.

## Release-blocking defects

### High — Git revision validation emits a browser error and demo accepts invalid revisions

On live `/demo` and `/workspace`, the source form uses the pattern
`[A-Za-z0-9._/-]+`. Chromium rejects this under its `v`-flag pattern semantics:

```
Pattern attribute value [A-Za-z0-9._/-]+ is not a valid regular expression:
Invalid regular expression: /[A-Za-z0-9._/-]+/v: Invalid character in character class
```

Consequences observed in a real browser:

- `bad revision!` is considered valid by client validation.
- In `/demo` it is accepted and can be released into a context pack, violating the promised Git-revision provenance boundary.
- In `/workspace` the server correctly rejects it with the recovery message `Use a revision with letters, numbers, dots, slashes, dashes, or underscores.`, but the browser console still records the pattern error (and the expected 400 request error).

This is a normal source-entry path, creates a console error, and permits malformed source revisions in the required demo sandbox.

### High — advertised team checkout is not provisioned

The live primary billing destination returns 404:

```
GET https://api.sociobot.in/api/v1/products/project-memory-release/checkout
HTTP/2 404
```

The landing page advertises `$99 per team, each month` and links **Buy the team plan** to that endpoint. A visitor cannot buy the described subscription. The `paid-plan` claim test is insufficient because it asserts only the literal `href`, not a working hosted checkout.

## Test evidence

### Clean checkout and quality gates

1. `npm ci` completed with zero vulnerabilities.
2. Immediately before installing dependencies, every listed claim command failed at the build precondition because a clean checkout has no installed `tsc` (`sh: 1: tsc: not found`). After the required `npm ci`, the complete claim suite passed from the shipped demo entry point.
3. `npm test` passed: **12/12** Playwright tests, including all seven `@claim:` tests, real-workspace create/release, 390px smoke, keyboard dialog focus, rate limit, and Axe.
4. `npm run test:unit` passed: **3/3** Rust tests.
5. `npm run build` passed and produced `dist/` (initial JS 9.00 KB gzip; CSS 3.87 KB gzip).
6. `cargo fmt -- --check` and `cargo clippy --locked --all-targets -- -D warnings` passed.
7. `CARGO_TARGET_DIR=/tmp/pmr-verify-release cargo build --release --locked` passed. Docker CLI was unavailable, so a container build itself could not be run here; the Dockerfile was inspected and the independently built frontend and release binary passed.

### Claims

All `.factory/claims.json` entries have one matching tagged test and passed in the complete clean suite:

| Claim | Result |
| --- | --- |
| `reviewable-pack` | PASS |
| `stale-citations` | PASS |
| `markdown-download` | PASS |
| `demo-privacy` | PASS |
| `offline-demo` | PASS |
| `license-restore` | PASS (intercepted fixture) |
| `paid-plan` | PASS as written, but inadequate; live checkout is 404 |

### Live deployment

- `/health` returned 200 with `{"build_sha":"c0d6da0fa6dfd468328c36220cc0a9cea5f52cc8","status":"ok"}`. The deployed backend identifies as the requested candidate. The frontend hash differs only because the deployed Vite build embeds that SHA in the footer; its otherwise identical local build uses the default `1.0.0` value.
- Cold landing, `/demo`, `/workspace`, `/privacy`, `/terms`, and designed `/missing` state rendered correctly. The first-screen interaction opened a seeded demo with three approved sources and one release.
- Live normal-path demo test added a realistic source, selected it, released version `2026.09.02`, and showed the new reviewable pack. Invalid required fields produced native recovery. The malformed-revision failure above is the exception.
- Mobile at 390x844 had no horizontal overflow (`scrollWidth = clientWidth = 390`). Reduced motion yielded `0.00001s` transitions. Keyboard dialog test passes locally; native focus was visible in the live browser smoke.
- Live Axe on `/`, `/demo`, `/privacy`, `/terms`, and `/missing`: **0 serious/critical** findings. No page errors on cold public-route loads.
- Live demo request log contained only `https://project-memory-release.sociobot.in`; no analytics or third-party request was observed. The live service worker reloaded `/demo` offline after the first visit with the bundled sample present.
- Security response headers included `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, permissions policy, and a CSP with response-header `frame-ancestors 'none'`.
- Rate-limit burst to `/api/state` using one `X-Forwarded-For` value: **40** responses at 401 (the unauthenticated endpoint response), then **10** at 429; 429 carried `Retry-After: 1`. Observed allowance: 40 requests/client/second.

### Additional non-blocking finding

**Medium — no cache policy on static assets.** The live HTML, hashed JS/CSS, images, and service worker return no `Cache-Control`, `ETag`, or `Content-Encoding` header. For example the hashed JS is 27,502 bytes and only has `Last-Modified`. This does not meet the documented long-lived immutable caching policy for hashed assets and leaves repeat-load performance to the service worker rather than HTTP caching.

## Artifacts

Browser screenshots were captured during verification at `/tmp/pmr-live-desktop.png`, `/tmp/pmr-live-demo.png`, and `/tmp/pmr-live-mobile-demo.png` in the verifier container. They are evidence only and are not product changes.

## Required resolution before release

1. Correct and test the revision pattern in current Chromium; add a claim or browser test proving malformed revisions are rejected in `/demo` before a release can be created, with no console error.
2. Register/provision the Sociobot billing product so its documented checkout endpoint returns a hosted checkout. Expand the `paid-plan` claim to assert a non-404 checkout response/redirect in an appropriate billing test environment.
3. Add immutable `Cache-Control` headers for content-hashed assets and a deliberate caching policy for HTML and `sw.js`.
