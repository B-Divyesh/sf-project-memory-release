# Project Memory Release handoff

## Independent verification — **FAIL** (2026-09-02)

Candidate `c0d6da0fa6dfd468328c36220cc0a9cea5f52cc8` at `https://project-memory-release.sociobot.in` **must not release**.

- **High:** Chromium rejects the Git revision form pattern. It logs a console error and `/demo` accepts `bad revision!`, allowing malformed provenance in a released sample pack. The real workspace server rejects it, but client validation remains broken.
- **High:** `https://api.sociobot.in/api/v1/products/project-memory-release/checkout` returns **404**, so the advertised $99/month team plan cannot be purchased.
- **Medium:** static assets have no HTTP cache policy (`Cache-Control`/`ETag` absent).

All local automated tests passed after `npm ci` (12 Playwright, 3 Rust), the release binary built successfully, live health returned the exact candidate SHA, and the live demo, privacy, offline, rate-limit, mobile, keyboard, and Axe checks otherwise passed. Full evidence and reproduction details are in `.factory/verification.md`.

## Repair on 2 September 2026

- Reproduced the failed release on revision `sf-project-memory-release--xeqtbcc`. It was unhealthy with 11 restarts; container logs showed a panic at startup while running migrations: SQLite error code 5, `database is locked`. The listener was never reached, which caused both hostnames to return `000`.
- Kept the existing `/data` mount and database path unchanged. No durable files, shares, or rows were deleted or replaced.
- Changed SQLite startup to one pooled connection, a five-second busy timeout, and 30 bounded retries with structured warnings. On Linux it uses SQLite's `unix-dotfile` VFS because the Azure Files SMB mount did not release the default POSIX byte-range lock even after every old replica was drained. The database path and rollback journal remain unchanged.
- Added a regression test that holds the database under an exclusive lock, proves startup remains alive, releases the lock, and verifies the migration succeeds.
- Added an explicit keyboard dialog-focus test. It covers Enter activation, focus wrapping, Escape dismissal, and focus return.
- Raised the current-status ink used on dark release sheets after Axe measured the old composite at 4.44:1.

## What shipped

- Rust 2021 Axum service on `PORT` with SQLx/SQLite migrations, structured logs, graceful shutdown, CSP/security headers, build SHA health response, and forwarded-IP rate limiting.
- Browser-keyed private workspaces. The server stores only a SHA-256 hash of each workspace key.
- Source records for ADRs, glossary terms, and product decisions, including Markdown file import, source path, and Git revision.
- Reviewable, versioned Markdown context packs with `project-memory://` references, copy/download actions, retained release content, and stale citation detection.
- A one-click `/demo` seeded with three realistic sources and one release. Demo mutations use `demo:project-memory-release:state` in `sessionStorage` and never enter a real workspace.
- Offline demo reload after the first visit, with a clear offline state and service-worker cache.
- $99/team/month plan through the Sociobot checkout and license verification contract. The free plan gets one release. A valid license enables recurring releases and shared workspace-key access.
- Landing, workspace, demo, privacy, terms, SPA 404, metadata, sitemap, robots, Open Graph artwork, responsive 390px layouts, focus management, and reduced-motion treatment.
- Original notebook hero generated with the Factory image deployment. Source, prompt, optimized WebP variants, and provenance are recorded in `.factory/design.md`.

## Run and verify

```sh
npm install
npm run build
PORT=8080 DATA_DIR=./data cargo run
npm test
cargo test
```

`npm run build` writes `dist/index.html`. The production image is built from the root `Dockerfile`; it is multi-stage, runs as UID 10001, and needs only `PORT`.

## Local verification completed on 2 September 2026

