# Review 1 — release trusted context for coding agents

## Verdict: FAIL

- Milestone: M1 — reviewable manual context release
- Candidate implementation: `5b1aedd4200f6e3c60a801eb72603aa039b8356f`
- Documentation reviewed: `0a8ed0f4eec22b7eff62402c8f58bf5df127d110`
- Live build identity: `da1972f40da28ca280e2c8fe5fb633a03eda60b7`
- Live URL: <https://project-memory-release.sociobot.in>
- Reviewed: 6 September 2026
- Findings: **3** — 1 medium, 2 low
- Untested public claims: **0**

The M1 core job, demo boundary, backend, and all declared claims work. The
release does not pass this stricter review because three mandatory
accessibility and site-structure details remain open.

## First screen before scrolling

Fresh desktop and separate 390 × 844 phone contexts showed:

- Job: **Release trusted context for coding agents**.
- Audience: product engineers whose agents need current decisions,
  architecture, and product language.
- First action: **Try it with sample data**.
- Next result: **A reviewable context pack opens next.**

The first screen uses plain words and gives the job, audience, and action
without scrolling. Both viewports had no normal-size horizontal overflow.

## Findings

### Medium — the focus indicator misses the required contrast on paper

Focused links and controls use a 3 px `rgb(218, 123, 57)` outline. Against the
main paper background `rgb(244, 238, 220)`, the contrast ratio is **2.63:1**.
The attached accessibility contract requires at least 3:1.

This affects keyboard focus on common light-background controls, including
the first-screen sample action and navigation links. Axe does not measure this
state, so its clean scan does not close the issue.

Required repair: use a focus color or two-color indicator that reaches at
least 3:1 against every adjacent surface, then measure the focused controls on
the live page.

### Low — route changes do not populate the polite announcement region

In-app navigation correctly moves focus to the new `h1`. However,
`#route-announcer[aria-live="polite"]` was empty before and after navigating
from `/demo` to `/privacy`. The renderer inserts the action-status
`liveMessage`, not the new page heading or title.

The site-structure contract requires both heading focus and a polite route
announcement. Required repair: keep a stable live region and update it with
the new page heading after each SPA route change. Add a browser assertion for
the announced text.

### Low — the external footer link is not identified to visitors

The footer link has the accessible and visible name **Built by Param Factory**.
It has `rel="external"`, but no visible suffix, `aria-label`, or title tells a
visitor that it leaves this product. The site-structure contract says external
links must say so.

Required repair: add a plain visible or accessible external-site indication
without changing the destination.

## Demo and real release flow

The one-click action opened `/demo` with three realistic approved sources and
one released pack. The persistent label read **Demo — sample data, nothing is
saved**.

I selected the invite-link decision and entered version
`review-1-2026.09.06`. Before confirmation, the exact preview contained:

- `docs/product/access-decisions.md @ b5e881d`;
- its `project-memory://` reference;
- no already released pack with that version.

After **Release reviewed pack**, the released Markdown equaled the preview
byte for byte and the demo label stayed visible. After the reset settled, the
demo returned to three sources and one release. **Start for real** removed the
demo session and opened a newly generated empty workspace. Demo mutations were
only `POST /api/demo/session` requests with no workspace header.

A separate new live workspace completed the real UI flow: add a source,
select it, preview before persistence, release, reload, and delete the source.
The released Markdown remained unchanged, became stale after deletion, and
survived the reload. Only disposable random QA workspaces were used; no
existing workspace was read or changed.

## Declared claims

After `npm ci` in a detached clean checkout at the candidate SHA, every command
in `.factory/claims.json` was run separately.

| Claim | Result |
| --- | --- |
| `reviewable-pack` | PASS |
| `stale-citations` | PASS |
| `markdown-download` | PASS |
| `markdown-import` | PASS |
| `markdown-copy` | PASS |
| `released-pack-immutable` | PASS |
| `demo-privacy` | PASS |
| `demo-database-isolation` | PASS |
| `offline-demo` | PASS |
| `license-restore` | PASS with its declared recorded response |
| `license-storage-boundary` | PASS with its declared recorded response |
| `workspace-key-hash` | PASS |
| `sqlite-restart-persistence` | PASS |
| `no-repository-indexing` | PASS |
| `free-first-release` | PASS |
| `licensed-recurring-releases` | PASS with its declared recorded response |
| `licensed-shared-workspace` | PASS with its declared recorded response |
| `first-party-assets` | PASS |
| `checkout-unavailable` | PASS |

Result: **19/19 passed and 0 public claims are untested.** The claim-marker
coverage guard also passed. Manual review of the landing page, workspace,
privacy page, terms, demo documentation, and README found no additional
shipped-capability claim needing a test.

## Clean-checkout gates

