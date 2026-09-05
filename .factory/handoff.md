# Project Memory Release verification handoff

## Result

Independent verification 3 reviewed implementation `c0bd4753543b33af1825cfab78fde5983d6aac7c` at live revision `sf-project-memory-release--0000006`.

**Verdict: FAIL — 4 findings and 8 untested or incompletely tested public claims.**

The full evidence and required repairs are in [verification-3.md](./verification-3.md).

## What the verifier changed

- Added the independent verification report.
- Updated this handoff with the verification result.
- Copied the report and machine-readable result to `/work/.evidence`.

No product code, test code, deployment, existing user data, infrastructure, DNS, billing resource, or secret was modified. Backend checks created isolated records under random QA workspace keys only.

## What passed

- Every declared claim command: 11/11.
- Full Playwright suite: 21/21.
- Rust tests: 3/3.
- Rust format, Clippy with warnings denied, release build, and frontend build.
- Live SHA identity and byte-for-byte frontend candidate match.
- One-click populated demo, persistent label, reset, real-data isolation, offline reload, route titles, legal pages, and designed 404.
- Keyboard, focus, reduced motion, privacy request boundary, and no horizontal overflow.
- Axe: no serious or critical issues across all routes.
- Lighthouse mobile: 98 performance, 100 accessibility, 100 best practices, 100 SEO.
- Tenant isolation, validation boundaries, request persistence, local SQLite restart persistence, health, and 40-request allowance followed by 429 with `Retry-After: 1`.
- Earlier revision-pattern, dead-checkout, cache-policy, and specifically reported claim gaps were repaired.

## Open findings

1. High: the exact generated Markdown cannot be reviewed before release, despite the brief and live copy.
2. High: eight retained public claims are missing or incompletely tested in the claims contract.
3. Medium: multiple phone controls are smaller than 44 × 44 px.
4. Medium: the required startup configuration line is suppressed when only `PORT` is set.

## Reproduce

```sh
npm ci
npm test
npm run test:unit
cargo fmt -- --check
cargo clippy --locked --all-targets -- -D warnings
CARGO_TARGET_DIR=/tmp/project-memory-release-release BUILD_SHA=c0bd4753543b33af1825cfab78fde5983d6aac7c cargo build --release --locked
npm run build
```

Run each `test` command in `.factory/claims.json` separately from a clean checkout. Live follow-up must also repeat demo isolation, pre-release preview, 390 px touch-target measurement, startup with an empty environment except `PORT`, tenant isolation, restart persistence, and the 50-request rate-limit burst.

## Known product limit

New team checkout is still unavailable. The current UI states that plainly and does not expose the earlier dead purchase link. Existing license restoration remains available. This is not one of the four new defects, but it remains a product limitation until Sociobot checkout registration exists.
