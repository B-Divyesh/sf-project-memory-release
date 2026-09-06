# Verification 4 — release project context packs

## Verdict: PASS

- Milestone: M1 — reviewable manual context release
- Candidate implementation: `5b1aedd4200f6e3c60a801eb72603aa039b8356f`
- Documentation baseline: `da1972f40da28ca280e2c8fe5fb633a03eda60b7`
- Live build identity observed: `da1972f40da28ca280e2c8fe5fb633a03eda60b7`
- Live URL: <https://project-memory-release.sociobot.in>
- Verified: 6 September 2026
- Findings: **0**
- Untested public claims: **0**

M1 passes fresh independent verification. The live build identity is the later
documentation SHA, but the only changes from the candidate are
`.factory/handoff.md` and `.factory/plan.md`. A clean build of the candidate
with that build identity produced JavaScript and CSS that match the live files
byte for byte. The implementation reviewed is therefore `5b1aedd`; the later
SHA does not contain a product-code change.

## First screen before scrolling

Fresh desktop and 390 × 844 phone contexts showed:

- Job: **Release trusted context for coding agents**.
- Audience: product engineers whose agents need current decisions,
  architecture, and product language.
- First action: **Try it with sample data**.
- Stated next result: **A reviewable context pack opens next.**

The copy is direct, uses one product term for each concept, and makes the job,
audience, and action clear before scrolling.

## Demo and core release flow

The one-click action opened `/demo` with three realistic approved sources and
one released pack. The persistent label read **Demo — sample data, nothing is
saved**.

I added a demo source, selected the invite-link decision, entered version
`qa-live-4`, and opened the exact Markdown preview. Before confirmation:

- the preview included `docs/product/access-decisions.md @ b5e881d`;
- it included the vendor-neutral `project-memory://` reference;
- no released `qa-live-4` pack existed.

**Release reviewed pack** then created the pack. The demo label stayed visible.
**Reset demo** restored three sources and one release and removed both QA
changes. Demo activity called only `POST /api/demo/session`, without a workspace
header or a real write endpoint. **Start for real** opened an empty random
workspace with no demo record. No existing workspace was read or changed.

## Declared claims

Every command in `.factory/claims.json` was run separately after `npm ci` in a
detached clean checkout at the candidate SHA.

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
| `license-restore` | PASS with the declared recorded response |
| `license-storage-boundary` | PASS with the declared recorded response |
| `workspace-key-hash` | PASS |
| `sqlite-restart-persistence` | PASS |
| `no-repository-indexing` | PASS |
| `free-first-release` | PASS |
| `licensed-recurring-releases` | PASS with the declared recorded response |
| `licensed-shared-workspace` | PASS with the declared recorded response |
| `first-party-assets` | PASS |
| `checkout-unavailable` | PASS |

Result: **19/19 passed, with zero untested or incompletely tested public
claims.** The runtime claim-marker guard also matched every registered claim
across landing, demo, workspace, privacy, and terms routes. Manual review of
those routes and README found no additional shipped-capability claim.

## Clean checkout and build evidence

