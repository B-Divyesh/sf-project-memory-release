# Project Memory Release

Release approved project decisions as small, versioned context packs for coding agents.

Project Memory Release is for product engineers who need agents to use current architecture, decisions, and product language. You select each ADR, glossary term, or product decision. The service compiles the selection into reviewable Markdown with source paths, Git revisions, and vendor-neutral references. Later source edits flag stale citations in released packs.

Live product: <https://project-memory-release.sociobot.in>  
One-click demo: <https://project-memory-release.sociobot.in/demo>

## What is included

- Scoped source entry and single-file Markdown import; no repository indexing.
- Reviewable context packs with stable `project-memory://` references.
- Version history, Markdown copy and download, and stale citation checks.
- An isolated sample workspace that works offline after its first visit.
- A free first release and recovery for existing team licenses.
- Browser-held workspace keys and SQLite persistence under `/data` in production.

## Run locally

Requirements: Node.js 22+, npm, and the current stable Rust toolchain.

```sh
npm install
npm run build
PORT=8080 DATA_DIR=./data cargo run
```

Open <http://localhost:8080>. For frontend-only development, run `npm run dev` in one terminal and `npm run server` in another.

## Test

Playwright 1.58.2 is pinned. The full command builds the frontend, starts the Rust server, and exercises the isolated demo.

```sh
npm test
cargo test
```

Claim tests can run alone, for example:

```sh
npm test -- --grep @claim:stale-citations
```

## Build and deploy

`npm run build` produces the frontend in `dist/`. The container build compiles that frontend and the Rust server into one non-root image.

```sh
docker build --build-arg BUILD_SHA=$(git rev-parse HEAD) -t project-memory-release .
docker run --rm -p 8080:8080 project-memory-release
```

The container needs only `PORT` and defaults to `8080`. It writes SQLite data to `/data` when that mount exists, then falls back to `/app/data`. Startup waits for transient SQLite mount locks without replacing the database. `/health` returns the build SHA. Do not place secrets in the image.

## Privacy and billing

Real workspace data is separated by a random key stored in the browser. Demo records use `sessionStorage` under `demo:project-memory-release:state` and do not enter the real workspace. The product loads no third-party fonts, scripts, or trackers.

New team checkout is temporarily unavailable, so the product does not show a purchase action. Existing licenses can be restored and verified through the Sociobot verification API. No payment provider is embedded here. See `/privacy` and `/terms` in the running product.

## License

MIT. See [LICENSE](./LICENSE).
