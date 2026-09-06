# Demo sandbox

- URL: `https://project-memory-release.sociobot.in/demo` (locally: `http://localhost:8080/demo`).
- Entry point: the first-screen **Try it with sample data** link.
- Sample: three approved sources (one ADR, one glossary term, one product decision) and one released context pack.
- Reset: use **Reset demo** in the persistent banner.
- Exit: use **Start for real**. Exiting removes the demo session.
- Storage: the browser uses `sessionStorage` key `demo:project-memory-release:state`. The server's `POST /api/demo/session` returns a fresh seed and does not persist it.
- Isolation: demo requests do not include or read the real `pmr_workspace_key`. Demo mutations remain in the tab and never call real write endpoints.
- Offline: the service worker caches the application shell and sample entry point after the first visit.
- Review: choose sources, enter a version, then use **Review selected Markdown**. The read-only preview is shown before any release is saved. **Release reviewed pack** saves those exact preview bytes.

The verifier can add and edit sources, import the shipped Markdown fixture, preview and create a release, trigger a stale citation, copy or download Markdown, reset the sample, and repeat from a fresh browser context.
