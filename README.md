# Project Memory Release

Release approved project decisions as small, versioned context packs for coding agents.

Project Memory Release is for product engineers who need agents to use current architecture, decisions, and product language. You select each ADR, glossary term, or product decision. The service compiles the selection into exact Markdown for review before release, with source paths, Git revisions, and vendor-neutral references. Later source edits flag stale citations in released packs.

Live product: <https://project-memory-release.sociobot.in>  
One-click demo: <https://project-memory-release.sociobot.in/demo>

## What is included

- Scoped source entry and one-file Markdown import; no repository indexing.
- Exact Markdown review before release with stable `project-memory://` references.
- Released packs copy or download as Markdown and stay unchanged if a source is deleted.
- An isolated sample workspace whose records do not enter the real project database. It works offline after its first visit.
- One free release. A verified team license allows more releases and workspace-key sharing.
- Browser-held workspace keys. The service persists only their one-way hashes. Real records survive a restart that uses the same data directory.

## Run locally

Requirements: Node.js 22+, npm, and the current stable Rust toolchain.

```sh
npm ci
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

Set `PORT` to choose the listening port. Set `DATA_DIR` locally to choose where SQLite files are kept. In production, mount the product data volume at `/data`. `/health` returns the build SHA. Do not place secrets in the image.

## Privacy and billing

Real workspace data is separated by a random key stored in the browser; the service stores its one-way hash. Demo records use `sessionStorage` under `demo:project-memory-release:state` and do not enter the real workspace. A team license stays in the browser and is sent only to Sociobot for verification. The product loads no third-party fonts, scripts, or trackers.

New team checkout is temporarily unavailable, so the product does not show a purchase action. Existing licenses can be restored through the Sociobot verification API. A verified license allows more releases and lets its holder share a workspace key. No payment provider is embedded here. See `/privacy` and `/terms` in the running product.

## License

MIT. See [LICENSE](./LICENSE).
