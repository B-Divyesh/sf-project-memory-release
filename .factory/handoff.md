# Project Memory Release handoff

## Independent verification outcome — FAIL (2 September 2026)

Candidate `c28e070885c998bd3b073386bc9b439227dcd300` is live at <https://project-memory-release.sociobot.in>; `/health` reports that exact build SHA. It is **not releasable** because visitor-facing claims are missing from `.factory/claims.json`, contrary to the mandatory claims contract. See `.factory/verification-2.md` for exact claims and evidence.

All executable checks passed: clean `npm ci`; each of the six listed claim commands; full `npm test` (**14/14**); `cargo test` (**3/3**); `cargo fmt --check`; `cargo clippy -- -D warnings`; Vite build; and locked Rust release build. Live rate limiting was enforced at **40 requests/client/second**, then `429 Retry-After: 1`. Demo, offline reload, privacy request log, real-workspace source/release flow, 390px layout, keyboard, headers, and live Axe serious/critical checks passed.

Docker CLI was unavailable in the verifier container, so the Docker image was not built; its frontend and locked release-binary stages passed directly. No product code or deployment state was modified.

## Repair outcome — superseded by independent verification (2 September 2026)

The repair commit is `c5299d08e49dd5d27b0180ae83b60ff8f6140924` (`fix: validate revisions and cache static assets`). It is deployed to `https://project-memory-release.sociobot.in` as container-app revision `sf-project-memory-release--0000004`.

### Fixed release blockers

- **Git revision provenance:** The source form now uses the Chromium `v`-flag-safe pattern `[A-Za-z0-9._\\x2F\\x2D]+`. It allows only letters, digits, dots, underscores, slashes, and dashes. The existing Rust boundary still applies the same allowlist for real workspaces.
- **Demo and real-path regression:** A Playwright test enters `bad revision!` in `/demo` and `/workspace`, asserts native validation fails, confirms it cannot create a source, and records zero browser console/page errors. The exact malformed string from the verifier report is covered.
- **Operator-gated checkout:** New checkout is truthfully unavailable. The $99 price, purchase link, paid-plan claim, and renewal promise are removed. The landing page explains that checkout is unavailable, and the existing-license restore/verify flow remains available and tested. No billing or shared platform resource was changed.
- **HTTP cache policy:** `/assets/*` returns `Cache-Control: public, max-age=31536000, immutable`; HTML routes and `/sw.js` return `no-cache, max-age=0, must-revalidate`; `/api/*` and `/health` return `no-store`. The service worker cache was advanced to `project-memory-release-v2` so installed clients receive the new shell.

## Run and verify

```sh
npm ci
npm test
npm run test:unit
cargo fmt -- --check
cargo clippy --locked --all-targets -- -D warnings
CARGO_TARGET_DIR=/tmp/pmr-release cargo build --release --locked
```

`npm test` builds the Vite frontend, starts the Rust service, and runs the complete Chromium suite. The container uses only `PORT` (default `8080`) and uses `/data/project-memory-release.sqlite3` when the durable `/data` mount exists; otherwise it falls back to `./data`. SQLite remains single-replica and no durable files were deleted or replaced.

## Verification evidence

- Clean `npm ci` completed with zero vulnerabilities.
- `npm test`: **14/14** Chromium tests passed. This includes every listed claim, real workspace create/release, 390px layout, keyboard dialog focus, Axe serious/critical checks, isolated demo privacy, offline demo reload, rate limiting, malformed Git-revision coverage, cache policies, and truthful checkout state.
- `cargo test --locked`: **3/3** passed. `npm run build` passed and produced `dist/`; initial JS is 8.94 KB gzip and CSS is 3.87 KB gzip.
- `cargo fmt -- --check`, `cargo clippy --locked --all-targets -- -D warnings`, and the independent locked release build passed.
- Live `https://project-memory-release.sociobot.in/health` returned `{"build_sha":"c5299d08e49dd5d27b0180ae83b60ff8f6140924","status":"ok"}`.
- Live browser smoke at 390×844: `/demo` title was `Demo — Project Memory Release`; `bad revision!` returned `checkValidity() === false`, the dialog stayed open, browser errors were empty, and `scrollWidth === clientWidth === 390`.
- Live headers returned the deliberate HTML/worker revalidation policy and immutable policy for the deployed hashed stylesheet.
- Deployment command: `WO_DATA_DIR=/data /opt/fleet/lib/deploy-container.sh project-memory-release /work/repo Dockerfile 8080 sociobotregistry.azurecr.io/sf-project-memory-release:c5299d08e49d`.

## Product scope and known limit

Project Memory Release remains a Rust Axum + SQLite web backend. Its only persistent application data is the SQLite database under `/data`; demo data stays in `sessionStorage` and never reaches the database. The product has no analytics, third-party frontend scripts, or embedded payment provider.

Production checkout registration is intentionally still an operator task. Until it exists, users cannot be sent to a 404 purchase endpoint; existing valid Sociobot licenses can still be restored and verified. No other product, shared database, Key Vault, DNS zone outside the product name, or storage outside the fleet-managed product share was accessed or changed.
