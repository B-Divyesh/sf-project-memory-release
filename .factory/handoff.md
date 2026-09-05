# Venture-plan handoff — Project Memory Release

## Result

Added [plan.md](./plan.md), the evidence-backed M1–M3 venture contract. The
current product remains **M1 active, not accepted**. No application code, tests,
deployment, data, infrastructure, billing resource, or secret was changed.

The public deployment identifies as
`c0bd4753543b33af1825cfab78fde5983d6aac7c`; repository head
`46db283273a5782d38de2e7e2591ab7c6efd5d25` contains verification documentation
only. The controlling review is [verification-3.md](./verification-3.md):
**FAIL — four findings and eight untested/incompletely tested public claims.**

## What was verified for this planning pass

- Live `/health` returned the deployed SHA above; the landing response returned
  200 with the product security and cache headers.
- `npm ci`, `npm test` (Playwright last run passed), `npm run test:unit`
  (3/3), `cargo fmt -- --check`, `cargo clippy --locked --all-targets -- -D
  warnings`, and `npm run build` completed successfully.
- The prior independent evidence records 11/11 declared claim commands and
  21/21 Playwright tests, but that is not a release acceptance because the
  required user-facing behavior and claim coverage remain incomplete.

## Next work

The next milestone is **M1 repair and fresh independent verification**:

1. Add byte-identical exact Markdown preview before persistence and a separate
   confirmed release action for demo and real workspaces.
2. Add or remove the eight public claims identified in verification 3, with one
   exact tagged regression per retained claim and a coverage guard.
3. Correct every 390 px touch target to at least 44 × 44 CSS pixels.
4. Emit the required non-secret startup configuration line with only `PORT`.
5. Re-run all claims and quality gates, then obtain a fresh PASS.

M2 (Sociobot Entra CIAM, signed organisation isolation, and a registered
$99/team/month subscription) starts only after M1 passes. M3 adds one scoped,
read-only Git-provider flow only after M2. New checkout, sign-in, real billing,
and Git access are not currently implemented. Their external prerequisites are
listed separately in [plan.md](./plan.md); no production credential is needed
from a product worker.

## How to reproduce current checks

```sh
npm ci
npm test
npm run test:unit
cargo fmt -- --check
cargo clippy --locked --all-targets -- -D warnings
npm run build
```

For the full prior independent QA procedure and live evidence, see
[verification-3.md](./verification-3.md). Do not deploy this documentation
change; this work order has no deployment step.