- Detached checkout: `5b1aedd4200f6e3c60a801eb72603aa039b8356f`.
- `npm ci`: passed; 23 packages, 0 vulnerabilities.
- `npm test`: 28/28 Playwright 1.58.2 Chromium tests passed.
- `npm run test:unit`: 6/6 Rust tests passed.
- `cargo fmt -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- Candidate release build with `--locked`: passed.
- `npm run build`: passed and produced `dist/`.
- A process started with only `PORT` served health and logged the non-secret
  `port_source`, `data_dir`, and `data_dir_source` configuration fields.

Docker was not installed in the verifier container. Both build stages were
exercised directly, the Dockerfile contract was inspected, and the live
container served the source-matched bundle and healthy backend.

## Live browser, accessibility, privacy, and performance

- The factory `verify-url.sh` passed: HTTPS 200, `lang=en`, title, one `h1`,
  `main`, image alternatives, labelled buttons, and no normal-load errors.
- `/`, `/demo`, `/workspace`, `/privacy`, and `/terms` returned 200 with their
  own correct titles, one `h1`, and one `main`.
- The deliberate missing route returned HTTP 404 with the designed **Page not
  found** screen and a working **Return home** link. It is expected behavior.
- Playwright Axe found 0 serious or critical issues on all five normal routes
  and the designed 404.
- Keyboard checks passed for the visible skip link, 3 px focus outline, dialog
  opening, focus containment, Escape close, and focus return.
- Back navigation restored the URL, title, and heading focus.
- At 390 px, there was no horizontal overflow and every visible link, button,
  input, select, textarea, and summary measured at least 44 × 44 CSS pixels.
- Text-only resize to 200% kept content and actions available. Reduced motion
  changed the page-settle animation to `0.00001s` and scrolling to `auto`.
- After one online visit, a fresh `/demo` context reloaded offline with the
  sample and demo label present.
- Same-origin route links returned 200. Privacy and terms provide working
  `mailto:` request paths. Robots, sitemap, favicon, touch icon, social image,
  and service worker returned 200.
- Normal product and demo browsing made no third-party asset or tracking
  request. The CSP permits only the stated Sociobot license verification
  origin; no license is sent without an explicit restore action.
- HTML and the worker revalidate; hashed JS/CSS are immutable; API and health
  use `no-store`. CSP, frame restrictions, content-type, referrer, and
  permissions headers were present.
- Lighthouse 12.8.2 mobile: performance 99, accessibility 100, best practices
  100, SEO 100; LCP 1.68 s, CLS 0.0014, TBT 0 ms.
- Initial JavaScript is 9.69 KB gzip, CSS is 3.75 KB gzip, self-hosted fonts
  total 108,928 bytes, and the mobile hero is 42,016 bytes.

## Live backend checks

- `/health` returned 200 and `no-store`.
- Missing workspace key: 401 with recovery text.
- Malformed Git revision: 400 with a specific correction.
- Maximum accepted title, body, path, and revision lengths: 200.
- A disposable workspace preview contained its path, revision, and
  vendor-neutral reference. A changed preview was rejected with 400. The exact
  reviewed bytes were accepted and remained available on a later read.
- A second random workspace saw zero entries and zero releases.
- Deleting the source left the released Markdown byte-for-byte unchanged and
  marked its citation stale.
- A 50-request burst from one forwarded client address returned 40 × 200 and
  10 × 429. Every 429 had `Retry-After: 1`.
- Fifty health requests from that address remained 200.
- The clean local restart test retained SQLite state from the same data
  directory. No live service restart or infrastructure change was performed.

Only disposable random QA workspace records were created. No other product,
shared service, staging slot, database, secret store, infrastructure, DNS, or
billing resource was accessed.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Chromium rejected the revision pattern; demo accepted malformed revisions | Resolved. Current Chromium accepts the corrected pattern; demo and API reject malformed values, and the regression passed. |
| The advertised team checkout returned 404 | Resolved honestly. No purchase action is advertised; checkout is clearly unavailable, and the exact unavailable-state claim passed. |
| Static assets lacked a cache policy | Resolved. Hashed JS/CSS are immutable, while HTML and `sw.js` revalidate. |
| Non-indexing, free release, team behavior, and first-party asset claims were missing | Resolved. Each retained claim has one registered outcome test and all commands passed. |
| Exact Markdown could not be reviewed before release | Resolved. Live demo and real-workspace tests prove preview before persistence and byte equality after confirmation. |
| Eight retained claims were missing or incompletely tested | Resolved. Import, copy, demo/database isolation, license storage, hashed workspace keys, immutable releases, and restart persistence now have exact tests. |
| Phone controls were smaller than 44 × 44 px | Resolved. The live 390 px measurement found zero undersized visible targets. |
| Default startup logging was suppressed | Resolved. A process with only `PORT` emitted the required non-secret configuration line. |

## Milestone and later dependencies

M1 is independently accepted. It ships the manual, review-before-release job
with demo isolation and a free first release.

M2 remains separate future work: Sociobot Entra sign-in, signed organisations,
role and tenant enforcement, export/delete, backup/restore evidence, and
factory registration of the $99/team/month subscription. Recorded license
responses prove current entitlement behavior, not a live new purchase.

M3 remains separate future work: a scoped read-only Git provider connection
and provider-backed revision checks. M1 does not claim repository connection,
crawling, or automatic indexing.

## Final result

**PASS — 0 findings and 0 untested claims. M1 is accepted.**
