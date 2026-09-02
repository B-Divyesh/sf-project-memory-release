import "./styles.css";

type EntryKind = "ADR" | "Glossary" | "Product decision";
type Entry = {
  id: string;
  kind: EntryKind;
  title: string;
  body: string;
  sourcePath: string;
  sourceRevision: string;
  updatedAt: string;
};
type Release = {
  id: string;
  version: string;
  notes: string;
  content: string;
  createdAt: string;
  staleCount: number;
};
type ProjectState = { entries: Entry[]; releases: Release[] };

const PRODUCT = "Project Memory Release";
const DEMO_KEY = "demo:project-memory-release:state";
const LICENSE_KEY = "sb_license:project-memory-release";
const LICENSE_CACHE_KEY = "sb_license_cache:project-memory-release";
const WORKSPACE_KEY = "pmr_workspace_key";
const app = document.querySelector<HTMLDivElement>("#app")!;
let currentState: ProjectState | null = null;
let selected = new Set<string>();
let liveMessage = "";

const sampleState = (): ProjectState => ({
  entries: [
    {
      id: "adr-042",
      kind: "ADR",
      title: "Keep tenant data in regional SQLite files",
      body: "Each tenant has one encrypted SQLite file in its chosen region. Do not add a shared database dependency.",
      sourcePath: "docs/adr/0042-regional-storage.md",
      sourceRevision: "9f42c1a",
      updatedAt: "2026-08-18T10:00:00Z"
    },
    {
      id: "term-release",
      kind: "Glossary",
      title: "Release train",
      body: "The weekly window when approved customer-facing changes move to production.",
      sourcePath: "docs/product/glossary.md",
      sourceRevision: "c207bf4",
      updatedAt: "2026-08-19T14:20:00Z"
    },
    {
      id: "decision-invite",
      kind: "Product decision",
      title: "Invite links expire after 72 hours",
      body: "Team invite links expire after 72 hours. Support can revoke an unused link sooner.",
      sourcePath: "docs/product/access-decisions.md",
      sourceRevision: "b5e881d",
      updatedAt: "2026-08-20T09:45:00Z"
    }
  ],
  releases: [
    {
      id: "release-2026-08-21",
      version: "2026.08.21",
      notes: "Approved for the account migration work.",
      content: `---\ncontext-pack: 2026.08.21\nreleased: 2026-08-21\n---\n\n# Project context\n\n## ADR — Keep tenant data in regional SQLite files\nEach tenant has one encrypted SQLite file in its chosen region. Do not add a shared database dependency.\n\nSource: docs/adr/0042-regional-storage.md @ 9f42c1a\nReference: project-memory://releases/2026.08.21#adr-042\n\n## Glossary — Release train\nThe weekly window when approved customer-facing changes move to production.\n\nSource: docs/product/glossary.md @ c207bf4\nReference: project-memory://releases/2026.08.21#term-release`,
      createdAt: "2026-08-21T15:30:00Z",
      staleCount: 0
    }
  ]
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
}

function route(): string {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function isDemo(): boolean { return route() === "/demo"; }

function workspaceKey(): string {
  let key = localStorage.getItem(WORKSPACE_KEY);
  if (!key) { key = crypto.randomUUID(); localStorage.setItem(WORKSPACE_KEY, key); }
  return key;
}

function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Workspace-Key", workspaceKey());
  return fetch(path, { ...init, headers });
}

function navigate(path: string): void {
  history.pushState({}, "", path);
  window.scrollTo({ top: 0, behavior: "smooth" });
  void render().then(() => document.querySelector<HTMLElement>("h1")?.focus());
}

function header(): string {
  const here = route();
  return `${isDemo() ? `<div class="demo-banner"><div class="wrap"><strong>Demo — sample data, nothing is saved</strong><button class="link-button" data-action="reset-demo">Reset demo</button><a href="/workspace" data-nav data-action="leave-demo">Start for real</a></div></div>` : ""}
  <header class="site-header">
    <div class="wrap nav-row">
      <a class="wordmark" href="/" data-nav aria-label="Project Memory Release home">Project Memory <span class="wordmark-mark">Release</span></a>
      <nav aria-label="Main navigation"><ul>
        <li><a href="/demo" data-nav ${here === "/demo" ? 'aria-current="page"' : ""}>Demo</a></li>
        <li><a href="/workspace" data-nav ${here === "/workspace" ? 'aria-current="page"' : ""}>Workspace</a></li>
        <li class="privacy-nav"><a href="/privacy" data-nav ${here === "/privacy" ? 'aria-current="page"' : ""}>Privacy</a></li>
      </ul></nav>
    </div>
  </header>`;
}

function footer(): string {
  return `<footer class="site-footer"><div class="wrap footer-row">
    <div><strong>Project Memory Release</strong><p class="footer-small">Release approved project knowledge as versioned context packs. Generated illustration made for this product.</p></div>
    <div><div class="footer-links"><a href="/privacy" data-nav>Privacy</a><a href="/terms" data-nav>Terms</a><a href="https://hello-factory.sociobot.in" rel="external">Built by Param Factory</a></div><p class="footer-small">Version ${escapeHtml(import.meta.env.VITE_BUILD_SHA || "1.0.0")}</p></div>
  </div></footer>`;
}

const layout = (content: string) => `${header()}<main id="main">${content}</main>${footer()}<div class="visually-hidden" aria-live="polite" id="route-announcer">${escapeHtml(liveMessage)}</div>`;

function landing(): string {
  return layout(`
    <section class="hero"><div class="wrap hero-grid">
      <div>
        <p class="eyebrow">Project Memory Release</p>
        <h1 tabindex="-1">Release trusted context for coding agents</h1>
        <p class="lead">For product engineers whose agents need current decisions, architecture, and product language.</p>
        <div class="actions"><a class="button" href="/demo" data-nav>Try it with sample data</a><span class="after-action">A reviewable context pack opens next.</span></div>
        <ul class="facts"><li>Repositories are never indexed automatically.</li><li>Each release keeps its source revision.</li><li>One release is free.</li></ul>
      </div>
      <figure class="hero-art">
        <picture><source media="(max-width: 700px)" srcset="/assets/notebook-hero-960.webp"><img src="/assets/notebook-hero-1536.webp" width="1536" height="1024" fetchpriority="high" alt="An engineering notebook with source cards, revision marks, and dependency diagrams"></picture>
      </figure>
    </div></section>
    <section class="section rule-paper" aria-labelledby="preview-title"><div class="wrap">
      <div class="section-head"><p class="hand-note">The product itself</p><h2 id="preview-title">See what an agent receives</h2><p>Approved source records compile into a small Markdown file. Every item names its file and Git revision.</p></div>
      <div class="preview">
        <div class="preview-ledger"><h3>Selected sources</h3><ul><li><span class="type-label">ADR</span><strong> Regional SQLite storage</strong><br><span class="status current">Current</span></li><li><span class="type-label">Glossary</span><strong> Release train</strong><br><span class="status current">Current</span></li></ul></div>
        <div class="preview-sheet"><h3>Context pack 2026.08.21</h3><pre># Project context\n\n## ADR — Regional SQLite storage\nKeep each tenant in its chosen region.\n\nSource: docs/adr/0042.md @ 9f42c1a\nReference: project-memory://releases/2026.08.21#adr-042</pre></div>
      </div>
    </div></section>
    <section class="section" aria-labelledby="how-title"><div class="wrap">
      <div class="section-head"><h2 id="how-title">How it works</h2></div>
      <div class="steps"><div class="step"><h3>Add approved sources</h3><p>Paste a record or import one Markdown file. You choose every source.</p></div><div class="step"><h3>Review the pack</h3><p>Select records and read the exact Markdown before release.</p></div><div class="step"><h3>Release a version</h3><p>Copy or download the pack. Later source revisions show as stale.</p></div></div>
    </div></section>
    <section class="section rule-paper" aria-labelledby="limits-title"><div class="wrap plain-grid">
      <div><h2 id="limits-title">What it does not do</h2><ul><li>It does not crawl or index a repository.</li><li>It does not write decisions for your team.</li><li>It does not provide a chat interface.</li></ul></div>
      <div><h2>How project data is handled</h2><p>You add each approved record. The service stores those records and releases in its own SQLite database. Demo changes stay in an isolated browser session.</p><a href="/privacy" data-nav>Read the privacy policy</a></div>
    </div></section>
    <section class="section" aria-labelledby="pricing-title"><div class="wrap">
      <div class="price-sheet"><p class="hand-note">Team licenses</p><h2 id="pricing-title">Restore an existing team license</h2><p>Team checkout is not available yet. A verified team license allows more releases. It also lets the license holder share a workspace key with teammates.</p><div class="actions"><button class="primary" data-action="open-license">Restore a license</button></div><p class="field-help">Paste the license from your Sociobot receipt. No purchase action is shown until checkout registration is available.</p></div>
    </div></section>`);
}

function legalPage(kind: "privacy" | "terms"): string {
  const privacy = `<h1 tabindex="-1">Privacy</h1><p>Last updated: 2 September 2026</p><h2>What we store</h2><p>The service stores the source records and releases you add. It also stores source paths and Git revision labels.</p><p>A team license is stored in your browser. Sociobot receives that license when the browser verifies it.</p><h2>What we do not collect</h2><p>We do not index repositories automatically. We do not use analytics or advertising trackers. The demo uses session storage and does not send its records to the project database.</p><h2>Storage and deletion</h2><p>Project records live in the service SQLite database. Delete individual sources from the workspace. Contact <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a> for full workspace deletion.</p><h2>Service providers</h2><p>Sociobot handles billing and license checks. The hosting provider processes network and storage data needed to run the service.</p>`;
  const terms = `<h1 tabindex="-1">Terms</h1><p>Last updated: 2 September 2026</p><h2>Free and existing team licenses</h2><p>The free plan includes one release. Checkout for new team licenses is not available yet. A verified team license allows more releases. It also lets the license holder share a workspace key with teammates.</p><h2>Using the service</h2><p>You must have permission to add each source record. You remain responsible for reviewing packs before using them with an agent.</p><h2>Billing and refunds</h2><p>Sociobot is the merchant of record for existing licenses. Billing support and approved refunds are handled by Sociobot. A refund or cancellation may end a license.</p><h2>Availability</h2><p>The service is provided as available. Keep copies of released packs in your repository. We may suspend misuse that harms the service or other users.</p><h2>Contact</h2><p>Email <a href="mailto:support@sociobot.in">support@sociobot.in</a> with billing or service questions.</p>`;
  return layout(`<div class="wrap legal"><article>${kind === "privacy" ? privacy : terms}</article></div>`);
}

function getDemoState(): ProjectState {
  const saved = sessionStorage.getItem(DEMO_KEY);
  if (saved) try {
    const state = JSON.parse(saved) as ProjectState;
    state.releases.forEach(release => {
      release.staleCount = state.entries.filter(entry => release.content.includes(`#${entry.id}`) && !release.content.includes(`@ ${entry.sourceRevision}\nReference: project-memory://releases/${release.version}#${entry.id}`)).length;
    });
    return state;
  } catch { sessionStorage.removeItem(DEMO_KEY); }
  const sample = sampleState();
  sessionStorage.setItem(DEMO_KEY, JSON.stringify(sample));
  return sample;
}

function saveDemoState(state: ProjectState): void {
  sessionStorage.setItem(DEMO_KEY, JSON.stringify(state));
  currentState = state;
}

async function fetchState(): Promise<ProjectState> {
  if (isDemo()) {
    const saved = sessionStorage.getItem(DEMO_KEY);
    if (saved) return getDemoState();
    try {
      const response = await fetch("/api/demo/session", { method: "POST" });
      if (response.ok) { const seeded = await response.json() as ProjectState; saveDemoState(seeded); return seeded; }
    } catch { /* The bundled sample below keeps the demo available offline. */ }
    return getDemoState();
  }
  const response = await apiFetch("/api/state");
  if (!response.ok) throw new Error("The workspace could not load. Reload the page to try again.");
  return response.json() as Promise<ProjectState>;
}

function workspace(state: ProjectState): string {
  const demo = isDemo();
  const sources = state.entries.length ? state.entries.map(entry => `<li class="source-item">
    <input type="checkbox" aria-label="Include ${escapeHtml(entry.title)}" data-select="${escapeHtml(entry.id)}" ${selected.has(entry.id) ? "checked" : ""}>
    <div><span class="type-label">${escapeHtml(entry.kind)}</span><strong>${escapeHtml(entry.title)}</strong><p class="source-body">${escapeHtml(entry.body)}</p><div class="source-meta">${escapeHtml(entry.sourcePath)} @ ${escapeHtml(entry.sourceRevision)}</div><div class="source-actions"><button data-action="edit-source" data-id="${escapeHtml(entry.id)}">Edit source</button><button class="delete" data-action="delete-source" data-id="${escapeHtml(entry.id)}">Delete source</button></div></div>
  </li>`).join("") : `<li class="empty"><h3>No approved sources yet</h3><p>Add an ADR, glossary term, or product decision. It will appear here for review.</p><button class="primary" data-action="add-source">Add the first source</button></li>`;
  const releases = state.releases.length ? state.releases.map(release => `<article class="release-card" data-release-id="${escapeHtml(release.id)}">
    <header><div><h3>Context pack ${escapeHtml(release.version)}</h3><div>${escapeHtml(new Date(release.createdAt).toLocaleString())}</div></div><span class="status ${release.staleCount ? "stale" : "current"}">${release.staleCount ? `${release.staleCount} stale ${release.staleCount === 1 ? "source" : "sources"}` : "All sources current"}</span></header>
    ${release.notes ? `<p>${escapeHtml(release.notes)}</p>` : ""}<details><summary>Review compiled Markdown</summary><pre class="pack-output">${escapeHtml(release.content)}</pre></details>
    <div class="release-actions"><button data-action="copy-release" data-id="${escapeHtml(release.id)}">Copy Markdown</button><button data-action="download-release" data-id="${escapeHtml(release.id)}">Download .md</button></div>
  </article>`).join("") : `<div class="empty"><h3>No context packs released</h3><p>Select at least one approved source. Then name and release the first version.</p></div>`;
  return layout(`<section class="workspace-head"><div class="wrap"><p class="eyebrow">${demo ? "Sample workspace" : "Your workspace"}</p><h1 tabindex="-1">Release a context pack</h1><div class="workspace-summary"><span>${state.entries.length} approved sources</span><span>${state.releases.length} released versions</span><span>${state.releases.reduce((n, r) => n + r.staleCount, 0)} stale citations</span>${demo ? "" : '<button class="link-button" data-action="open-access">Share team access</button>'}</div><div id="network-state" aria-live="polite"></div></div></section>
    <div class="wrap workspace">
      <section class="ledger" aria-labelledby="sources-heading"><div class="panel-heading"><h2 id="sources-heading">Approved sources</h2><button class="primary" data-action="add-source">Add source</button></div><ul class="source-list">${sources}</ul></section>
      <section class="release-board" aria-labelledby="releases-heading"><div class="panel-heading"><h2 id="releases-heading">Released packs</h2></div>
        <form class="release-form" id="release-form"><label>Version<input name="version" required maxlength="40" placeholder="2026.09.1"></label><label>Review note<input name="notes" maxlength="180" placeholder="Approved for checkout work"></label><button class="primary" type="submit">Release selected</button></form>
        <div id="workspace-message" aria-live="polite">${liveMessage ? `<div class="notice">${escapeHtml(liveMessage)}</div>` : ""}</div><div class="release-list">${releases}</div>
      </section>
    </div>`);
}

function notFound(): string {
  return layout(`<div class="wrap not-found"><div><p class="eyebrow">404</p><h1 tabindex="-1">This page is not in the notebook</h1><p>The link may be old or incomplete.</p><a class="button" href="/" data-nav>Return home</a></div></div>`);
}

function showSourceDialog(entry?: Entry): void {
  const opener = document.activeElement as HTMLElement | null;
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  backdrop.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="source-dialog-title"><h2 id="source-dialog-title">${entry ? "Edit approved source" : "Add an approved source"}</h2><form id="source-form" class="form-grid">
    <label>Type<select name="kind"><option>ADR</option><option>Glossary</option><option>Product decision</option></select></label>
    <label>Title<input name="title" required maxlength="120" value="${escapeHtml(entry?.title || "")}"></label>
    <label>Decision or definition<textarea name="body" required maxlength="4000">${escapeHtml(entry?.body || "")}</textarea></label>
    <label>Source path<input name="sourcePath" required maxlength="260" value="${escapeHtml(entry?.sourcePath || "")}" placeholder="docs/adr/0042.md"></label>
    <label>Git revision<input name="sourceRevision" required maxlength="64" pattern="[A-Za-z0-9._\\x2F\\x2D]+" value="${escapeHtml(entry?.sourceRevision || "")}" placeholder="9f42c1a"><span class="field-help">Use the commit or tag that approved this text.</span></label>
    ${entry ? "" : `<label>Import one Markdown file<input type="file" id="source-file" accept=".md,text/markdown,text/plain"><span class="field-help">The file stays in this form until you save.</span></label>`}
    <div id="dialog-error" aria-live="assertive"></div><div class="dialog-actions"><button type="button" class="secondary" data-action="close-dialog">Cancel</button><button type="submit" class="primary">${entry ? "Save source" : "Add source"}</button></div>
  </form></section>`;
  document.body.append(backdrop);
  const form = backdrop.querySelector<HTMLFormElement>("#source-form")!;
  (form.elements.namedItem("kind") as HTMLSelectElement).value = entry?.kind || "ADR";
  backdrop.querySelector<HTMLElement>("input, select")?.focus();
  const close = () => { backdrop.remove(); opener?.focus(); };
  backdrop.addEventListener("click", e => { if (e.target === backdrop || (e.target as HTMLElement).dataset.action === "close-dialog") close(); });
  backdrop.addEventListener("keydown", e => { if (e.key === "Escape") close(); trapDialogFocus(e, backdrop); });
  backdrop.querySelector<HTMLInputElement>("#source-file")?.addEventListener("change", async e => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    (form.elements.namedItem("title") as HTMLInputElement).value ||= file.name.replace(/\.md$/i, "").replace(/[-_]/g, " ");
    (form.elements.namedItem("sourcePath") as HTMLInputElement).value = file.name;
    (form.elements.namedItem("body") as HTMLTextAreaElement).value = await file.text();
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const payload = { kind: data.kind, title: data.title.trim(), body: data.body.trim(), sourcePath: data.sourcePath.trim(), sourceRevision: data.sourceRevision.trim() };
    try {
      if (isDemo()) {
        const state = getDemoState();
        if (entry) Object.assign(state.entries.find(item => item.id === entry.id)!, payload, { updatedAt: new Date().toISOString() });
        else state.entries.unshift({ ...payload, kind: payload.kind as EntryKind, id: crypto.randomUUID(), updatedAt: new Date().toISOString() });
        saveDemoState(state);
      } else {
        const response = await apiFetch(entry ? `/api/entries/${encodeURIComponent(entry.id)}` : "/api/entries", { method: entry ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(await errorMessage(response));
      }
      liveMessage = entry ? "Source saved." : "Source added."; close(); await render();
    } catch (error) { backdrop.querySelector("#dialog-error")!.innerHTML = `<div class="error">${escapeHtml(error instanceof Error ? error.message : "The source could not be saved. Try again.")}</div>`; }
  });
}

function hasActiveLicense(): boolean {
  try { const cache = JSON.parse(localStorage.getItem(LICENSE_CACHE_KEY) || "null") as { valid?: boolean } | null; return !!localStorage.getItem(LICENSE_KEY) && cache?.valid === true; } catch { return false; }
}

function showLicenseDialog(): void {
  const opener = document.activeElement as HTMLElement | null;
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  backdrop.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="license-title"><h2 id="license-title">Restore a team license</h2><p>Paste the license from your Sociobot receipt. It stays in this browser and is sent only to Sociobot for verification.</p><form id="license-form"><div class="license-row"><label>License token<input name="license" required autocomplete="off"></label><button class="primary" type="submit">Verify license</button></div><div id="license-message" aria-live="polite"></div><div class="dialog-actions"><button class="secondary" type="button" data-action="close-dialog">Close</button></div></form></section>`;
  document.body.append(backdrop); backdrop.querySelector<HTMLInputElement>("input")!.focus();
  const close = () => { backdrop.remove(); opener?.focus(); };
  backdrop.addEventListener("click", e => { if (e.target === backdrop || (e.target as HTMLElement).dataset.action === "close-dialog") close(); });
  backdrop.addEventListener("keydown", e => { if (e.key === "Escape") close(); trapDialogFocus(e, backdrop); });
  backdrop.querySelector("form")!.addEventListener("submit", async e => {
    e.preventDefault(); const token = new FormData(e.currentTarget as HTMLFormElement).get("license")?.toString().trim() || "";
    const message = backdrop.querySelector<HTMLElement>("#license-message")!; message.innerHTML = "<p>Checking the license…</p>";
    try { const valid = await verifyLicense(token, true); message.innerHTML = valid ? '<div class="notice">Team features are active.</div>' : '<div class="error">This license is not active. Check the token or contact support.</div>'; } catch { message.innerHTML = '<div class="error">The license service could not be reached. Try again when you are online.</div>'; }
  });
}

function showAccessDialog(): void {
  if (!hasActiveLicense()) { liveMessage = "Team access needs an active team license."; showLicenseDialog(); return; }
  const opener = document.activeElement as HTMLElement | null;
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  backdrop.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="access-title"><h2 id="access-title">Share team access</h2><p>Send this key only to teammates who may read and change this workspace. The service stores only a one-way hash.</p><form id="access-form"><label>Workspace key<input name="workspaceKey" required value="${escapeHtml(workspaceKey())}" autocomplete="off"></label><div id="access-message" aria-live="polite"></div><div class="dialog-actions"><button type="button" class="secondary" data-action="copy-access">Copy key</button><button type="submit" class="primary">Open workspace key</button><button type="button" class="secondary" data-action="close-dialog">Close</button></div></form></section>`;
  document.body.append(backdrop);
  backdrop.querySelector<HTMLInputElement>("input")!.select();
  const close = () => { backdrop.remove(); opener?.focus(); };
  backdrop.addEventListener("keydown", e => { if (e.key === "Escape") close(); trapDialogFocus(e, backdrop); });
  backdrop.addEventListener("click", async e => {
    const action = (e.target as HTMLElement).dataset.action;
    if (e.target === backdrop || action === "close-dialog") close();
    if (action === "copy-access") { await navigator.clipboard.writeText(workspaceKey()); backdrop.querySelector("#access-message")!.innerHTML = '<div class="notice">Workspace key copied.</div>'; }
  });
  backdrop.querySelector("form")!.addEventListener("submit", e => {
    e.preventDefault();
    const key = new FormData(e.currentTarget as HTMLFormElement).get("workspaceKey")!.toString().trim();
    if (!/^[A-Za-z0-9-]{20,128}$/.test(key)) { backdrop.querySelector("#access-message")!.innerHTML = '<div class="error">This workspace key is not valid. Paste the complete key.</div>'; return; }
    localStorage.setItem(WORKSPACE_KEY, key); close(); liveMessage = "Team workspace opened."; void render();
  });
}

function trapDialogFocus(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== "Tab") return;
  const items = [...container.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]')];
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

async function verifyLicense(token: string, force = false): Promise<boolean> {
  let cached: { valid: boolean; checkedAt: number } | null = null;
  try { cached = JSON.parse(localStorage.getItem(LICENSE_CACHE_KEY) || "null"); } catch { /* no cache */ }
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return cached.valid;
  const response = await fetch(`https://api.sociobot.in/api/v1/products/project-memory-release/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error("License check failed");
  const result = await response.json() as { valid: boolean };
  localStorage.setItem(LICENSE_KEY, token); localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }));
  return result.valid;
}

