import { expect, test, type Download, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.clear(); localStorage.clear(); });
});

async function startRealWorkspace(page: Page): Promise<void> {
  await page.goto("/demo");
  await page.getByRole("link", { name: "Start for real" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByText("No approved sources yet")).toBeVisible();
}

async function addRealSource(page: Page, title = "Use signed upload URLs"): Promise<void> {
  await page.getByRole("button", { name: "Add the first source" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Decision or definition").fill("Uploads use signed URLs that expire after 15 minutes.");
  await page.getByLabel("Source path").fill("docs/adr/0049-upload-urls.md");
  await page.getByLabel("Git revision").fill("49dc123");
  await page.getByRole("button", { name: "Add source", exact: true }).last().click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
}

async function releaseSelected(page: Page, title: string, version: string): Promise<void> {
  await page.getByLabel(`Include ${title}`).check();
  await page.getByLabel("Version").fill(version);
  await page.getByRole("button", { name: "Review selected Markdown" }).click();
  await expect(page.getByRole("heading", { name: "Review exact Markdown" })).toBeVisible();
  await page.getByRole("button", { name: "Release reviewed pack" }).click();
}

async function restoreFixtureLicense(page: Page): Promise<void> {
  await page.route("https://api.sociobot.in/api/v1/products/project-memory-release/verify?license=test-license", route => route.fulfill({ json: { valid: true, reason: "ok", expires_at: "2026-12-01" } }));
  await page.getByLabel("License token").fill("test-license");
  await page.getByRole("button", { name: "Verify license" }).click();
  await expect(page.getByText("Team features are active.")).toBeVisible();
}

async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error("The browser did not provide the downloaded Markdown.");
  let text = "";
  for await (const chunk of stream) text += chunk.toString();
  return text;
}

test("every declared claim has exactly one tagged regression", () => {
  const claims = JSON.parse(readFileSync(".factory/claims.json", "utf8")) as Array<{ id: string; test: string }>;
  const browserSource = readFileSync("tests/claims.spec.ts", "utf8");
  const backendSource = `${readFileSync("src/main.rs", "utf8")}\n${readFileSync("tests/backend.rs", "utf8")}`;
  expect(new Set(claims.map(claim => claim.id)).size).toBe(claims.length);
  for (const claim of claims) {
    if (claim.test.startsWith("npm test")) {
      expect(claim.test).toBe(`npm test -- --grep @claim:${claim.id}`);
      expect(browserSource.split(`test("@claim:${claim.id}`).length - 1, claim.id).toBe(1);
    } else {
      expect(claim.test).toBe(`npm run test:unit -- claim_${claim.id.replaceAll("-", "_")}`);
      expect(backendSource.split(`@claim:${claim.id}`).length - 1, claim.id).toBe(1);
    }
  }
});

test("public claim copy is registered in the claims contract", async ({ page }) => {
  const claims = JSON.parse(readFileSync(".factory/claims.json", "utf8")) as Array<{ id: string }>;
  const visibleClaimIds = new Set<string>();
  for (const path of ["/", "/demo", "/workspace", "/privacy", "/terms"]) {
    await page.goto(path);
    for (const marker of await page.locator("[data-claim]").evaluateAll(elements => elements.map(element => element.getAttribute("data-claim") || ""))) {
      marker.split(/\s+/).filter(Boolean).forEach(id => visibleClaimIds.add(id));
    }
  }
  expect([...visibleClaimIds].sort()).toEqual(claims.map(claim => claim.id).sort());
});

test("@claim:reviewable-pack shows exact Markdown before persistence in demo and a real workspace", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Demo — sample data, nothing is saved")).toBeVisible();
  await page.getByLabel("Include Invite links expire after 72 hours").check();
  await page.getByLabel("Version").fill("2026.09.02");
  await page.getByLabel("Review note").fill("Reviewed for the access update.");
  await page.getByRole("button", { name: "Review selected Markdown" }).click();
  const demoPreview = page.locator(".draft-preview .pack-output");
  const demoBytes = await demoPreview.textContent();
  await expect(demoPreview).toContainText("docs/product/access-decisions.md @ b5e881d");
  await expect(demoPreview).toContainText("project-memory://releases/2026.09.02#decision-invite");
  await expect(page.getByRole("heading", { name: "Context pack 2026.09.02" })).toHaveCount(0);
  await page.getByRole("button", { name: "Release reviewed pack" }).click();
  const card = page.locator(".release-card").first();
  await expect(card).toContainText("Context pack 2026.09.02");
  await card.getByText("Review compiled Markdown").click();
  await expect(card.locator("pre")).toHaveText(demoBytes || "");
  const demoDownloadPromise = page.waitForEvent("download");
  await card.getByRole("button", { name: "Download .md" }).click();
  expect(await readDownload(await demoDownloadPromise)).toBe(demoBytes);

  await startRealWorkspace(page);
  const title = "Use signed upload URLs";
  await addRealSource(page, title);
  await page.getByLabel(`Include ${title}`).check();
  await page.getByLabel("Version").fill("1.0.0");
  await page.getByRole("button", { name: "Review selected Markdown" }).click();
  const realPreview = page.locator(".draft-preview .pack-output");
  const realBytes = await realPreview.textContent();
  await expect(realPreview).toContainText("docs/adr/0049-upload-urls.md @ 49dc123");
  await expect(page.getByRole("heading", { name: "Context pack 1.0.0" })).toHaveCount(0);
  await page.getByRole("button", { name: "Release reviewed pack" }).click();
  const realCard = page.locator(".release-card").first();
  await realCard.getByText("Review compiled Markdown").click();
  await expect(realCard.locator("pre")).toHaveText(realBytes || "");
  const downloadPromise = page.waitForEvent("download");
  await realCard.getByRole("button", { name: "Download .md" }).click();
  expect(await readDownload(await downloadPromise)).toBe(realBytes);
});

test("@claim:stale-citations flags a released source after its revision changes", async ({ page }) => {
  await page.goto("/demo");
  const item = page.locator(".source-item").filter({ hasText: "Keep tenant data" });
  await item.getByRole("button", { name: "Edit source" }).click();
  await page.getByLabel("Git revision").fill("ae77d10");
  await page.getByRole("button", { name: "Save source" }).click();
  await expect(page.locator(".release-card").filter({ hasText: "2026.08.21" })).toContainText("1 stale source");
});

test("@claim:released-pack-immutable keeps released Markdown unchanged after source deletion", async ({ page }) => {
  await page.goto("/demo");
  const card = page.locator(".release-card").first();
  await card.getByText("Review compiled Markdown").click();
  const before = await card.locator(".pack-output").textContent();
  const source = page.locator(".source-item").filter({ hasText: "Keep tenant data" });
  page.once("dialog", dialog => dialog.accept());
  await source.getByRole("button", { name: "Delete source" }).click();
  await expect(source).toHaveCount(0);
  const unchanged = page.locator(".release-card").first();
  await unchanged.getByText("Review compiled Markdown").click();
  await expect(unchanged.locator(".pack-output")).toHaveText(before || "");
});

test("@claim:markdown-download downloads the compiled pack", async ({ page }) => {
  await page.goto("/demo");
  const downloadPromise = page.waitForEvent("download");
  await page.locator(".release-card").first().getByRole("button", { name: "Download .md" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("project-context-2026.08.21.md");
  const text = await readDownload(download);
  expect(text).toContain("project-memory://releases/2026.08.21#adr-042");
});

test("@claim:markdown-import imports one Markdown file into the selected draft", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Add source" }).click();
  await page.locator("#source-file").setInputFiles("tests/fixtures/imported-release-policy.md");
  await expect(page.getByLabel("Title")).toHaveValue("imported release policy");
  await expect(page.getByLabel("Source path")).toHaveValue("imported-release-policy.md");
  await expect(page.getByLabel("Decision or definition")).toHaveValue("Release owners approve any production rollback before it begins.\n");
  await page.getByLabel("Git revision").fill("d4e8910");
  await page.getByRole("button", { name: "Add source", exact: true }).last().click();
  await page.getByLabel("Include imported release policy").check();
  await page.getByLabel("Version").fill("imported-1");
  await page.getByRole("button", { name: "Review selected Markdown" }).click();
  const preview = page.locator(".draft-preview .pack-output");
  await expect(preview).toContainText("Release owners approve any production rollback before it begins.");
  await expect(preview).toContainText("Source: imported-release-policy.md @ d4e8910");
});

test("@claim:markdown-copy copies a released pack to the clipboard", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/demo");
  await page.locator(".release-card").first().getByRole("button", { name: "Copy Markdown" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("project-memory://releases/2026.08.21#adr-042");
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

test("@claim:demo-database-isolation keeps demo mutations out of a real workspace", async ({ browser, page }) => {
  await startRealWorkspace(page);
  await addRealSource(page, "Keep real workspace history");
  const realKey = await page.evaluate(() => localStorage.getItem("pmr_workspace_key"));
  const demoRequests: Array<{ method: string; path: string; workspace: string | undefined }> = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.origin === "http://127.0.0.1:4173" && url.pathname.startsWith("/api/")) {
      demoRequests.push({ method: request.method(), path: url.pathname, workspace: request.headers()["x-workspace-key"] });
    }
  });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Add source" }).click();
  await page.getByLabel("Title").fill("Demo-only release note");
  await page.getByLabel("Decision or definition").fill("This record belongs only to the temporary sample.");
  await page.getByLabel("Source path").fill("docs/demo-only.md");
  await page.getByLabel("Git revision").fill("a61b2c3");
  await page.getByRole("button", { name: "Add source", exact: true }).last().click();
  await expect(page.getByText("Demo-only release note", { exact: true })).toBeVisible();
  expect(demoRequests.some(request => ["POST", "PUT", "DELETE"].includes(request.method) && request.path !== "/api/demo/session")).toBe(false);
  expect(demoRequests.every(request => request.workspace !== realKey)).toBe(true);
  expect(realKey).toMatch(/^[a-f0-9-]{20,128}$/i);
  const readerContext = await browser.newContext();
  try {
    const reader = await readerContext.newPage();
    await reader.goto("http://127.0.0.1:4173/");
    await reader.evaluate(key => localStorage.setItem("pmr_workspace_key", key), realKey!);
    await reader.goto("http://127.0.0.1:4173/workspace");
    await expect(reader.getByText("Keep real workspace history", { exact: true })).toBeVisible();
    await expect(reader.getByText("Demo-only release note", { exact: true })).toHaveCount(0);
  } finally {
    await readerContext.close();
  }
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
  await page.goto("/demo");
  await page.getByRole("link", { name: "Project Memory Release home" }).click();
  await page.getByRole("button", { name: "Restore a license" }).click();
  await page.getByLabel("License token").fill("test-license");
  await page.getByRole("button", { name: "Verify license" }).click();
  await expect(page.getByText("Team features are active.")).toBeVisible();
});

test("@claim:license-storage-boundary keeps a license in browser storage and sends it only to Sociobot", async ({ page }) => {
  const token = "browser-only-license";
  const requests: Array<{ url: string; headers: Record<string, string>; body: string | null }> = [];
  page.on("request", request => requests.push({ url: request.url(), headers: request.headers(), body: request.postData() }));
  await page.route(`https://api.sociobot.in/api/v1/products/project-memory-release/verify?license=${token}`, route => route.fulfill({ json: { valid: true, reason: "ok" } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Restore a license" }).click();
  await page.getByLabel("License token").fill(token);
  await page.getByRole("button", { name: "Verify license" }).click();
  await expect(page.getByText("Team features are active.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sb_license:project-memory-release"))).toBe(token);
  expect(await page.evaluate(() => localStorage.getItem("sb_license_cache:project-memory-release"))).toContain('"valid":true');
  expect(await page.evaluate(() => sessionStorage.getItem("sb_license:project-memory-release"))).toBeNull();
  const tokenRequests = requests.filter(request => `${request.url}\n${JSON.stringify(request.headers)}\n${request.body || ""}`.includes(token));
  expect(tokenRequests).toHaveLength(1);
  expect(tokenRequests[0].url).toBe(`https://api.sociobot.in/api/v1/products/project-memory-release/verify?license=${token}`);
});

test("@claim:no-repository-indexing adds only the source a user enters", async ({ page }) => {
  const requests: Array<{ method: string; url: string }> = [];
  page.on("request", request => requests.push({ method: request.method(), url: request.url() }));

  await startRealWorkspace(page);
  await expect(page.getByLabel(/repository|GitHub|GitLab|access token/i)).toHaveCount(0);
  await addRealSource(page, "Keep upload links short-lived");
  await expect(page.locator(".source-item")).toHaveCount(1);

  const apiRequests = requests
    .map(request => ({ ...request, parsed: new URL(request.url) }))
    .filter(request => request.parsed.pathname.startsWith("/api/"));
  expect(apiRequests.map(request => `${request.method} ${request.parsed.pathname}`)).toEqual([
    "POST /api/demo/session",
    "GET /api/state",
    "POST /api/entries",
    "GET /api/state"
  ]);
  expect(apiRequests.some(request => /(github|gitlab|bitbucket|repository|repos|crawl|index)/i.test(request.parsed.pathname))).toBe(false);
});

test("@claim:free-first-release creates one release without a license", async ({ page }) => {
  const title = "Use signed upload URLs";
  await startRealWorkspace(page);
  await addRealSource(page, title);
  await releaseSelected(page, title, "1.0.0");
  await expect(page.getByRole("heading", { name: "Context pack 1.0.0" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("sb_license:project-memory-release"))).toBeNull();
});

test("@claim:licensed-recurring-releases permits a second release after verification", async ({ page }) => {
  const title = "Use signed upload URLs";
  await startRealWorkspace(page);
  await addRealSource(page, title);
  await releaseSelected(page, title, "1.0.0");
  await expect(page.getByRole("heading", { name: "Context pack 1.0.0" })).toBeVisible();

  await page.getByLabel(`Include ${title}`).check();
  await page.getByLabel("Version").fill("1.1.0");
  await page.getByRole("button", { name: "Review selected Markdown" }).click();
  await expect(page.getByRole("dialog", { name: "Restore a team license" })).toBeVisible();
  await expect(page.locator("#workspace-message")).toContainText("The free plan includes one release.");
  await restoreFixtureLicense(page);
  await page.getByRole("button", { name: "Close" }).click();

  await releaseSelected(page, title, "1.1.0");
  await expect(page.getByRole("heading", { name: "Context pack 1.1.0" })).toBeVisible();
  await expect(page.locator(".release-card")).toHaveCount(2);
});

test("@claim:licensed-shared-workspace opens the same workspace from its shared key", async ({ browser, page }) => {
  const title = "Keep upload links short-lived";
  await startRealWorkspace(page);
  await addRealSource(page, title);

  await page.getByRole("button", { name: "Share team access" }).click();
  await expect(page.getByRole("dialog", { name: "Restore a team license" })).toBeVisible();
  await restoreFixtureLicense(page);
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Share team access" }).click();
  const accessDialog = page.getByRole("dialog", { name: "Share team access" });
  await expect(accessDialog).toBeVisible();
  const sharedKey = await accessDialog.getByLabel("Workspace key").inputValue();
  expect(sharedKey).toMatch(/^[a-f0-9-]{20,128}$/i);

  const teammateContext = await browser.newContext();
  try {
    const teammate = await teammateContext.newPage();
    await teammate.goto("http://127.0.0.1:4173/");
    await teammate.evaluate(key => localStorage.setItem("pmr_workspace_key", key), sharedKey);
    await teammate.goto("http://127.0.0.1:4173/workspace");
    await expect(teammate.getByText(title, { exact: true })).toBeVisible();
  } finally {
    await teammateContext.close();
  }
});

test("@claim:first-party-assets loads fonts, scripts, and styles only from this product", async ({ page }) => {
  const resources: Array<{ type: string; url: string }> = [];
  page.on("request", request => resources.push({ type: request.resourceType(), url: request.url() }));

  for (const path of ["/", "/demo", "/privacy", "/workspace"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
  }

  const executableAssets = resources.filter(request => ["script", "stylesheet", "font"].includes(request.type));
  expect(executableAssets.length).toBeGreaterThan(0);
  expect(executableAssets.every(request => new URL(request.url).origin === "http://127.0.0.1:4173")).toBe(true);
  expect(resources.some(request => /(analytics|doubleclick|googletagmanager|segment|mixpanel|plausible|posthog)/i.test(request.url))).toBe(false);
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});

test("phone controls provide 44 by 44 pixel touch targets", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  const undersized = await page.locator('a[href], button, input, select, textarea, summary').evaluateAll(elements => elements
    .filter(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    })
    .map(element => {
      const rect = element.getBoundingClientRect();
      return { name: (element.textContent || (element as HTMLInputElement).ariaLabel || element.getAttribute("aria-label") || element.tagName).trim(), width: rect.width, height: rect.height };
    })
    .filter(target => target.width < 44 || target.height < 44));
  expect(undersized).toEqual([]);
});

test("all routes have no serious accessibility findings", async ({ page }) => {
  for (const path of ["/", "/demo", "/workspace", "/privacy", "/terms", "/missing"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => ["serious", "critical"].includes(item.impact || ""))).toEqual([]);
  }
});

test("normal routes have no browser errors and reduced motion removes the page-settle movement", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const browserErrors: string[] = [];
  page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
  page.on("pageerror", error => browserErrors.push(error.message));

  for (const path of ["/", "/demo", "/workspace", "/privacy", "/terms"]) {
    await page.goto(`http://127.0.0.1:4173${path}`);
    await expect(page.locator("main")).toBeVisible();
  }
  await page.goto("http://127.0.0.1:4173/demo");
  const duration = await page.locator(".release-card").first().evaluate(element => Number.parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThanOrEqual(0.001);
  expect(browserErrors).toEqual([]);
  await context.close();
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

test("@claim:checkout-unavailable shows no purchase action while existing license recovery remains available", async ({ page }) => {
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
  await page.getByRole("button", { name: "Review selected Markdown" }).click();
  await page.getByRole("button", { name: "Release reviewed pack" }).click();
  await expect(page.getByRole("heading", { name: "Context pack 1.0.0" })).toBeVisible();
});
