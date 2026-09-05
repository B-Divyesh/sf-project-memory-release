# Verification 3 — release project context packs

## Verdict: FAIL

- Candidate implementation: `c0bd4753543b33af1825cfab78fde5983d6aac7c`
- Live revision: `sf-project-memory-release--0000006`
- Live URL: <https://project-memory-release.sociobot.in>
- Verified: 5 September 2026
- Findings: **4** — 2 high, 2 medium
- Untested or incompletely tested public claims: **8**

The product does not pass independent QA. The implemented flows are stable, and all 11 declared claim commands pass, but a core pre-release review requirement is not implemented. The claim registry is still incomplete. Mobile touch targets and the required default startup log also miss their contracts.

## Cold first read

Before scrolling, a fresh desktop and phone browser showed:

- Job: release trusted context for coding agents.
- Audience: product engineers whose agents need current decisions, architecture, and product language.
- First action: **Try it with sample data**.
- Next result: “A reviewable context pack opens next.”

The words are direct and the action opens `/demo` in one click.

## Findings

### High — the pack cannot be reviewed before release

The researched brief requires generated packs to be reviewable before release. The landing page also says, “Select records and read the exact Markdown before release.”

In a fresh live demo, I selected “Invite links expire after 72 hours” and entered version `qa-preview`. Before using **Release selected**:

- there was no `Context pack qa-preview` preview;
- the release form contained only **Release selected**;
- the only Markdown preview belonged to the already released sample.

The declared `@claim:reviewable-pack` test does not prove pre-release review. It clicks **Release selected** first and opens the compiled Markdown afterward. A real workspace therefore writes the release and consumes the free release before the user can review the exact generated pack.

Required repair: add an exact, reviewable preview before persistence, then make release a separate confirmed action. Cover both demo and real workspace paths.

### High — eight retained public claims lack exact claim coverage

The one-directional contract guard proves that each listed claim has one test. It does not prove that every public claim is listed. Eight retained claims are missing or incompletely tested:

1. Read the exact Markdown before release — false in the live flow and tested only after release.
2. Import one Markdown file — stated on the landing page and in README; no claim entry or import test.
3. Copy Markdown — stated on the landing page, workspace button, and README; only download is claimed and tested.
4. Demo records never enter the project database — `@claim:demo-privacy` checks origins only, so a same-origin real write would still pass.
5. A license stays in the browser and is sent only to Sociobot — stated in the license dialog and privacy page; the storage and request boundary are not asserted.
6. The service stores only a one-way workspace-key hash — stated in the share dialog; no claim entry inspects persisted data.
7. Deleting a source leaves released packs unchanged — stated in the confirmation and result copy; no claim entry tests the released content after deletion.
8. SQLite state persists under `/data` across production restarts — stated in README; restart behavior is not a declared claim test.

Several behaviors are implemented, and independent checks observed demo isolation and local restart persistence. That does not satisfy the required build-time claims contract. Each retained statement needs one `@claim:<id>` test with the exact observable boundary.

### Medium — phone touch targets are smaller than 44 × 44 px

At a 390 × 844 CSS-pixel touch viewport, the page had no horizontal overflow, but multiple interactive targets missed the non-negotiable 44 × 44 px minimum:

- **Reset demo:** 88 × 32 px.
- **Start for real:** 83 × 23.3 px.
- Source selection checkboxes: 22 × 44 px.
- **Edit source** and **Delete source:** 32 px high.
- **Review compiled Markdown:** 24.8 px high.
- **Copy Markdown** and **Download .md:** 40.8 px high.
- Footer links: 24.8 px high.

The same CSS overrides the global 44 px button minimum for `.link-button`, source actions, and release actions. Lighthouse and Axe do not override the explicit product touch-target contract.

### Medium — the required startup configuration line is suppressed

I started the release binary in a fresh directory with an empty environment except `PORT=4200`. The server returned health successfully, created its fallback SQLite file, and shut down cleanly. Its captured startup log was **0 bytes**.

The code calls `info!` for configuration and server startup, but `EnvFilter::from_default_env()` suppresses info output when `RUST_LOG` is absent. The runtime contract requires one startup line saying whether configuration was generated or supplied without requiring another environment variable.

## Declared claim commands

From a detached clean checkout, after the documented `npm ci`, every command in `.factory/claims.json` was run separately.

| Claim | Result |
| --- | --- |
| `reviewable-pack` | PASS as declared; does not prove review before release |
| `stale-citations` | PASS |
| `markdown-download` | PASS |
| `demo-privacy` | PASS as written; isolation assertion is incomplete |
| `offline-demo` | PASS |
| `license-restore` | PASS with recorded verification response |
| `no-repository-indexing` | PASS |
| `free-first-release` | PASS |
| `licensed-recurring-releases` | PASS with recorded verification response |
| `licensed-shared-workspace` | PASS with recorded verification response |
| `first-party-assets` | PASS |

