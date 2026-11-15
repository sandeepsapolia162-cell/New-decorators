# Phase 1 — Initial site audit

**Date:** 2026-11-15  
**Scope:** Read-only inspection and local preview checks. No site code, page content, images, or database rows were changed for this report.

## Results

| Check | Result | Evidence / limitation |
|---|---|---|
| Project pages identified | PASS | Found `index.html`, `about.html`, `portfolio.html`, `decoration.html`, `catering.html`, `services.html`, `liked-designs.html`, `contact.html`, `admin.html`, and `setup.html`. |
| Local Pages + D1 preview | PASS (partial) | Wrangler Pages preview was run against a local D1 database seeded from the existing project data. `GET /api/media` returned 132 rows: ceiling 35, front-gate 44, indoor 50, walkway 3. The returned static record had `source: static` and a `/images/front-gate/frontgate-02.png` path. |
| Browser and responsive screenshots at 360/768/1366 px | NOT VERIFIED | Headless Chrome/Edge were available. A page load showed original Portfolio markup, and Wrangler logged successful requests for the page, its CSS/JS, API, and many image files. A repeatable viewport screenshot/console capture for all pages and all three widths has not been captured. No screenshot is attached as evidence. |
| All internal/external links and resources | NOT VERIFIED | A full crawler was not run. Therefore anchors, PDFs, telephone/email/WhatsApp/social links, and external link status are not certified. |
| Image path case sensitivity | PARTIAL | Wrangler logged successful `200` responses for the Portfolio image requests tested, including `/images/front-gate/frontgate-02.png`. All project image paths have not been exhaustively compared against disk casing yet. |
| HTML validity, accessibility, metadata, SEO | NOT VERIFIED | No HTML validator, automated accessibility scan, contrast measurement, or Lighthouse run was completed. These must be measured before calling the pages compliant. |
| Redirects and response headers | PARTIAL | `_redirects` contains `/admin/setup /setup 301`; `_headers` gives `/images/*` one-year immutable caching and `/admin*` noindex. No redirect loop was observed in the tested Portfolio route, but redirect behavior across every route was not crawled. `_headers` has no explicit cache policy for `/js/*` or `/css/*`. |
| Functions security review | NOT VERIFIED | The Functions code has parameterized D1 calls in inspected public media paths, but a complete route-by-route authorization, CSRF, file-signature, rate-limit, and error-leak audit has not been completed. |
| Git working tree before report | PASS | The working tree was clean before adding this report; no unrelated changes were present. |

## Evidence gathered for the Portfolio API

The public list route is `GET /api/media` in `functions/api/[[path]].js`. It selects visible media rows and joins the category name. Its response is a JSON array; static records supply `source: "static"` and `external_url: "/images/..."`, while uploaded records use `source: "upload"` and are served through `/api/file/:id`.

Local seeded counts differ from the user's stated live database counts because the local seed currently contains 132 rows and three Walkway records. No production database was modified.

## Immediate risks / follow-up

- The user's reported blank public gallery is not yet explained by the data: the local API returns visible rows. Continue Phase 4 by tracing category filters, render behavior, and CSS in a browser with captured DOM/console evidence.
- A full Phase 1 crawl and responsive QA remains outstanding. This report marks those checks `NOT VERIFIED` rather than assuming they pass.
- No photos have been moved or deleted. No migration has been created or applied as part of this audit.

## Follow-up browser-tool attempt (2026-11-15)

| Check | Result | Evidence / limitation |
|---|---|---|
| Browser/validator tools | PASS (installed) | Temporary local install of Playwright, Chromium, `html-validate`, `axe-core`, and Lighthouse succeeded. `package.json` was not changed. |
| Browser screenshot run | FAIL (environment connection) | `scripts/phase1-browser-audit.mjs` attempted all 33 page/viewport combinations. Browser navigation to `http://127.0.0.1:8796` timed out for all pages with “127.0.0.1 took too long to respond”; consequently no project screenshots were kept. The captured errors are in `audit/browser-results.json`. The local static server worked in its terminal, but the headless browser process could not connect to its loopback port in this sandbox. This is not evidence about the site's rendering. |
| HTML validation | FAIL | `html-validate` reports 273 findings across 10 HTML documents. Raw JSON is in `audit/html-validate.json`. This is a validator result, not a standards-validated conclusion; the default rules may flag existing legacy markup and findings need triage before edits. |
| Axe and Lighthouse | NOT VERIFIED | The browser could not reach local pages, so these audits were not run against the site. |
| Full link/resource crawl | NOT VERIFIED | Same browser/loopback constraint; no broken-link list is claimed. |

### What is needed to finish Phase 1

This environment can install the audit tools but cannot connect headless Chromium to the local preview's loopback address. To gather the requested screenshots and browser findings on the user's Windows computer, open PowerShell in the project folder and run:

```powershell
$env:PORT=8796; Start-Process powershell -ArgumentList '-NoExit','-Command','Set-Location "' + (Get-Location).Path + '"; $env:PORT=8796; node server.js'; node scripts/phase1-browser-audit.mjs
```

The existing script needs Playwright and Chrome available (`npm install --no-save --package-lock=false playwright`; `npx playwright install chromium`). The current script uses the static legacy Node server, which does not implement the Pages Functions `/api/media` route. For valid live-gallery evidence it must instead be pointed at a working `wrangler pages dev` instance with a local D1 seeded from the schema and seed SQL. In the current sandbox, `npx wrangler pages dev` could not start because npm could not resolve `registry.npmjs.org` (`ENOTFOUND`), so no new Wrangler browser run was possible in this follow-up.

**Phase 1 remains incomplete.** Do not treat the failed-browser screenshots or HTML findings as proof of visual behavior; no screenshot artifacts were retained from the connection-error pages.
