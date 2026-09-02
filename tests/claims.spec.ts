import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.clear(); localStorage.clear(); });
});

test("@claim:reviewable-pack compiles selected records with provenance", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Demo — sample data, nothing is saved")).toBeVisible();
  await page.getByLabel("Include Invite links expire after 72 hours").check();
  await page.getByLabel("Version").fill("2026.09.02");
  await page.getByLabel("Review note").fill("Reviewed for the access update.");
  await page.getByRole("button", { name: "Release selected" }).click();
  const card = page.locator(".release-card").first();
  await expect(card).toContainText("Context pack 2026.09.02");
  await card.getByText("Review compiled Markdown").click();
  await expect(card.locator("pre")).toContainText("docs/product/access-decisions.md @ b5e881d");
  await expect(card.locator("pre")).toContainText("project-memory://releases/2026.09.02#decision-invite");
});

test("@claim:stale-citations flags a released source after its revision changes", async ({ page }) => {
  await page.goto("/demo");
  const item = page.locator(".source-item").filter({ hasText: "Keep tenant data" });
  await item.getByRole("button", { name: "Edit source" }).click();
  await page.getByLabel("Git revision").fill("ae77d10");
  await page.getByRole("button", { name: "Save source" }).click();
  await expect(page.locator(".release-card").filter({ hasText: "2026.08.21" })).toContainText("1 stale source");
});

test("@claim:markdown-download downloads the compiled pack", async ({ page }) => {
  await page.goto("/demo");
  const downloadPromise = page.waitForEvent("download");
  await page.locator(".release-card").first().getByRole("button", { name: "Download .md" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("project-context-2026.08.21.md");
  const stream = await download.createReadStream();
  let text = ""; for await (const chunk of stream) text += chunk.toString();
  expect(text).toContain("project-memory://releases/2026.08.21#adr-042");
});

test("@claim:demo-privacy keeps the demo on the product origin", async ({ page }) => {
  const origins = new Set<string>();
  page.on("request", request => origins.add(new URL(request.url()).origin));
  await page.goto("/demo");
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByLabel("Title").fill("Keep audit events for 30 days");
  await page.getByLabel("Decision or definition").fill("Audit events remain available for 30 days.");
  await page.getByLabel("Source path").fill("docs/product/audit.md");
  await page.getByLabel("Git revision").fill("d9e3a77");
  await page.getByRole("button", { name: "Add source", exact: true }).last().click();
  await expect(page.getByText("Keep audit events for 30 days")).toBeVisible();
  expect([...origins]).toEqual(["http://127.0.0.1:4173"]);
});

test("@claim:offline-demo reloads the sample after the first visit", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/demo");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Release a context pack" })).toBeVisible();
  await expect(page.getByText("Keep tenant data in regional SQLite files", { exact: true })).toBeVisible();
  await context.close();
});

test("@claim:license-restore verifies a pasted team license", async ({ page }) => {
  await page.route("https://api.sociobot.in/api/v1/products/project-memory-release/verify?license=test-license", route => route.fulfill({ json: { valid: true, reason: "ok", expires_at: "2026-12-01" } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Restore a license" }).click();
  await page.getByLabel("License token").fill("test-license");
  await page.getByRole("button", { name: "Verify license" }).click();
  await expect(page.getByText("Team features are active.")).toBeVisible();
});

test("backend rate limit returns 429 with Retry-After", async ({ request }) => {
  const responses = await Promise.all(Array.from({ length: 50 }, () => request.get("/api/state", { headers: { "X-Forwarded-For": "203.0.113.80" } })));
  const limited = responses.find(response => response.status() === 429);
  expect(limited).toBeTruthy();
  expect(limited!.headers()["retry-after"]).toBe("1");
});

test("pages have one heading and support a 390px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/demo", "/privacy", "/terms", "/missing"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(path === "/missing" ? 404 : 200);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
  }
});

test("landing and demo have no serious accessibility findings", async ({ page }) => {
  for (const path of ["/", "/demo"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => ["serious", "critical"].includes(item.impact || ""))).toEqual([]);
  }
});

test("keyboard navigation traps dialog focus and returns it to the opener", async ({ page }) => {
  await page.goto("/demo");
  const opener = page.getByRole("button", { name: "Add source" });
  await opener.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Add an approved source" })).toBeVisible();
  await expect(page.getByLabel("Type")).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Add source", exact: true }).last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Type")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("Git revision provenance rejects malformed input in demo and real workspaces without a browser error", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", error => browserErrors.push(error.message));

  for (const path of ["/demo", "/workspace"]) {
    await page.goto(path);
    await page.locator(".ledger").getByRole("button", { name: /Add (the first )?source/ }).first().click();
    await page.getByLabel("Title").fill("Keep audit events for 30 days");
    await page.getByLabel("Decision or definition").fill("Audit events remain available for 30 days.");
    await page.getByLabel("Source path").fill("docs/product/audit.md");
    const revision = page.getByLabel("Git revision");
    await expect(revision).toHaveAttribute("pattern", "[A-Za-z0-9._\\x2F\\x2D]+");
    await revision.fill("bad revision!");
    expect(await revision.evaluate(input => input.checkValidity())).toBe(false);
    await page.getByRole("button", { name: "Add source", exact: true }).last().click();
    await expect(page.getByRole("dialog", { name: "Add an approved source" })).toBeVisible();
    await expect(page.locator(".source-item").filter({ hasText: "Keep audit events for 30 days" })).toHaveCount(0);
  }

  expect(browserErrors).toEqual([]);
});

test("static responses have immutable asset and revalidation policies", async ({ page, request }) => {
  const landing = await page.goto("/");
  expect(landing?.headers()["cache-control"]).toBe("no-cache, max-age=0, must-revalidate");
  const stylesheet = await page.locator('link[rel="stylesheet"]').getAttribute("href");
  expect(stylesheet).toMatch(/^\/assets\/index-.+\.css$/);
  const asset = await request.get(stylesheet!);
  expect(asset.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
  const worker = await request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toBe("no-cache, max-age=0, must-revalidate");
  const state = await request.get("/api/state", { headers: { "X-Workspace-Key": "cache-policy-test-key-123" } });
  expect(state.headers()["cache-control"]).toBe("no-store");
});

test("checkout is truthfully unavailable while existing license recovery remains available", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Team checkout is not available yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Restore a license" }).click();
  await expect(page.getByRole("dialog", { name: "Restore a team license" })).toBeVisible();
});

test("real workspace creates a source and its first release", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.getByText("No approved sources yet")).toBeVisible();
  await page.getByRole("button", { name: "Add the first source" }).click();
  await page.getByLabel("Title").fill("Use signed upload URLs");
  await page.getByLabel("Decision or definition").fill("Uploads use signed URLs that expire after 15 minutes.");
  await page.getByLabel("Source path").fill("docs/adr/0049-upload-urls.md");
  await page.getByLabel("Git revision").fill("49dc123");
  await page.getByRole("button", { name: "Add source", exact: true }).last().click();
  await page.getByLabel("Include Use signed upload URLs").check();
  await page.getByLabel("Version").fill("1.0.0");
  await page.getByRole("button", { name: "Release selected" }).click();
  await expect(page.getByRole("heading", { name: "Context pack 1.0.0" })).toBeVisible();
});