- Exact clean build: `npm ci && npm run build && cargo build --release --locked` passed and produced `dist/` plus the release server binary.
- `npm test`: 12/12 Playwright tests passed.
- `cargo test --locked`: 3/3 Rust tests passed, including locked-database startup recovery.
- `cargo fmt -- --check` and `cargo clippy --locked --all-targets -- -D warnings`: passed.
- Every `.factory/claims.json` command is covered by one tagged browser test.
- Axe: no serious or critical findings on `/` and `/demo`.
- Responsive smoke: `/`, `/demo`, `/privacy`, `/terms`, and the 404 state passed at 390×844. Keyboard-only dialog navigation passed.
- Offline reload, isolated demo privacy, license fixture, rate limiting, real workspace writes, and every claim command passed.
- Production-style non-root smoke with only `PORT` set: `/health` returned 200 with `{"status":"ok","build_sha":"dev"}` and `/` returned 200.
- Lighthouse mobile: performance 99, accessibility 100, best practices 100, SEO 100.
- Lighthouse metrics: LCP 1.7 s, CLS 0, total blocking time 0 ms.
- Initial assets: JS 9.00 KB gzip and CSS 3.87 KB gzip.
- Load smoke: 100 concurrent `/health` requests completed successfully in 237 ms (422 requests/second observed locally).
- API rate-limit test: excess requests return 429 with `Retry-After: 1`.
- `npm audit --omit=dev`: zero vulnerabilities.
- Known application routes return 200 and unknown routes return the styled SPA 404 with HTTP 404.

## Live repair evidence

- Factory deploy command: `WO_DATA_DIR=/data /opt/fleet/lib/deploy-container.sh project-memory-release /work/repo Dockerfile 8080`.
- ACR build run `ch1wh` succeeded for `sociobotregistry.azurecr.io/sf-project-memory-release:36ee2a88017a`.
- Active revision `sf-project-memory-release--0000002` is `Healthy`, `Provisioned`, at 100% traffic with one ready replica and zero restarts.
- App FQDN: `/health` 200 and `/` 200. Custom domain: `/health` 200 and `/` 200.
- Both health responses returned `{"build_sha":"36ee2a88017afc808dbd477b244d43ecce99bff7","status":"ok"}`.
- The factory URL verifier returned 200 in 652 ms with no console errors, the correct title and `lang=en`, one `h1`, a main landmark, no missing image alt text, and no unnamed buttons.
- Live Axe checks found no serious or critical issues on `/` or `/demo`. Live routes `/`, `/demo`, `/workspace`, `/privacy`, and `/terms` returned 200; `/missing` returned 404.
- Live SQLite create/read/delete passed against an isolated verification workspace. The temporary row was deleted and the workspace returned to zero entries.
- The existing mounted database is `/data/project-memory-release.sqlite3`; it migrated in place to 49,152 bytes. The durable share was not deleted or replaced.
- Live rate-limit burst: 40 responses at 200 followed by 20 at 429; limited responses included `Retry-After: 1`.
- Live load smoke: 100 concurrent `/health` requests all returned 200 in 2,834 ms from the worker.
- Live Lighthouse mobile: performance 99, accessibility 100, best practices 100, SEO 100; LCP 1.6 s, CLS 0, total blocking time 0 ms.

## Runtime and data

- Production SQLite path: `/data/project-memory-release.sqlite3` when `/data` exists.
- Local fallback: `./data/project-memory-release.sqlite3` next to the process working directory.
- Optional overrides: `DATA_DIR` and `PORT`; neither is required.
- Demo state has no server persistence. A refresh in the same tab keeps it; **Reset demo** restores the bundled sample.
- The checkout return accepts `?license=<token>`, stores it under `sb_license:project-memory-release`, removes it from the URL, and verifies at most once daily.

## Known limits and next steps

- Git sources are deliberately manual or single-file imports in v1. There is no repository crawler or Git provider OAuth. A later release can add read-only, path-scoped Git access without changing the pack format.
- Team access uses a shared workspace key. Every key holder has edit access; named members and per-role permissions are not included yet.
- The factory must register the production billing product and return URL. No product ID or payment-provider secret is embedded here.
- The container file was reviewed, and both build stages passed independently. The local worker image had no Docker CLI, so `docker build` could not run here; the factory ACR build remains the container-level check.