async function errorMessage(response: Response): Promise<string> {
  try { const body = await response.json() as { error?: string }; return body.error || "The request failed. Try again."; } catch { return "The request failed. Try again."; }
}

function bindGlobalEvents(): void {
  document.querySelectorAll<HTMLAnchorElement>("a[data-nav]").forEach(link => link.addEventListener("click", e => { if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); navigate(link.pathname); } }));
  document.querySelectorAll<HTMLElement>("[data-action]").forEach(el => el.addEventListener("click", async e => {
    const target = e.currentTarget as HTMLElement; const action = target.dataset.action;
    if (action === "add-source") showSourceDialog();
    if (action === "edit-source") showSourceDialog(currentState?.entries.find(item => item.id === target.dataset.id));
    if (action === "delete-source") await deleteSource(target.dataset.id!);
    if (action === "copy-release") await copyRelease(target.dataset.id!);
    if (action === "download-release") downloadRelease(target.dataset.id!);
    if (action === "reset-demo") { sessionStorage.removeItem(DEMO_KEY); selected.clear(); liveMessage = "Demo reset to its original sample."; await render(); }
    if (action === "leave-demo") sessionStorage.removeItem(DEMO_KEY);
    if (action === "open-license") showLicenseDialog();
    if (action === "open-access") showAccessDialog();
  }));
  document.querySelectorAll<HTMLInputElement>("[data-select]").forEach(box => box.addEventListener("change", () => { box.checked ? selected.add(box.dataset.select!) : selected.delete(box.dataset.select!); }));
  document.querySelector<HTMLFormElement>("#release-form")?.addEventListener("submit", createRelease);
  updateNetworkState();
}