Result: **11/11 declared commands passed; 8 public claims remain missing or incomplete.**

## Clean-checkout and build evidence

- Detached checkout: `c0bd4753543b33af1825cfab78fde5983d6aac7c`, initially clean.
- `npm ci`: 23 packages, 0 vulnerabilities.
- `npm test`: 21/21 Playwright 1.58.2 Chromium tests passed.
- `npm run test:unit`: 3/3 Rust tests passed.
- `cargo fmt -- --check`: passed.
- `cargo clippy --locked --all-targets -- -D warnings`: passed.
- `CARGO_TARGET_DIR=/tmp/pmr-verify3-release BUILD_SHA=c0bd475… cargo build --release --locked`: passed.
- `npm run build`: passed and produced `dist/`; JS 8.94 KB gzip and CSS 3.87 KB gzip.
- The mobile hero is 42,016 bytes; the social image is a real 1200 × 630 WebP.
- Docker CLI was not present in the verifier image. Both build stages were exercised directly, the release binary started with only `PORT`, and the deployed container matched the candidate.

## Live browser and accessibility evidence

- `/opt/fleet/lib/verify-url.sh`: 200, `lang=en`, title present, one `h1`, one `main`, all images have alt text, no unlabeled buttons, and no normal-load console errors.
- Fresh desktop and phone contexts opened the one-click demo with three realistic approved sources and one release.
- The persistent demo label remained after a change. **Reset demo** restored three sources and one release.
- Demo mutation requests used only `POST /api/demo/session`; an isolated real workspace was unchanged.
- `/`, `/demo`, `/workspace`, `/privacy`, and `/terms` returned 200 with route-specific titles, canonical URLs, one visible `h1`, and one `main`.
- `/missing-verification-3` deliberately returned 404 with the designed return-home page. Its expected Chromium 404 resource message is not a defect.
- Axe found 0 serious or critical issues on every route above, including the designed 404.
- Keyboard checks passed for the visible skip link, main-content sequence, dialog trap, Escape close, return focus, and a 3 px focus ring.
- Back and forward navigation restored route URL, title, and heading focus.
- Reduced motion changed the release animation to `0.00001s`.
- After the first visit, `/demo` reloaded offline with the sample and demo label present.
- The full landing/demo/legal/workspace request log contained only the product origin. The external Param Factory footer link was inspected but not fetched because it is outside this work order's product scope.
- Lighthouse 12.8.2 mobile: performance 98, accessibility 100, best practices 100, SEO 100; LCP 1.98 s, CLS 0.0018, TBT 0 ms.

## Backend evidence

- `/health`: `200 {"build_sha":"c0bd4753543b33af1825cfab78fde5983d6aac7c","status":"ok"}`.
- The live compiled JS byte-for-byte matched a clean build with that SHA embedded.
- No workspace key returned 401 with recovery text.
- Malformed revision returned 400; a 121-character title returned 400; maximum valid title/body/path/revision lengths returned 200.
- A random workspace A could read its two QA entries; random workspace B read zero entries and zero releases.
- A new release contained its source path, revision, and `project-memory://` reference and remained present on a later request.
- A local release-binary restart against the same temporary SQLite directory retained the created entry.
- A 50-request live burst from one `X-Forwarded-For` address returned 40 × 200 and 10 × 429. Every 429 had `Retry-After: 1`; 50 health requests remained 200.
- HTML and `sw.js` revalidate; live hashed JS/CSS return `public, max-age=31536000, immutable`; API and health return `no-store`.

Only isolated random QA workspace keys were used. No existing workspace was read or changed. No other product, shared service, staging slot, Key Vault, infrastructure, DNS, billing resource, or non-product data was accessed.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| Chromium rejected the Git revision pattern and demo accepted malformed revisions | Resolved. Live native validation rejects it without a console error; API returns 400. |
| Team purchase link returned 404 | Resolved honestly. The dead buy link is gone, checkout is stated unavailable, and existing-license recovery remains. |
| Static assets lacked an HTTP cache policy | Resolved. Live hashed assets are immutable; HTML and worker revalidate. |
| Free release, repeat releases, shared workspace, non-indexing, and first-party assets lacked claims | Those exact omissions are resolved and their declared commands pass. Broader claim coverage remains open in the finding above. |

## Required next steps

1. Add pre-release Markdown review as a separate step before persistence.
2. Add exact claim entries and tagged tests for all eight retained claims, or remove/narrow the statements.
3. Make every phone target at least 44 × 44 CSS px without introducing overflow.
4. Configure tracing to emit the required startup configuration line when `RUST_LOG` is unset.
5. Re-run every declared claim command and request fresh independent verification.

## Final verdict

**FAIL — 4 findings and 8 untested or incompletely tested public claims.**
