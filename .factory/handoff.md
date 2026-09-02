# Project Memory Release handoff

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

## Verification completed on 2 September 2026

- `npm test`: 11/11 Playwright tests passed.
- `cargo test`: 2/2 Rust tests passed.
- Every `.factory/claims.json` command is covered by one tagged browser test.
- Axe: no serious or critical findings on `/` and `/demo`.
- Factory URL verifier: HTTP 200, no console errors, one `h1`, `lang=en`, main landmark, all image alt text present, and all buttons named.
- Responsive smoke: `/`, `/demo`, `/privacy`, `/terms`, and the 404 state passed at 390×844.
- Lighthouse mobile: performance 98, accessibility 100, best practices 100, SEO 100.
- Lighthouse metrics: LCP 2.1 s, CLS 0.044, total blocking time 0 ms.
- Initial assets: JS 9.00 KB gzip, CSS 3.88 KB gzip, loaded Latin fonts 110 KB, mobile hero 42 KB.
- Load smoke: 100 concurrent `/health` requests completed successfully in 237 ms (422 requests/second observed locally).
- API rate-limit test: excess requests return 429 with `Retry-After: 1`.
- `npm audit --omit=dev`: zero vulnerabilities.
- Known application routes return 200 and unknown routes return the styled SPA 404 with HTTP 404.

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