async function deleteSource(id: string): Promise<void> {
  const entry = currentState?.entries.find(item => item.id === id); if (!entry || !confirm(`Delete “${entry.title}”? Released packs will keep their compiled copy.`)) return;
  try {
    if (isDemo()) { const state = getDemoState(); state.entries = state.entries.filter(item => item.id !== id); saveDemoState(state); }
    else { const response = await apiFetch(`/api/entries/${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok) throw new Error(await errorMessage(response)); }
    selected.delete(id); liveMessage = "Source deleted. Released packs were not changed."; await render();
  } catch (error) { liveMessage = error instanceof Error ? error.message : "The source could not be deleted. Try again."; await render(); }
}

function compileDemo(version: string, notes: string, entries: Entry[]): Release {
  const content = `---\ncontext-pack: ${version}\nreleased: ${new Date().toISOString().slice(0, 10)}\n---\n\n# Project context\n\n${entries.map(entry => `## ${entry.kind} — ${entry.title}\n${entry.body}\n\nSource: ${entry.sourcePath} @ ${entry.sourceRevision}\nReference: project-memory://releases/${version}#${entry.id}`).join("\n\n")}`;
  return { id: crypto.randomUUID(), version, notes, content, createdAt: new Date().toISOString(), staleCount: 0 };
}

async function createRelease(event: SubmitEvent): Promise<void> {
  event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const values = new FormData(form); const version = values.get("version")!.toString().trim(); const notes = values.get("notes")!.toString().trim();
  if (!selected.size) { liveMessage = "Select at least one approved source before releasing."; await render(); return; }
  if (!isDemo() && currentState?.releases.length && !hasActiveLicense()) { liveMessage = "The free plan includes one release. Restore a team license to release another version."; await render(); showLicenseDialog(); return; }
  try {
    if (isDemo()) {
      const state = getDemoState(); if (state.releases.some(item => item.version === version)) throw new Error("That version already exists. Enter a new version.");
      state.releases.unshift(compileDemo(version, notes, state.entries.filter(item => selected.has(item.id)))); saveDemoState(state);
    } else {
      const response = await apiFetch("/api/releases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ version, notes, entryIds: [...selected] }) }); if (!response.ok) throw new Error(await errorMessage(response));
    }
    selected.clear(); liveMessage = `Context pack ${version} released.`; await render();
  } catch (error) { liveMessage = error instanceof Error ? error.message : "The context pack could not be released. Try again."; await render(); }
}

async function copyRelease(id: string): Promise<void> {
  const release = currentState?.releases.find(item => item.id === id); if (!release) return;
  try { await navigator.clipboard.writeText(release.content); liveMessage = `Context pack ${release.version} copied.`; } catch { liveMessage = "Clipboard access was blocked. Open the Markdown preview and copy it there."; }
  await render();
}

function downloadRelease(id: string): void {
  const release = currentState?.releases.find(item => item.id === id); if (!release) return;
  const url = URL.createObjectURL(new Blob([release.content], { type: "text/markdown" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `project-context-${release.version}.md`; anchor.click(); URL.revokeObjectURL(url);
  liveMessage = `Context pack ${release.version} downloaded.`;
}

function updateNetworkState(): void {
  const status = document.querySelector<HTMLElement>("#network-state"); if (!status) return;
  status.innerHTML = navigator.onLine ? "" : '<div class="error offline">You are offline. Demo changes still work in this tab. Reconnect before using the real workspace.</div>';
}

function updateMetadata(path: string): void {
  const titles: Record<string, string> = { "/": "Project Memory Release — release agent context packs", "/demo": "Demo — Project Memory Release", "/workspace": "Workspace — Project Memory Release", "/privacy": "Privacy — Project Memory Release", "/terms": "Terms — Project Memory Release" };
  document.title = titles[path] || "Page not found — Project Memory Release";
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = `https://project-memory-release.sociobot.in${path}`;
}

async function render(): Promise<void> {
  const path = route(); updateMetadata(path);
  if (path === "/") { currentState = null; app.innerHTML = landing(); bindGlobalEvents(); return; }
  if (path === "/privacy" || path === "/terms") { currentState = null; app.innerHTML = legalPage(path.slice(1) as "privacy" | "terms"); bindGlobalEvents(); return; }
  if (path === "/demo" || path === "/workspace") {
    app.innerHTML = `${header()}<main id="main"><div class="wrap loading" role="status">Opening the release notebook…</div></main>${footer()}`; bindGlobalEvents();
    try { currentState = await fetchState(); app.innerHTML = workspace(currentState); bindGlobalEvents(); }
    catch (error) { app.innerHTML = layout(`<div class="wrap legal"><h1 tabindex="-1">The workspace did not open</h1><div class="error">${escapeHtml(error instanceof Error ? error.message : "Reload the page to try again.")}</div><button class="primary" data-action="retry">Reload workspace</button></div>`); document.querySelector('[data-action="retry"]')?.addEventListener("click", () => void render()); bindGlobalEvents(); }
    return;
  }
  currentState = null; app.innerHTML = notFound(); bindGlobalEvents();
}

window.addEventListener("popstate", () => void render().then(() => document.querySelector<HTMLElement>("h1")?.focus()));
window.addEventListener("online", updateNetworkState); window.addEventListener("offline", updateNetworkState);

const returnedLicense = new URLSearchParams(location.search).get("license");
if (returnedLicense) { localStorage.setItem(LICENSE_KEY, returnedLicense); history.replaceState({}, "", location.pathname); void verifyLicense(returnedLicense, true).catch(() => undefined); }
else { const token = localStorage.getItem(LICENSE_KEY); if (token) void verifyLicense(token).catch(() => undefined); }

if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
void render();
