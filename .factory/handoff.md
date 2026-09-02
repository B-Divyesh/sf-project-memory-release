# Project Memory Release repair handoff

## Repair scope

This repair addresses the release blocker in independent report commit `ee42fb8c5f3e8bb81482b1df31cb1afcf724d20c` for candidate `c28e070885c998bd3b073386bc9b439227dcd300`. The report found that several visitor-facing statements had no matching entries or observable tests in `.factory/claims.json`.

The earlier revision-validation, checkout-copy, and HTTP-cache repairs remain unchanged and covered.

## What changed

- Added claim entries and one tagged browser regression each for automatic repository indexing, the free first release, licensed repeat releases, licensed workspace-key sharing, and first-party frontend assets.
- Changed vague team-license copy into two testable statements: a verified license allows more releases, and the license holder can share a workspace key.
- Made the entitlement tests exercise outcomes, not labels. They enter through `/demo`, start a clean real workspace, create the free release, verify a recorded Sociobot response, create a second release, and open the same workspace in a separate browser context.
- Added a claims-contract guard that requires every declared claim to have exactly one matching `@claim:<id>` test.
- Expanded browser checks to every route for serious/critical Axe findings, 390px overflow, normal-load console errors, and reduced-motion behavior.
- Updated `.factory/copy-audit.md`; the landing page still has no sentence over 22 words and no banned wording.

## Verification evidence

Run on 2 September 2026 from a clean dependency install:

- `npm ci`: 23 packages installed, 0 vulnerabilities.
- Every command in `.factory/claims.json` passed independently: 11/11 claims.
- `npm test`: 21/21 Playwright 1.58.2 Chromium tests passed.
- `npm run test:unit`: 3/3 Rust tests passed.
- `cargo fmt -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- `CARGO_TARGET_DIR=/tmp/project-memory-release-repair-release BUILD_SHA=repair-local cargo build --release --locked`: passed.
- `npm run build`: produced `dist/`; initial JS is 8.94 KB gzip and CSS is 3.87 KB gzip.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4180 /tmp/pmr-evidence-local`: HTTP 200, no console errors, `lang=en`, one `h1`, one `main`, no image missing alt text, and no unlabeled button.
- Lighthouse 12.8.2 mobile: performance 98, accessibility 100, best practices 100, SEO 100, LCP 2.0 s, CLS 0.044, TBT 0 ms.
- Lighthouse 12.8.2 desktop: 100 in all four categories, LCP 0.5 s, CLS 0, TBT 0 ms.
- Local 100-request concurrent load smoke: 40 responses at 200 and 60 at the expected rate-limited 429. The browser suite verifies `Retry-After: 1`.

## Run and verify

```sh
npm ci
npm test
npm run test:unit
cargo fmt -- --check
cargo clippy --locked --all-targets -- -D warnings
CARGO_TARGET_DIR=/tmp/project-memory-release-release cargo build --release --locked
```

`npm test` builds the production frontend, starts the Rust server, and runs the complete browser suite. The container starts with only `PORT` and writes SQLite state to `/data/project-memory-release.sqlite3` when the fleet mount exists, otherwise to `./data`.

## Deployment

Deploy the committed tree with:

```sh
WO_DATA_DIR=/data /opt/fleet/lib/deploy-container.sh project-memory-release /work/repo Dockerfile 8080
```

Post-deploy acceptance requires `/health` to report the pushed commit, the fleet URL verifier to pass, and live claim, mobile, privacy, accessibility, offline, caching, and rate-limit smokes to match local evidence.

## Known limit and boundaries

New team checkout remains unavailable because no registered checkout exists. The UI does not offer a dead purchase link. Existing Sociobot licenses can be restored; their repeat-release and workspace-key-sharing behavior is now covered with recorded verification responses.

No AI feature is part of the researched job, so no model or gateway call was added. The existing original illustration and visual system were preserved. No other product, shared database, Key Vault, staging slot, or storage outside the fleet-managed `sf-project-memory-release-data` share was accessed or changed.
