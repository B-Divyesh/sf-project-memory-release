# Review 1 handoff — Project Memory Release

## Status

The M1 repair implementation remains deployed at
<https://project-memory-release.sociobot.in>. Verification 4 passed, but the
fresh strict [review 1](./review-1.md) found three interface-contract issues.
The current verdict is **FAIL — 3 findings and 0 untested claims**.

- **Implementation SHA:** `5b1aedd4200f6e3c60a801eb72603aa039b8356f`
- **Previous implementation SHA:** `c0bd4753543b33af1825cfab78fde5983d6aac7c`
- **Previous documentation-only SHA:** `46db283273a5782d38de2e7e2591ab7c6efd5d25`
- **Documentation report SHA:** `4a7b9fc09d5515c264b2ff0e4fe83222873d2127`
  (post-deployment report only; it is not the deployed image)
- **Documentation baseline:** `da1972f40da28ca280e2c8fe5fb633a03eda60b7`.
- **Live health:** `200`, reporting the documentation baseline SHA. The only
  changes from the implementation SHA are `.factory/handoff.md` and
  `.factory/plan.md`; candidate-built JS and CSS match live byte for byte when
  built with the live identity.
- **Independent verification:** [verification-4.md](./verification-4.md) —
  **PASS**, 0 findings and 0 untested claims.
- **Strict review:** [review-1.md](./review-1.md) — **FAIL**, 1 medium and 2 low
  findings, 0 untested claims.
- **Milestone:** M1 remains active. Repair and recheck review 1 before M2.

## Job, audience, and first action

The product releases trusted context for coding agents. It is for product
engineers whose agents need current decisions, architecture, and product
language. On a fresh desktop and phone browser, before scrolling, the first
action is **Try it with sample data**.

## What changed

1. Added an exact Markdown review step before release.
   - Real workspaces call `POST /api/releases/preview`; the Rust service
     compiles the source snapshot.
   - Confirmation sends the reviewed bytes and date back to `POST /api/releases`.
     The service recompiles and rejects a changed preview; it persists only
     byte-identical reviewed Markdown.
   - The demo uses the same preview/confirm sequence with a deterministic
     local compiler. A reset also removes any pending draft.
2. Completed the claims contract.
   - `.factory/claims.json` now lists 19 public claims with individual
     commands.
   - Added outcome regressions for one-file Markdown import, clipboard copy,
     demo/database isolation, browser-only license storage/request boundary,
     one-way workspace-key hashing, released-pack immutability, restart
     persistence, and unavailable checkout.
   - A browser guard compares runtime `data-claim` markers with the registry.
3. Made mobile controls meet the 44 × 44 CSS-pixel baseline.
   - Banner controls, source checkboxes/actions, Markdown actions, summaries,
     wordmark, and footer/legal links now have measured touch targets.
4. Made the required startup line visible without `RUST_LOG`.
   - Default tracing is `info` and emits non-secret port/data-directory source
     fields. A spawned binary test uses only `PORT`.
5. Kept the product within its performance budget.
   - The two self-hosted Latin font files total 108,928 bytes. The final build
     has 9.65 KB gzipped JavaScript and 3.74 KB gzipped CSS.

## Current review

Review 1 independently reran all 19 claim commands and the complete quality
gates from a clean detached checkout. The live demo and real workspace release
flows, backend isolation and persistence, offline reload, and rate limiting all
worked. Lighthouse mobile scored 99 performance, 100 accessibility, 100 best
practices, and 100 SEO.

Three mandatory details remain:

1. The orange focus outline is 2.63:1 against the paper background; it must be
   at least 3:1.
2. SPA navigation focuses the new heading, but the polite route-announcement
   region stays empty.
3. The external Param Factory footer link does not tell visitors that it leaves
   the product.

No product code was changed during review. See [review-1.md](./review-1.md) for
the full evidence and required repairs.

## Earlier verification

Independent verification 4 on 6 September 2026 passed all 19 claim
commands individually, the 28-test browser suite, the six-test Rust suite,
formatting, Clippy, release build, production build, live desktop/phone flows,
Axe, Lighthouse, offline reload, isolation, security headers, designed 404,
and live rate limiting. Lighthouse mobile scored 99 performance, 100
accessibility, 100 best practices, and 100 SEO. See
[verification-4.md](./verification-4.md) for the evidence and earlier-finding
disposition.

The builder verification below is retained as implementation history.

From a clean dependency install (`npm ci`), all 19 declared claim commands
were run individually and passed. The final full suite passed:

- `npm test` — 28/28 Playwright tests.
- `npm run test:unit` — 6/6 Rust tests, including a spawned binary restart
  test and a `PORT`-only startup-log test.
- `cargo fmt -- --check` — passed.
- `cargo clippy --locked --all-targets -- -D warnings` — passed.
- `CARGO_TARGET_DIR=/tmp/pmr-repair-release BUILD_SHA=5b1aedd… cargo build --release --locked` — passed.
- `npm run build` — produced `dist/` with the asset sizes above.
- The factory ACR/container deployment succeeded with `WO_DATA_DIR=/data`.
  The deployment tool preserved the product configuration/probes, uses the
  durable product mount, and pins SQLite to one replica.

Live checks used fresh browser contexts only. The desktop demo selected a
source, previewed the vendor-neutral reference, confirmed the release, kept
the demo label visible, and reset to the three-source/one-release sample. A
separate known empty real workspace was unchanged by demo mutation. Exiting
the demo opened an empty real workspace. A 390 px phone showed the same job
and first action without horizontal overflow.

`/opt/fleet/lib/verify-url.sh` passed against live HTTPS: title, language,
one `h1`, `main`, image alt text, labelled buttons, and no browser errors.
Live Playwright Axe checks found zero serious or critical issues on `/`,
`/demo`, `/workspace`, `/privacy`, `/terms`, and the designed expected 404.
The direct `@axe-core/cli` command was attempted twice but its Selenium
ChromeDriver could not start the supplied Chrome binary in this worker; this
is a verifier-environment limitation, not an Axe finding. The repository's
Playwright Axe integration ran successfully.

The live API rate-limit burst returned 40 × 200 then 10 × 429, and every 429
had `Retry-After: 1`. A live missing route returned the designed 404 and was
treated as expected. The Lighthouse CLI was also attempted with the supplied
Chrome binary but its tab crashed in this worker; the current build reduced
font payload and retains the earlier performance budget margins.

## How to run

```sh
npm ci
npm test
npm run test:unit
cargo fmt -- --check
cargo clippy --locked --all-targets -- -D warnings
npm run build
PORT=8080 DATA_DIR=./data cargo run
```

The one-click sandbox is `/demo`. Select sources, use **Review selected
Markdown**, then use **Release reviewed pack**. `Reset demo` restores the
sample and `Start for real` discards the demo session.

## Remaining work, dependencies, and limits

- M1 needs the three review-1 interface repairs above and a fresh review.

- M2 requires Sociobot Entra CIAM, signed organisation ownership, export/delete,
  and backup/restore evidence. The current bearer workspace key is not an M2
  account or membership system.
- New $99/team/month checkout remains unavailable. Existing-license recovery
  uses recorded verification responses in tests; it does not prove a registered
  subscription or hosted checkout. Factory billing registration is the M2
  dependency.
- M3 requires a scoped read-only Git provider app and fixture repository. No
  provider connection, crawl, or repository indexing is implemented in M1.
- No AI feature is needed for the M1 release workflow. No external provider
  credentials were added or used.
