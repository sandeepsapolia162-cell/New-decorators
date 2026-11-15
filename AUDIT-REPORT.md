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