- `npm ci`: passed; 23 packages, 0 vulnerabilities.
- `npm test`: passed, 28/28 Playwright 1.58.2 Chromium tests.
- `npm run test:unit`: passed, 6/6 Rust tests.
- `cargo fmt -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- Candidate release build with `--locked`: passed.
- `npm run build`: passed and produced `dist/`.
- Initial JavaScript: 9.69 KB gzip; CSS: 3.74 KB gzip.
- Self-hosted fonts: 108,928 bytes; phone hero: 42,016 bytes.
- Docker was unavailable. Both build stages ran directly, and the Dockerfile
  was inspected for the build-argument, non-root, `PORT`, and copy contracts.

## Live browser and accessibility evidence

- The factory URL verifier passed HTTPS, title, language, one `h1`, `main`,
  image alternatives, button labels, and normal-load console checks.
- `/`, `/demo`, `/workspace`, `/privacy`, and `/terms` returned 200 with one
  `h1`, one `main`, correct route titles, and route-specific canonical URLs.
- A deliberate missing route returned HTTP 404 with the designed **Page not
  found** screen. Its expected 404 network message is not a defect.
- Playwright Axe found no serious or critical issue on all normal routes and
  the designed 404. The manual focus-state finding above remains open.
- The skip link becomes visible with keyboard focus and skips the header.
  Dialog focus enters the first field, wraps, closes with Escape, and returns
  to its opener. SPA back navigation restores `/demo`, its title, and focused
  heading. The route-announcement finding above remains open.
- At 390 px, visible links, buttons, inputs, selects, textareas, and summaries
  measured at least 44 × 44 CSS pixels. At 200% text size, the content and core
  actions remained available. Reduced motion cut the release animation to
  `0.00001s` and set scrolling to `auto`.
- A fresh `/demo` context reloaded offline after its first online visit and
  retained the sample and demo label.
- Same-origin links returned 200. Privacy and terms contain explicit email
  request links. The only external site link is the footer link described in
  the finding above; it was not fetched because it is outside this product's
  work-order boundary.
- Normal product and demo browsing made no third-party request. CSP, frame
  restriction, content-type, referrer, and permissions headers were present.
  HTML and the service worker revalidate; hashed assets are immutable; API and
  health responses use `no-store`.
- Lighthouse 13.4.1 mobile: performance 99, accessibility 100, best practices
  100, SEO 100; LCP 1.7 s, CLS 0.001, TBT 0 ms.

## Live backend evidence

- `/health`: 200, build SHA
  `da1972f40da28ca280e2c8fe5fb633a03eda60b7`, `Cache-Control: no-store`.
- A missing workspace key returned 401 with recovery text.
- A malformed Git revision returned 400 with a specific correction.
- Maximum accepted title, body, source-path, and revision lengths returned
  HTTP 200.
- A new workspace preview included its path, revision, and vendor-neutral
  reference. A changed preview returned 400. Exact reviewed bytes returned 200.
- A second random workspace had zero sources and zero releases.
- Deleting the source left the release bytes unchanged and marked one stale
  source.
- A 50-request burst from one forwarded client address returned 40 × 200 and
  10 × 429. Every 429 had `Retry-After: 1`. Fifty health requests remained 200.
- The clean local restart claim retained SQLite state in the same data
  directory. No live service or infrastructure was restarted.

## Candidate and live identity

The live service reports the documentation build SHA `da1972f`. Between
`5b1aedd` and `da1972f`, only `.factory/handoff.md` and `.factory/plan.md`
changed. Building the candidate with the live identity produced JavaScript
and CSS that matched the live assets byte for byte. The implementation under
review is therefore `5b1aedd`; the input documentation SHA is `0a8ed0f`.

The referenced external path
`factory-evidence/project-memory-release-verify-4/qa-report.md` was not mounted
in this worker. The full repository copy `.factory/verification-4.md` was read,
and its claims were independently rerun rather than trusted by reference.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Chromium rejected the Git revision pattern; demo accepted malformed revisions | Resolved. Current browser and API checks reject malformed revisions without a pattern error. |
| Advertised team checkout returned 404 | Resolved honestly for M1. New checkout is stated unavailable and no purchase action is shown. |
| Static assets lacked a cache policy | Resolved. Hashed assets are immutable; HTML and `sw.js` revalidate. |
| Non-indexing, free release, licensed behavior, and first-party assets lacked claims | Resolved. Their declared outcome commands pass. |
| Exact Markdown could not be reviewed before release | Resolved. Demo and real UI/API paths preview before persistence and retain exact bytes. |
| Eight claims were missing or incompletely tested | Resolved. All 19 current claim commands pass individually. |
| Phone controls were below 44 × 44 px | Resolved at normal text size. Zero visible demo targets measured below the minimum at 390 px. |
| Default startup logging was suppressed | Resolved. The `PORT`-only process test observes the non-secret configuration line. |

## Milestone and external dependencies

M1 remains active because this review found three issues. Its core manual
release job is otherwise complete and does not need M2 or M3 functionality to
close these findings.

M2 remains separate future work: Sociobot Entra sign-in, signed organisations,
role and tenant enforcement, export/delete, backup/restore evidence, and
factory registration of the $99/team/month subscription. Recorded license
responses prove current entitlement behavior, not a live purchase.

M3 remains separate future work: a scoped read-only Git provider connection
and provider-backed revision checks. M1 does not claim repository connection,
crawling, or automatic indexing.

No AI feature is needed for the current manual release workflow. No AI,
billing, identity, Git-provider, email, or shared PostgreSQL dependency was
used during this review.

## Final result

**FAIL — 3 findings and 0 untested claims. M1 is not accepted by review 1.**
